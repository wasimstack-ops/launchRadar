const axios = require('axios');
const Agent = require('./agent.model');
const logger = require('../../config/logger');

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories';
const PUBLIC_SELECT = '-rawSource -rawData';
const PUBLIC_LIMIT = 20;
const MAX_PUBLIC_LIMIT = 50;
const AGENTS_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const AGENTS_CLEANUP_BATCH_SIZE = 50;

let agentsSyncInterval = null;
let isAgentsSyncRunning = false;

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function dedupeByLink(items) {
  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const key = String(item?.link || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function mapGithubRepoToAgent(repo) {
  const stars = toNumber(repo?.stargazers_count, 0);
  return {
    title: String(repo?.name || '').trim(),
    description: String(repo?.description || '').trim(),
    link: String(repo?.html_url || '').trim(),
    category: 'repo',
    sourceType: 'open_source',
    stars,
    trendingScore: stars * 2,
    rawSource: 'github',
    rawData: repo,
  };
}

async function fetchGitHubAgents() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LaunchRadar-Agents',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(GITHUB_SEARCH_URL, {
    params: {
      q: 'ai+agent',
      sort: 'stars',
      order: 'desc',
      per_page: 50,
    },
    headers,
    timeout: 30000,
  });

  const repos = Array.isArray(response?.data?.items) ? response.data.items : [];
  const mapped = repos
    .map(mapGithubRepoToAgent)
    .filter((item) => item.title && item.link);
  const unique = dedupeByLink(mapped);
  const latestLinks = unique.map((item) => item.link);

  if (unique.length === 0) {
    return {
      fetched: repos.length,
      matched: 0,
      inserted: 0,
      updated: 0,
      removed: 0,
      kept: 0,
    };
  }

  const now = new Date();
  const operations = unique.map((item) => ({
    updateOne: {
      filter: { link: item.link },
      update: {
        $set: {
          title: item.title,
          description: item.description,
          category: item.category,
          sourceType: item.sourceType,
          stars: item.stars,
          trendingScore: item.trendingScore,
          rawSource: item.rawSource,
          rawData: item.rawData,
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const bulkResult = await Agent.bulkWrite(operations, { ordered: false });
  const inserted = toNumber(bulkResult?.upsertedCount, 0);
  const cleanupResult = await cleanupAgentsNotInLatest(latestLinks, AGENTS_CLEANUP_BATCH_SIZE);

  return {
    fetched: repos.length,
    matched: unique.length,
    inserted,
    updated: Math.max(0, unique.length - inserted),
    removed: cleanupResult.removed,
    kept: latestLinks.length,
  };
}

async function cleanupAgentsNotInLatest(latestLinks, limit = AGENTS_CLEANUP_BATCH_SIZE) {
  if (!Array.isArray(latestLinks) || latestLinks.length === 0) {
    return { removed: 0 };
  }

  const staleRows = await Agent.find({ link: { $nin: latestLinks } })
    .select('_id')
    .sort({ createdAt: 1 })
    .limit(Math.max(1, toPositiveInt(limit, AGENTS_CLEANUP_BATCH_SIZE)))
    .lean();

  if (staleRows.length === 0) {
    return { removed: 0 };
  }

  const staleIds = staleRows.map((row) => row._id);
  const deleteResult = await Agent.deleteMany({ _id: { $in: staleIds } });
  return { removed: toNumber(deleteResult?.deletedCount, 0) };
}

async function runAgentsSyncCycle({ trigger = 'manual' } = {}) {
  const result = await fetchGitHubAgents();
  logger.info(
    `[Agents Sync] trigger=${trigger} fetched=${result.fetched} matched=${result.matched} inserted=${result.inserted} updated=${result.updated} removed=${result.removed}`
  );
  return result;
}

async function getLatestAgents() {
  return Agent.find({})
    .select(PUBLIC_SELECT)
    .sort({ createdAt: -1 })
    .limit(PUBLIC_LIMIT)
    .lean();
}

async function getTrendingAgents() {
  return Agent.find({})
    .select(PUBLIC_SELECT)
    .sort({ trendingScore: -1, stars: -1, createdAt: -1 })
    .limit(PUBLIC_LIMIT)
    .lean();
}

async function getRepoAgents({ page = 1, limit = PUBLIC_LIMIT } = {}) {
  const safeLimit = Math.min(MAX_PUBLIC_LIMIT, Math.max(1, toPositiveInt(limit, PUBLIC_LIMIT)));
  const safePage = Math.max(1, toPositiveInt(page, 1));
  const skip = (safePage - 1) * safeLimit;
  const query = { category: 'repo' };

  const [items, total] = await Promise.all([
    Agent.find(query)
      .select(PUBLIC_SELECT)
      .sort({ trendingScore: -1, stars: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Agent.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

async function getAgentsByCategory(category) {
  return Agent.find({ category })
    .select(PUBLIC_SELECT)
    .sort({ createdAt: -1 })
    .limit(PUBLIC_LIMIT)
    .lean();
}

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
  fetchGitHubAgents,
  runAgentsSyncCycle,
  getLatestAgents,
  getTrendingAgents,
  getRepoAgents,
  getAgentsByCategory,
  startAgentsCron,
  stopAgentsCron,
};
