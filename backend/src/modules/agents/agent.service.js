const axios = require('axios');
const Agent = require('./agent.model');
const logger = require('../../config/logger');

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories';
const HF_SPACES_URL = 'https://huggingface.co/api/spaces';
const PUBLIC_SELECT = '-rawData';
const PUBLIC_LIMIT = 20;
const MAX_PUBLIC_LIMIT = 50;
const AGENTS_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const MAX_RECORDS_PER_CATEGORY = 150; // free-tier MongoDB cap

let agentsSyncInterval = null;
let isAgentsSyncRunning = false;

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function dedupeByLink(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.link || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Hugging Face Spaces ────────────────────────────────────────────────────

function prettifySpaceName(name) {
  return String(name || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function mapHFSpaceToAgent(space) {
  const id = String(space?.id || '').trim();
  const parts = id.split('/');
  const owner = parts[0] || '';
  const spaceName = parts[1] || '';

  const title = prettifySpaceName(spaceName) || id;
  const likes = toNumber(space?.likes, 0);
  const hfTrendingScore = toNumber(space?.trendingScore, 0);
  const trendingScore = hfTrendingScore > 0 ? hfTrendingScore : likes;

  // Filter tags — drop registry-style tags like "region:us", "license:apache-2.0"
  const rawTags = Array.isArray(space?.tags) ? space.tags : [];
  const tags = rawTags
    .filter((t) => !String(t).includes(':') && String(t).length < 40)
    .slice(0, 8);

  const sdk = String(space?.sdk || '').trim();
  const description = String(space?.cardData?.short_description || '').trim();

  return {
    title,
    description,
    link: `https://huggingface.co/spaces/${id}`,
    website: `https://huggingface.co/spaces/${id}`,
    category: 'agent',
    sourceType: 'open_source',
    stars: likes,
    forks: 0,
    openIssues: 0,
    language: sdk,
    logoUrl: owner && spaceName
      ? `https://cdn-thumbnails.huggingface.co/social-thumbnails/spaces/${owner}/${spaceName}.png`
      : '',
    tags,
    pushedAt: space?.lastModified ? new Date(space.lastModified) : null,
    trendingScore,
    rawSource: 'huggingface',
    rawData: {
      spaceId: id,
      owner,
      spaceName,
      sdk,
    },
  };
}

async function fetchHFSpaces(filter, limit = 50) {
  const response = await axios.get(HF_SPACES_URL, {
    params: { sort: 'trending', filter, limit, full: true },
    headers: { 'User-Agent': 'LaunchRadar-Agents' },
    timeout: 30000,
  });
  return Array.isArray(response?.data) ? response.data : [];
}

// Fetch AI agent spaces from Hugging Face — trending demos and tools
async function fetchHuggingFaceSpaces() {
  const [aiAgentSpaces, mcpSpaces, llmAgentSpaces] = await Promise.all([
    fetchHFSpaces('ai-agent', 50).catch(() => []),
    fetchHFSpaces('mcp', 30).catch(() => []),
    fetchHFSpaces('llm-agent', 30).catch(() => []),
  ]);

  const raw = [...aiAgentSpaces, ...mcpSpaces, ...llmAgentSpaces];
  const all = dedupeByLink(
    raw
      .filter((s) => !s.private)
      .map(mapHFSpaceToAgent)
      .filter((i) => i.title && i.link)
  );

  const result = await upsertAgents(all);
  logger.info(
    `[Agents Sync] HF spaces fetched=${raw.length} deduped=${all.length} inserted=${result.inserted} updated=${result.updated}`
  );
  return { ...result, fetched: raw.length };
}

// ─── GitHub Repos ───────────────────────────────────────────────────────────

function mapRepoToAgent(repo, category) {
  const stars = toNumber(repo?.stargazers_count, 0);
  const forks = toNumber(repo?.forks_count, 0);
  return {
    title: String(repo?.name || '').trim(),
    description: String(repo?.description || '').trim(),
    link: String(repo?.html_url || '').trim(),
    website: String(repo?.homepage || '').trim(),
    category,
    sourceType: 'open_source',
    stars,
    forks,
    openIssues: toNumber(repo?.open_issues_count, 0),
    language: String(repo?.language || '').trim(),
    logoUrl: String(repo?.owner?.avatar_url || '').trim(),
    tags: Array.isArray(repo?.topics) ? repo.topics.slice(0, 8) : [],
    pushedAt: repo?.pushed_at ? new Date(repo.pushed_at) : null,
    trendingScore: stars * 2 + forks,
    rawSource: 'github',
    rawData: {
      fullName: repo?.full_name,
      ownerLogin: repo?.owner?.login,
      license: repo?.license?.spdx_id || '',
    },
  };
}

function buildGithubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LaunchRadar-Agents',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function searchGitHub(query, perPage = 50) {
  const response = await axios.get(GITHUB_SEARCH_URL, {
    params: { q: query, sort: 'stars', order: 'desc', per_page: perPage },
    headers: buildGithubHeaders(),
    timeout: 30000,
  });
  return Array.isArray(response?.data?.items) ? response.data.items : [];
}

// Fetch AI/ML GitHub repos
async function fetchGitHubRepos() {
  const repos = await searchGitHub('ai agent in:name,description stars:>200', 50);
  const mapped = dedupeByLink(
    repos.map((r) => mapRepoToAgent(r, 'repo')).filter((i) => i.title && i.link)
  );

  const result = await upsertAgents(mapped);
  logger.info(`[Agents Sync] GitHub repos fetched=${repos.length} upserted=${mapped.length}`);
  return { ...result, fetched: repos.length };
}

// ─── Upsert ──────────────────────────────────────────────────────────────────

async function upsertAgents(mapped) {
  const now = new Date();
  const operations = mapped.map((item) => ({
    updateOne: {
      filter: { link: item.link },
      update: {
        $set: {
          title: item.title,
          description: item.description,
          website: item.website,
          category: item.category,
          sourceType: item.sourceType,
          stars: item.stars,
          forks: item.forks,
          openIssues: item.openIssues,
          language: item.language,
          logoUrl: item.logoUrl,
          tags: item.tags,
          pushedAt: item.pushedAt,
          trendingScore: item.trendingScore,
          rawSource: item.rawSource,
          rawData: item.rawData,
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await Agent.bulkWrite(operations, { ordered: false });
  return {
    matched: mapped.length,
    inserted: toNumber(result?.upsertedCount, 0),
    updated: Math.max(0, mapped.length - toNumber(result?.upsertedCount, 0)),
  };
}

// ─── Trim ─────────────────────────────────────────────────────────────────────
// Keep only the top MAX_RECORDS_PER_CATEGORY per category by trendingScore.
// Deletes the overflow so MongoDB free-tier storage stays bounded.
async function trimCategory(category) {
  const topIds = await Agent.find({ category })
    .sort({ trendingScore: -1, stars: -1 })
    .limit(MAX_RECORDS_PER_CATEGORY)
    .select('_id')
    .lean();

  if (topIds.length < MAX_RECORDS_PER_CATEGORY) return 0; // nothing to trim

  const keepIds = topIds.map((d) => d._id);
  const { deletedCount } = await Agent.deleteMany({
    category,
    _id: { $nin: keepIds },
  });

  if (deletedCount > 0) {
    logger.info(`[Agents Sync] trimmed ${deletedCount} old ${category} records (cap=${MAX_RECORDS_PER_CATEGORY})`);
  }
  return deletedCount;
}

// ─── Sync cycle ───────────────────────────────────────────────────────────────

async function runAgentsSyncCycle({ trigger = 'manual' } = {}) {
  const [agentsResult, reposResult] = await Promise.allSettled([
    fetchHuggingFaceSpaces(),
    fetchGitHubRepos(),
  ]);

  const agents = agentsResult.status === 'fulfilled'
    ? agentsResult.value
    : { fetched: 0, inserted: 0, updated: 0 };
  const repos = reposResult.status === 'fulfilled'
    ? reposResult.value
    : { fetched: 0, inserted: 0, updated: 0 };

  if (agentsResult.status === 'rejected') logger.error('[Agents Sync] HF spaces failed', agentsResult.reason);
  if (reposResult.status === 'rejected') logger.error('[Agents Sync] GitHub repos failed', reposResult.reason);

  // Trim both categories to stay within free-tier storage limits
  await Promise.allSettled([trimCategory('agent'), trimCategory('repo')]);

  logger.info(`[Agents Sync] trigger=${trigger} complete`, { agents, repos });
  return { agents, repos };
}

// ─── Public queries ───────────────────────────────────────────────────────────

async function getAgentsPaginated({ category, sort = 'trending', page = 1, limit = PUBLIC_LIMIT } = {}) {
  const safeLimit = Math.min(MAX_PUBLIC_LIMIT, Math.max(1, toPositiveInt(limit, PUBLIC_LIMIT)));
  const safePage = Math.max(1, toPositiveInt(page, 1));
  const skip = (safePage - 1) * safeLimit;
  const query = category ? { category } : {};
  const sortField = sort === 'latest' ? { createdAt: -1 } : { trendingScore: -1, stars: -1 };
  const calcTotalPages = (total) => Math.max(1, Math.ceil(total / safeLimit));

  const [items, total] = await Promise.all([
    Agent.find(query).select(PUBLIC_SELECT).sort(sortField).skip(skip).limit(safeLimit).lean(),
    Agent.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: calcTotalPages(total),
      hasNextPage: safePage < calcTotalPages(total),
      hasPrevPage: safePage > 1,
    },
  };
}

async function getLatestAgents() {
  return Agent.find({}).select(PUBLIC_SELECT).sort({ createdAt: -1 }).limit(PUBLIC_LIMIT).lean();
}

async function getTrendingAgents() {
  return Agent.find({}).select(PUBLIC_SELECT).sort({ trendingScore: -1, stars: -1 }).limit(PUBLIC_LIMIT).lean();
}

async function getRepoAgents({ page = 1, limit = PUBLIC_LIMIT } = {}) {
  return getAgentsPaginated({ category: 'repo', sort: 'trending', page, limit });
}

async function getAgentsByCategory(category) {
  return Agent.find({ category })
    .select(PUBLIC_SELECT)
    .sort({ trendingScore: -1, stars: -1 })
    .limit(PUBLIC_LIMIT)
    .lean();
}

// ─── Cron ─────────────────────────────────────────────────────────────────────

function startAgentsCron() {
  if (agentsSyncInterval) return;

  const run = async () => {
    if (isAgentsSyncRunning) return;
    isAgentsSyncRunning = true;
    try {
      await runAgentsSyncCycle({ trigger: 'cron' });
    } catch (error) {
      logger.error('[Agents Sync] cron failed', error);
    } finally {
      isAgentsSyncRunning = false;
    }
  };

  run().catch((error) => logger.error('[Agents Sync] startup run failed', error));
  agentsSyncInterval = setInterval(run, AGENTS_SYNC_INTERVAL_MS);
  logger.info('[Agents Sync] cron started (every 6 hours)');
}

function stopAgentsCron() {
  if (!agentsSyncInterval) return;
  clearInterval(agentsSyncInterval);
  agentsSyncInterval = null;
  isAgentsSyncRunning = false;
  logger.info('[Agents Sync] cron stopped');
}

module.exports = {
  runAgentsSyncCycle,
  getAgentsPaginated,
  getLatestAgents,
  getTrendingAgents,
  getRepoAgents,
  getAgentsByCategory,
  startAgentsCron,
  stopAgentsCron,
};
