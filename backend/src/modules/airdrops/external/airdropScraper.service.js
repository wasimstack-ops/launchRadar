const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const logger = require('../../../config/logger');
const AirdropExternalSource = require('./airdropExternal.model');
const FetchLog = require('../../fetch-logs/fetch-log.model');
const { generateAiSummary } = require('../../news/ai-summary.service');

const AIRDROPS_URL = 'https://airdrops.io/';
const AIRDROPS_FETCH_URLS = ['https://airdrops.io/', 'https://www.airdrops.io/'];
const AIRDROPS_SOURCE = 'airdrops.io';
const SCRAPE_JOB_NAME = 'airdrops_external_ingestion';
const MIN_SCRAPE_INTERVAL_MS = 6 * 60 * 60 * 1000;

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function resolveUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  try {
    return new URL(raw, AIRDROPS_URL).toString();
  } catch (error) {
    return '';
  }
}

function parseSrcset(value) {
  const raw = normalizeText(value);
  if (!raw) return [];

  return raw
    .split(',')
    .map((chunk) => normalizeText(chunk).split(' ')[0])
    .filter(Boolean);
}

function isInlinePlaceholder(value) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized.startsWith('data:image');
}

function extractLogoUrl($, root) {
  const image = root.find('img').first();
  if (!image || image.length === 0) return '';

  const directCandidates = [
    image.attr('data-src'),
    image.attr('data-lazy-src'),
    image.attr('data-original'),
    image.attr('src'),
  ];

  const srcsetCandidates = [
    ...parseSrcset(image.attr('data-srcset')),
    ...parseSrcset(image.attr('data-lazy-srcset')),
    ...parseSrcset(image.attr('srcset')),
  ];

  const allCandidates = [...srcsetCandidates, ...directCandidates].filter(Boolean);

  for (const candidate of allCandidates) {
    if (isInlinePlaceholder(candidate)) continue;
    const resolved = resolveUrl(candidate);
    if (resolved) return resolved;
  }

  return '';
}

function pickStatus(texts) {
  const valid = ['confirmed', 'hot', 'updated'];
  for (const text of texts) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) continue;
    if (valid.includes(normalized)) return normalized;
    if (normalized.includes('confirmed')) return 'confirmed';
    if (normalized.includes('updated')) return 'updated';
    if (normalized.includes('hot')) return 'hot';
  }
  return '';
}

function collectStatusSignals($, root) {
  const signals = [];

  root.find('.label, .badge, .status, .tag, .ribbon, .chip').each((_, el) => {
    const node = $(el);
    signals.push(node.text());
    signals.push(node.attr('class'));
    signals.push(node.attr('data-status'));
    signals.push(node.attr('title'));
  });

  // Fallback to card-level hints when status badges are not explicit.
  signals.push(root.attr('class'));
  signals.push(root.attr('data-status'));
  signals.push(root.text());

  return signals.filter(Boolean);
}

function extractCard($, element, selectorUsed) {
  const root = $(element);
  const title =
    normalizeText(
      root.find('h1, h2, h3, h4, .card-title, .entry-title, .title').first().text() ||
        root.find('[title]').first().attr('title')
    ) || '';

  const description = normalizeText(
    root.find('p, .description, .excerpt, .summary, .card-text').first().text() || ''
  );

  const href =
    root.find('a[href*="/airdrop/"]').first().attr('href') || root.find('a').first().attr('href') || '';
  const sourceUrl = resolveUrl(href);

  const logo = extractLogoUrl($, root);

  const statusSignals = collectStatusSignals($, root);
  const status = pickStatus(statusSignals);

  if (!title || !sourceUrl) return null;

  return {
    title,
    description,
    sourceUrl,
    logo,
    status,
    source: AIRDROPS_SOURCE,
    importedAt: new Date(),
    rawData: {
      selectorUsed,
      statusSignals: statusSignals.slice(0, 10),
    },
  };
}

function parseAirdropsHtml(html) {
  try {
    const $ = cheerio.load(html);
    const selectors = [
      '.latest-airdrops .card',
      '.latest-airdrops [class*="card"]',
      '.latest-airdrops article',
      '.card',
      'article',
    ];

    const selectorAttempts = [];
    const extracted = [];
    const seenUrls = new Set();
    let selectorUsed = '';

    for (const selector of selectors) {
      const nodes = $(selector);
      selectorAttempts.push({ selector, found: nodes.length });

      if (nodes.length === 0) continue;

      const batch = [];
      nodes.each((_, element) => {
        const item = extractCard($, element, selector);
        if (!item || seenUrls.has(item.sourceUrl)) return;
        seenUrls.add(item.sourceUrl);
        batch.push(item);
      });

      if (batch.length > 0) {
        selectorUsed = selector;
        extracted.push(...batch);
        break;
      }
    }

    if (extracted.length === 0) {
      logger.error('[Airdrops External] card selectors returned 0 parsed items', { selectorAttempts });

      // Fallback: derive from direct airdrop links if DOM changes.
      const links = $('a[href*="/airdrop/"]');
      links.each((_, element) => {
        const href = $(element).attr('href');
        const sourceUrl = resolveUrl(href);
        if (!sourceUrl || seenUrls.has(sourceUrl)) return;

        const title = normalizeText($(element).text() || $(element).attr('title'));
        if (!title) return;

        seenUrls.add(sourceUrl);
        extracted.push({
          title,
          description: '',
          sourceUrl,
          logo: '',
          status: '',
          source: AIRDROPS_SOURCE,
          importedAt: new Date(),
          rawData: {
            selectorUsed: 'a[href*="/airdrop/"] fallback',
          },
        });
      });
    }

    return {
      listings: extracted,
      selectorUsed: selectorUsed || 'fallback',
      selectorAttempts,
    };
  } catch (error) {
    logger.error('[Airdrops External] parse failed', error);
    throw error;
  }
}

async function getLatestFetchLog() {
  return FetchLog.findOne({ jobName: SCRAPE_JOB_NAME, source: AIRDROPS_SOURCE }).sort({ startedAt: -1 }).lean();
}

async function logFetch(payload) {
  try {
    await FetchLog.create(payload);
  } catch (error) {
    logger.error('[Airdrops External] failed to persist fetch log', error);
  }
}

function createNetworkFailureError(attemptErrors) {
  const normalized = attemptErrors.map((item) => ({
    url: item.url,
    code: String(item?.error?.code || item?.error?.cause?.code || 'UNKNOWN'),
    message: String(item?.error?.message || 'Request failed'),
  }));

  const codes = Array.from(new Set(normalized.map((item) => item.code))).join(', ');
  const message = `Airdrops source unreachable (codes: ${codes || 'UNKNOWN'}). Check DNS/network/firewall and retry.`;
  const error = new Error(message);
  error.statusCode = 503;
  error.meta = { attempts: normalized };
  return error;
}

async function fetchAirdropsHtml() {
  const attemptErrors = [];
  const sharedConfig = {
    timeout: 30000,
    family: 4,
    httpsAgent: new https.Agent({ keepAlive: true, family: 4 }),
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  };

  for (const url of AIRDROPS_FETCH_URLS) {
    try {
      const response = await axios.get(url, sharedConfig);
      return String(response?.data || '');
    } catch (error) {
      attemptErrors.push({ url, error });
      logger.error(`[Airdrops External] request failed for ${url}`, {
        code: error?.code || error?.cause?.code || 'UNKNOWN',
        message: error?.message || 'Request failed',
      });
    }
  }

  throw createNetworkFailureError(attemptErrors);
}

async function fetchAirdropsExternal(options = {}) {
  const force = Boolean(options?.force);
  const startedAt = new Date();
  const latestFetch = await getLatestFetchLog();
  const existingCount = await AirdropExternalSource.estimatedDocumentCount();
  const isFirstSeed = existingCount === 0;

  if (!force && !isFirstSeed && latestFetch?.startedAt) {
    const elapsedMs = Date.now() - new Date(latestFetch.startedAt).getTime();
    if (elapsedMs < MIN_SCRAPE_INTERVAL_MS) {
      const remainingMs = MIN_SCRAPE_INTERVAL_MS - elapsedMs;
      const nextAllowedAt = new Date(Date.now() + remainingMs);

      await logFetch({
        jobName: SCRAPE_JOB_NAME,
        source: AIRDROPS_SOURCE,
        status: 'partial',
        startedAt,
        finishedAt: new Date(),
        durationMs: 0,
        fetched: 0,
        matched: 0,
        inserted: 0,
        skipped: 1,
        meta: {
          reason: 'cooldown',
          nextAllowedAt: nextAllowedAt.toISOString(),
          existingCount,
        },
      });

      return {
        skipped: true,
        reason: 'Cooldown active. Airdrops scraper runs max once per 6 hours.',
        nextAllowedAt: nextAllowedAt.toISOString(),
        fetched: 0,
        inserted: 0,
      };
    }
  }

  try {
    const html = await fetchAirdropsHtml();
    const { listings, selectorUsed, selectorAttempts } = parseAirdropsHtml(html);

    if (listings.length === 0) {
      await logFetch({
        jobName: SCRAPE_JOB_NAME,
        source: AIRDROPS_SOURCE,
        status: 'partial',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        fetched: 0,
        matched: 0,
        inserted: 0,
        skipped: 1,
        meta: {
          selectorUsed,
          selectorAttempts,
          warning: 'No listings parsed. Check selector strategy.',
        },
      });

      return {
        fetched: 0,
        inserted: 0,
        selectorUsed,
        selectorAttempts,
        warning: 'No listings parsed. Selectors may have changed.',
      };
    }

    // Generate AI summaries only for items not yet in the DB (new inserts).
    const existingUrls = new Set(
      (await AirdropExternalSource.find({ sourceUrl: { $in: listings.map((l) => l.sourceUrl) } })
        .select('sourceUrl')
        .lean()).map((doc) => doc.sourceUrl)
    );

    for (const item of listings) {
      if (!existingUrls.has(item.sourceUrl)) {
        const inputText = item.description || item.title;
        item.aiSummary = inputText
          ? await generateAiSummary({ title: item.title, summary: inputText, source: item.source })
          : '';
      }
    }

    const operations = listings.map((item) => {
      const { aiSummary, ...rest } = item;
      const op = {
        updateOne: {
          filter: { sourceUrl: item.sourceUrl },
          update: { $set: rest },
          upsert: true,
        },
      };
      // Only set aiSummary on first insert — preserves any manual edits on subsequent scrapes.
      if (aiSummary !== undefined) {
        op.updateOne.update.$setOnInsert = { aiSummary: aiSummary || '' };
      }
      return op;
    });

    const bulkResult = await AirdropExternalSource.bulkWrite(operations, { ordered: false });
    const inserted = Number(bulkResult?.upsertedCount || 0);
    const statusSummary = listings.reduce(
      (acc, item) => {
        const key = item.status || 'unlabeled';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    await logFetch({
      jobName: SCRAPE_JOB_NAME,
      source: AIRDROPS_SOURCE,
      status: 'success',
      startedAt,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      fetched: listings.length,
      matched: listings.length,
      inserted,
      skipped: 0,
      meta: {
        selectorUsed,
        force,
        isFirstSeed,
      },
    });

    return {
      fetched: listings.length,
      inserted,
      updated: Math.max(0, listings.length - inserted),
      selectorUsed,
      statusSummary,
      force,
      isFirstSeed,
    };
  } catch (error) {
    await logFetch({
      jobName: SCRAPE_JOB_NAME,
      source: AIRDROPS_SOURCE,
      status: 'error',
      startedAt,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      fetched: 0,
      matched: 0,
      inserted: 0,
      skipped: 0,
      errorMessage: String(error?.message || 'Airdrops scrape failed'),
      meta: error?.meta || {},
    });

    logger.error('[Airdrops External] scrape failed', error);
    throw error;
  }
}

async function getPublicAirdrops() {
  const rows = await AirdropExternalSource.find({})
    .sort({ importedAt: -1, createdAt: -1 })
    .limit(300)
    .lean();

  return rows.map((item) => {
    const rawStatus = String(item?.status || '').trim().toLowerCase();
    const status = rawStatus === 'hot' || rawStatus === 'confirmed' ? rawStatus : null;

    return {
      _id: item._id,
      title: item.title || '',
      description: item.description || '',
      aiSummary: item.aiSummary || '',
      logo: item.logo || '',
      actionText: 'Open Airdrop',
      actionUrl: item.sourceUrl || '',
      sourceUrl: item.sourceUrl || '',
      status,
      createdAt: item.createdAt,
    };
  });
}

module.exports = {
  fetchAirdropsExternal,
  getPublicAirdrops,
};
