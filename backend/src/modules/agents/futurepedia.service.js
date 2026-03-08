const axios = require('axios');
const cheerio = require('cheerio');
const FuturepediaAgent = require('./futurepediaAgent.model');
const logger = require('../../config/logger');

const FUTUREPEDIA_BASE = 'https://www.futurepedia.io';
const AGENTS_URL = `${FUTUREPEDIA_BASE}/ai-tools/ai-agents`;
const PAGES_TO_FETCH = 5;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const MAX_RECORDS = 200;

let syncInterval = null;
let isSyncRunning = false;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function prettifySlug(slug) {
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function dedupeByLink(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.link || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

function decodeEscapedUrl(value) {
  return String(value || '')
    .replace(/\\\//g, '/')
    .trim();
}

async function fetchPage(page) {
  const url = page === 1 ? AGENTS_URL : `${AGENTS_URL}?page=${page}`;
  const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 30000 });
  return data;
}

// ── HTTP helper (shared headers) ─────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Step 1: extract tool slugs + listing-page logo from a category page ──────
// The listing page has <img> tags inside <a href="/tool/..."> cards — this is
// where logos were working correctly before. Capture them here.
function extractToolCardsFromPage(html) {
  const $ = cheerio.load(html);
  const cards = new Map(); // slug → { slug, logoUrl }

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.includes('/tool/')) return;
    const slug = href.split('/tool/').pop()?.split(/[/?#]/)[0]?.trim();
    if (!slug || !/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(slug)) return;
    if (cards.has(slug)) return;

    const logoUrl = $(el).find('img').first().attr('src') || '';
    cards.set(slug, { slug, logoUrl });
  });

  return [...cards.values()];
}

// ── Step 2: fetch individual tool page for title + description only ───────────
// Next.js generateMetadata() server-renders <meta> tags — reliable for text
// even when main card content is inside RSC JavaScript push chunks.
async function fetchToolMeta(slug, fallbackLogo = '') {
  try {
    const { data: html } = await axios.get(`${FUTUREPEDIA_BASE}/tool/${slug}`, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const metaTitle = $('title').text() || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';

    // Strip " - Futurepedia" / " | Futurepedia" suffix
    const rawTitle = (ogTitle || metaTitle).replace(/\s*[\|–\-—]\s*(Futurepedia|AI Tools?.*)$/i, '').trim();
    const title = rawTitle || prettifySlug(slug);
    const description = (ogDesc || metaDesc).trim();

    // Keep the listing-page logo (fallback); only use og:image if no listing logo
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const logoUrl = fallbackLogo || ogImage.trim();

    return { slug, title, description, logoUrl };
  } catch {
    return { slug, title: prettifySlug(slug), description: '', logoUrl: fallbackLogo };
  }
}

// Run up to `concurrency` tool-page fetches at once, with a small inter-batch delay
async function fetchAllToolMetas(cards, concurrency = 6) {
  const results = [];
  for (let i = 0; i < cards.length; i += concurrency) {
    const batch = cards.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((c) => fetchToolMeta(c.slug, c.logoUrl))
    );
    for (let j = 0; j < batch.length; j++) {
      const r = settled[j];
      results.push(
        r.status === 'fulfilled'
          ? r.value
          : { slug: batch[j].slug, title: prettifySlug(batch[j].slug), description: '', logoUrl: batch[j].logoUrl }
      );
    }
    if (i + concurrency < cards.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return results;
}

// ── DEAD CODE (kept for reference, replaced by two-step approach) ─────────────
function extractFromRSC(html) {
  const tools = [];
  const seen = new Set();

  // Extract raw content of all self.__next_f.push([1, "..."]) calls
  // The string inside may be very long and span lines
  const pushRe = /self\.__next_f\.push\(\[1,"([\s\S]+?)"\]\)/g;
  let chunk;
  const sources = [html]; // also search raw html in case data isn't in push calls

  let pm;
  while ((pm = pushRe.exec(html)) !== null) {
    sources.push(unescapeRSC(pm[1]));
  }

  const SKIP = new Set(['ai-agents', 'ai-tools', 'ai-agent', 'current', 'ai', 'tool']);

  for (const src of sources) {
    // Strategy 1: find /tool/<slug> hrefs — these are always present if tools render
    const hrefRe = /[\\\/]tool[\\\/]([a-z0-9][a-z0-9-]{1,60}[a-z0-9])['"\\\/\s]/g;
    let hm;
    while ((hm = hrefRe.exec(src)) !== null) {
      const slug = hm[1];
      if (seen.has(slug) || SKIP.has(slug)) continue;

      const ctxStart = Math.max(0, hm.index - 800);
      const ctxEnd = Math.min(src.length, hm.index + 800);
      const ctx = src.slice(ctxStart, ctxEnd);

      // Need a "name" field somewhere nearby
      const nameMatch = ctx.match(/"name"\s*:\s*"([^"]{2,80})"/);
      if (!nameMatch) continue;

      seen.add(slug);

      const descMatch = ctx.match(/"(?:shortDescription|description)"\s*:\s*"([^"]{5,400})"/);
      const imgMatch = ctx.match(/"s3MainImageUrl"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/);
      const favMatch = ctx.match(/"favCount"\s*:\s*(\d+)/);
      const pricingMatch = ctx.match(/"pricing"\s*:\s*\["([^"]+)"/);
      const websiteMatch = ctx.match(/"(?:affiliateLink|externalLink|website)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/);

      // Clean up potentially escaped URLs
      const cleanUrl = (u) => u ? u.replace(/\\\//g, '/') : '';

      tools.push({
        title: nameMatch[1],
        description: descMatch ? descMatch[1].replace(/\\n/g, ' ').trim() : '',
        link: `${FUTUREPEDIA_BASE}/tool/${slug}`,
        website: cleanUrl(websiteMatch ? websiteMatch[1] : ''),
        logoUrl: cleanUrl(imgMatch ? imgMatch[1] : ''),
        trendingScore: toNumber(favMatch ? favMatch[1] : 0),
        pricing: pricingMatch ? pricingMatch[1] : '',
        tags: [],
      });
    }

    // Strategy 2: look for slug:"value" patterns (Sanity flattens slug to string)
    const slugRe = /"slug"\s*:\s*"([a-z0-9][a-z0-9-]{1,60}[a-z0-9])"/g;
    let sm;
    while ((sm = slugRe.exec(src)) !== null) {
      const slug = sm[1];
      if (seen.has(slug) || SKIP.has(slug)) continue;

      const ctxStart = Math.max(0, sm.index - 600);
      const ctxEnd = Math.min(src.length, sm.index + 800);
      const ctx = src.slice(ctxStart, ctxEnd);

      const nameMatch = ctx.match(/"name"\s*:\s*"([^"]{2,80})"/);
      if (!nameMatch) continue;
      const hasToolFields = /s3MainImageUrl|description|favCount/.test(ctx);
      if (!hasToolFields) continue;

      seen.add(slug);

      const descMatch = ctx.match(/"(?:shortDescription|description)"\s*:\s*"([^"]{5,400})"/);
      const imgMatch = ctx.match(/"s3MainImageUrl"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/);
      const favMatch = ctx.match(/"favCount"\s*:\s*(\d+)/);
      const pricingMatch = ctx.match(/"pricing"\s*:\s*\["([^"]+)"/);
      const cleanUrl = (u) => u ? u.replace(/\\\//g, '/') : '';

      tools.push({
        title: nameMatch[1],
        description: descMatch ? descMatch[1].replace(/\\n/g, ' ').trim() : '',
        link: `${FUTUREPEDIA_BASE}/tool/${slug}`,
        website: '',
        logoUrl: cleanUrl(imgMatch ? imgMatch[1] : ''),
        trendingScore: toNumber(favMatch ? favMatch[1] : 0),
        pricing: pricingMatch ? pricingMatch[1] : '',
        tags: [],
      });
    }
  }

  return tools;
}

// ── Fallback parser: cheerio HTML ────────────────────────────────────────────
function extractWithCheerio(html) {
  const $ = cheerio.load(html);
  const tools = [];
  const seen = new Set();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.includes('/tool/')) return;
    const slug = href.split('/tool/').pop()?.split(/[/?#]/)[0]?.trim();
    if (!slug || !/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(slug)) return;
    if (seen.has(slug)) return;
    seen.add(slug);

    const $el = $(el);
    const name =
      $el.find('h2, h3, h4').first().text().trim() ||
      $el.attr('title') ||
      $el.attr('aria-label') ||
      prettifySlug(slug);

    const desc = $el.find('p').first().text().trim().slice(0, 300);
    const logo = $el.find('img').first().attr('src') || '';

    if (!name) return;

    tools.push({
      title: name,
      description: desc,
      link: `${FUTUREPEDIA_BASE}/tool/${slug}`,
      website: '',
      logoUrl: logo,
      trendingScore: 0,
      pricing: '',
      tags: [],
    });
  });

  return tools;
}

// ── Upsert ────────────────────────────────────────────────────────────────────
async function upsertAgents(tools) {
  const now = new Date();
  const ops = tools.map((t) => ({
    updateOne: {
      filter: { link: t.link },
      update: {
        $set: {
          title: t.title,
          description: t.description,
          website: t.website,
          logoUrl: t.logoUrl,
          trendingScore: t.trendingScore,
          pricing: t.pricing,
          tags: t.tags,
          category: 'agent',
          sourceType: 'curated',
          stars: t.trendingScore, // use favCount as proxy for votes
          forks: 0,
          language: '',
          rawSource: 'futurepedia',
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await FuturepediaAgent.bulkWrite(ops, { ordered: false });
  return {
    inserted: toNumber(result?.upsertedCount, 0),
    updated: Math.max(0, tools.length - toNumber(result?.upsertedCount, 0)),
  };
}

// ── Trim ──────────────────────────────────────────────────────────────────────
async function trimRecords() {
  const top = await FuturepediaAgent.find({})
    .sort({ trendingScore: -1, createdAt: -1 })
    .limit(MAX_RECORDS)
    .select('_id')
    .lean();

  if (top.length < MAX_RECORDS) return 0;

  const keepIds = top.map((d) => d._id);
  const { deletedCount } = await FuturepediaAgent.deleteMany({ _id: { $nin: keepIds } });
  if (deletedCount > 0) {
    logger.info(`[Futurepedia Sync] trimmed ${deletedCount} old records`);
  }
  return deletedCount;
}

// ── Main sync ────────────────────────────────────────────────────────────────
async function fetchFuturepediaAgents() {
  // Step 1 — collect unique tool slugs from AI agents category pages
  const pageResults = await Promise.allSettled(
    Array.from({ length: PAGES_TO_FETCH }, (_, i) => fetchPage(i + 1))
  );

  const cardMap = new Map(); // slug → { slug, logoUrl }
  for (let i = 0; i < pageResults.length; i++) {
    const res = pageResults[i];
    if (res.status !== 'fulfilled') {
      logger.error(`[Futurepedia Sync] page ${i + 1} fetch failed`, res.reason?.message);
      continue;
    }
    const pageCards = extractToolCardsFromPage(res.value);
    pageCards.forEach((c) => { if (!cardMap.has(c.slug)) cardMap.set(c.slug, c); });
    logger.info(`[Futurepedia Sync] page ${i + 1}: ${pageCards.length} cards (total unique: ${cardMap.size})`);
  }

  if (cardMap.size === 0) {
    logger.info('[Futurepedia Sync] No tool cards found — page structure may have changed');
    return { fetched: 0, inserted: 0, updated: 0 };
  }

  // Step 2 — fetch each tool page for real title + description (logo already from listing)
  const cards = [...cardMap.values()];
  logger.info(`[Futurepedia Sync] Fetching metadata for ${cards.length} tool pages...`);
  const metas = await fetchAllToolMetas(cards);

  const tools = metas
    .filter((m) => m.title && m.slug)
    .map((m) => ({
      title: m.title,
      description: m.description,
      link: `${FUTUREPEDIA_BASE}/tool/${m.slug}`,
      website: '',
      logoUrl: m.logoUrl,
      trendingScore: 0,
      pricing: '',
      tags: [],
    }));

  const deduped = dedupeByLink(tools).filter((t) => t.title && t.link);

  if (deduped.length === 0) {
    logger.info('[Futurepedia Sync] No tools with valid metadata');
    return { fetched: 0, inserted: 0, updated: 0 };
  }

  const result = await upsertAgents(deduped);
  await trimRecords();

  logger.info(
    `[Futurepedia Sync] fetched=${deduped.length} inserted=${result.inserted} updated=${result.updated}`
  );
  return { fetched: deduped.length, ...result };
}

// ── Public queries ─────────────────────────────────────────────────────────────
async function getFuturepediaAgentsPaginated({ sort = 'trending', page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(150, Math.max(1, Number.parseInt(limit, 10) || 20));
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const skip = (safePage - 1) * safeLimit;
  const sortField = sort === 'latest' ? { createdAt: -1 } : { trendingScore: -1 };

  const total = await FuturepediaAgent.countDocuments({});
  logger.info(`[AI Agents] futurepedia_agents total=${total}`);

  const [items, finalTotal] = await Promise.all([
    FuturepediaAgent.find({}).sort(sortField).skip(skip).limit(safeLimit).lean(),
    Promise.resolve(total),
  ]);

  logger.info(`[AI Agents] returning items=${items.length}`);

  const totalPages = Math.max(1, Math.ceil(finalTotal / safeLimit));
  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: finalTotal,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

// ── Cron ──────────────────────────────────────────────────────────────────────
function startFuturepediaCron() {
  if (syncInterval) return;

  const run = async () => {
    if (isSyncRunning) return;
    isSyncRunning = true;
    try {
      await fetchFuturepediaAgents();
    } catch (err) {
      logger.error('[Futurepedia Sync] cron failed', err);
    } finally {
      isSyncRunning = false;
    }
  };

  run().catch((err) => logger.error('[Futurepedia Sync] startup run failed', err));
  syncInterval = setInterval(run, SYNC_INTERVAL_MS);
  logger.info('[Futurepedia Sync] cron started (daily)');
}

function stopFuturepediaCron() {
  if (!syncInterval) return;
  clearInterval(syncInterval);
  syncInterval = null;
  isSyncRunning = false;
  logger.info('[Futurepedia Sync] cron stopped');
}

module.exports = {
  fetchFuturepediaAgents,
  getFuturepediaAgentsPaginated,
  startFuturepediaCron,
  stopFuturepediaCron,
};
