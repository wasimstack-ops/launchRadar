const Parser = require('rss-parser');
const News = require('./news.model');
const { createFetchLog } = require('../fetch-logs/fetch-log.service');
const { generateAiSummary } = require('./ai-summary.service');
const logger = require('../../config/logger');

const NEWS_SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;
const NEWS_RETENTION_DAYS = 14;
const NEWS_MAX_RECORDS = 500;
const FEED_FETCH_RETRY_ATTEMPTS = 3;
const FEED_FETCH_RETRY_BACKOFF_MS = 700;

const RSS_FEEDS = [
  { source: 'hackernews', url: 'https://news.ycombinator.com/rss' },
  { source: 'techcrunch-ai', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/' },
  { source: 'venturebeat-ai', url: 'https://venturebeat.com/category/ai/feed/' },
  { source: 'openai-blog', url: 'https://openai.com/blog/rss.xml' },
  { source: 'huggingface', url: 'https://huggingface.co/blog/feed.xml' },
  { source: 'arxiv-ai', url: 'https://arxiv.org/rss/cs.AI' },
  { source: 'kdnuggets', url: 'https://feeds.feedburner.com/kdnuggets' },
];

const AI_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'machine learning',
  'deep learning',
  'gpt',
  'chatgpt',
  'llm',
  'generative ai',
  'gen ai',
  'openai',
  'anthropic',
  'claude',
  'gemini',
  'deepmind',
  'computer vision',
  'nlp',
  'natural language processing',
  'robotics',
];

const EXCLUDED_KEYWORDS = [
  'war',
  'battlefield',
  'missile',
  'airstrike',
  'military',
  'conflict',
  'ceasefire',
  'invasion',
  'terror',
  'election',
  'geopolitics',
];

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'LaunchRadar-NewsBot/1.0',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
});

let newsSyncInterval = null;
let newsSyncRunning = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLink(linkValue) {
  const value = String(linkValue || '').trim();
  if (!value) return '';

  try {
    const url = new URL(value);
    const blockedParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    blockedParams.forEach((param) => url.searchParams.delete(param));

    url.hash = '';
    const normalized = url.toString().replace(/\/$/, '');
    return normalized;
  } catch (error) {
    return value.replace(/\/$/, '');
  }
}

async function parseFeedWithRetry(feed) {
  let lastError = null;
  for (let attempt = 1; attempt <= FEED_FETCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const rss = await parser.parseURL(feed.url);
      return { rss, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < FEED_FETCH_RETRY_ATTEMPTS) {
        await sleep(FEED_FETCH_RETRY_BACKOFF_MS * attempt);
      }
    }
  }

  throw lastError;
}

function isAiRelated(item) {
  const title = String(item?.title || '');
  const snippet = String(item?.contentSnippet || item?.summary || item?.content || '');
  const categories = Array.isArray(item?.categories) ? item.categories.join(' ') : '';
  const text = `${title} ${snippet} ${categories}`.toLowerCase();

  const hasExcludedKeyword = EXCLUDED_KEYWORDS.some((keyword) => text.includes(keyword));
  if (hasExcludedKeyword) return false;

  return AI_KEYWORDS.some((keyword) => text.includes(keyword));
}

function normalizeNewsItem(item, source) {
  const title = String(item?.title || '').trim();
  const link = normalizeLink(item?.link || item?.guid || '');
  if (!title || !link) return null;

  const summary = String(item?.contentSnippet || item?.summary || item?.content || '').trim();
  const imageUrl = String(item?.enclosure?.url || '').trim();
  const categories = Array.isArray(item?.categories)
    ? item.categories.map((category) => String(category).trim()).filter(Boolean)
    : [];
  const publishedAt = item?.pubDate || item?.isoDate ? new Date(item.pubDate || item.isoDate) : new Date();

  return {
    title,
    link,
    summary,
    source,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    fetchedAt: new Date(),
    imageUrl,
    categories,
  };
}

async function fetchAndSaveNews() {
  const summary = {
    feedsProcessed: 0,
    totalFetched: 0,
    totalMatched: 0,
    totalInserted: 0,
    totalSkipped: 0,
    totalRetried: 0,
    feedResults: [],
  };

  const seenLinks = new Set();

  for (const feed of RSS_FEEDS) {
    const feedResult = {
      source: feed.source,
      url: feed.url,
      success: false,
      fetched: 0,
      matched: 0,
      inserted: 0,
      attempts: 0,
    };

    try {
      const { rss, attempts } = await parseFeedWithRetry(feed);
      feedResult.attempts = attempts;
      if (attempts > 1) {
        summary.totalRetried += attempts - 1;
      }

      const items = Array.isArray(rss?.items) ? rss.items.slice(0, 20) : [];

      feedResult.fetched = items.length;
      summary.totalFetched += items.length;

      for (const item of items) {
        if (!isAiRelated(item)) {
          summary.totalSkipped += 1;
          continue;
        }

        const normalized = normalizeNewsItem(item, feed.source);
        if (!normalized) {
          summary.totalSkipped += 1;
          continue;
        }

        if (seenLinks.has(normalized.link)) {
          summary.totalSkipped += 1;
          continue;
        }
        seenLinks.add(normalized.link);

        feedResult.matched += 1;
        summary.totalMatched += 1;

        const alreadyExists = await News.exists({ link: normalized.link });
        if (alreadyExists) {
          summary.totalSkipped += 1;
          continue;
        }

        if (normalized.summary) {
          normalized.aiSummary = await generateAiSummary({
            title: normalized.title,
            summary: normalized.summary,
            source: normalized.source,
          });
        }

        try {
          await News.create(normalized);
          feedResult.inserted += 1;
          summary.totalInserted += 1;
        } catch (error) {
          if (error?.code === 11000) {
            summary.totalSkipped += 1;
          } else {
            throw error;
          }
        }
      }

      feedResult.success = true;
    } catch (error) {
      feedResult.error = error.message;
    }

    summary.feedsProcessed += 1;
    summary.feedResults.push(feedResult);
  }

  return summary;
}

async function cleanupOldNews() {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const ageDeleteResult = await News.deleteMany({ publishedAt: { $lt: cutoffDate } });
  const totalAfterAgeDelete = await News.countDocuments({});

  let overflowDeleted = 0;
  if (totalAfterAgeDelete > NEWS_MAX_RECORDS) {
    const overflowCount = totalAfterAgeDelete - NEWS_MAX_RECORDS;
    const overflowDocs = await News.find({})
      .sort({ publishedAt: 1, _id: 1 })
      .limit(overflowCount)
      .select('_id');

    if (overflowDocs.length > 0) {
      const ids = overflowDocs.map((doc) => doc._id);
      const overflowDeleteResult = await News.deleteMany({ _id: { $in: ids } });
      overflowDeleted = Number(overflowDeleteResult?.deletedCount || 0);
    }
  }

  return {
    deletedByAge: Number(ageDeleteResult?.deletedCount || 0),
    deletedByOverflow: overflowDeleted,
  };
}

async function runNewsIngestion(options = {}) {
  const { trigger = 'manual', withCleanup = true } = options;
  const startedAt = new Date();
  let fetchSummary = null;
  let cleanupSummary = { deletedByAge: 0, deletedByOverflow: 0 };
  let errorMessage = '';

  try {
    fetchSummary = await fetchAndSaveNews();
    if (withCleanup) {
      cleanupSummary = await cleanupOldNews();
    }

    const hasFeedErrors = fetchSummary.feedResults.some((item) => !item.success);
    const status = hasFeedErrors ? 'partial' : 'success';
    const finishedAt = new Date();

    await createFetchLog({
      jobName: 'news_ingestion',
      source: trigger,
      status,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      fetched: fetchSummary.totalFetched,
      matched: fetchSummary.totalMatched,
      inserted: fetchSummary.totalInserted,
      skipped: fetchSummary.totalSkipped,
      deleted: cleanupSummary.deletedByAge + cleanupSummary.deletedByOverflow,
      errorMessage: '',
      meta: {
        feedsProcessed: fetchSummary.feedsProcessed,
        retried: fetchSummary.totalRetried,
        feedResults: fetchSummary.feedResults,
      },
    });

    return { fetch: fetchSummary, cleanup: cleanupSummary };
  } catch (error) {
    errorMessage = error.message;
    const finishedAt = new Date();

    try {
      await createFetchLog({
        jobName: 'news_ingestion',
        source: trigger,
        status: 'error',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        fetched: fetchSummary?.totalFetched || 0,
        matched: fetchSummary?.totalMatched || 0,
        inserted: fetchSummary?.totalInserted || 0,
        skipped: fetchSummary?.totalSkipped || 0,
        deleted: cleanupSummary.deletedByAge + cleanupSummary.deletedByOverflow,
        errorMessage,
        meta: {
          feedsProcessed: fetchSummary?.feedsProcessed || 0,
        },
      });
    } catch (_logError) {
      // Ignore fetch-log write failures.
    }

    throw error;
  }
}

async function getNews({ page = 1, limit = 20, search = '' }) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
  const safeSearch = String(search || '').trim();
  const skip = (safePage - 1) * safeLimit;

  const query = safeSearch
    ? {
        $or: [{ title: { $regex: safeSearch, $options: 'i' } }, { summary: { $regex: safeSearch, $options: 'i' } }],
      }
    : {};

  const [data, total] = await Promise.all([
    News.find(query).sort({ publishedAt: -1 }).skip(skip).limit(safeLimit).lean(),
    News.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
  };
}

async function getNewsSources() {
  return News.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        latestArticle: { $max: '$publishedAt' },
      },
    },
    { $sort: { count: -1 } },
  ]);
}

function startNewsCron() {
  if (newsSyncInterval) return;

  const run = async () => {
    if (newsSyncRunning) return;
    newsSyncRunning = true;
    try {
      const result = await runNewsIngestion({ trigger: 'cron', withCleanup: true });
      logger.info(
        `[News Cron] feeds=${result.fetch.feedsProcessed}, fetched=${result.fetch.totalFetched}, matched=${result.fetch.totalMatched}, inserted=${result.fetch.totalInserted}, deletedByAge=${result.cleanup.deletedByAge}, deletedByOverflow=${result.cleanup.deletedByOverflow}`
      );
    } catch (error) {
      logger.error('[News Cron] failed', error);
    } finally {
      newsSyncRunning = false;
    }
  };

  run();
  newsSyncInterval = setInterval(run, NEWS_SYNC_INTERVAL_MS);
}

function stopNewsCron() {
  if (newsSyncInterval) {
    clearInterval(newsSyncInterval);
    newsSyncInterval = null;
  }
}

module.exports = {
  fetchAndSaveNews,
  cleanupOldNews,
  runNewsIngestion,
  getNews,
  getNewsSources,
  startNewsCron,
  stopNewsCron,
};
