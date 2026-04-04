const express = require('express');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const { getStats: getCacheStats, flushAll: flushCache } = require('../../config/cache');

const Listing = require('../listings/listing.model');
const Lead = require('../leads/lead.model');
const AuthUser = require('../auth/auth.model');
const Submission = require('../submissions/submission.model');
const News = require('../news/news.model');
const CryptoCoin = require('../crypto/crypto.model');
const AlertSubscription = require('../alerts/alert-subscription.model');
const FetchLog = require('../fetch-logs/fetch-log.model');
const ProductHuntTopic = require('../automation/producthunt/producthunt-topic.model');
const ProductHuntProduct = require('../automation/producthunt/producthunt-product.model');
const ProductHuntTopProduct = require('../automation/producthunt/producthunt-top-product.model');
const ProductHuntTrending = require('../automation/producthunt/producthunt-trending.model');
const AirdropExternalSource = require('../airdrops/external/airdropExternal.model');

const { fetchTopCoins } = require('../crypto/crypto.service');
const { fetchAndSyncEvents } = require('../events/events.service');
const CryptoEvent = require('../events/events.model');
const { fetchAndSyncTechEvents, getTechEventStats } = require('../tech-events/tech-event.service');
const TechEvent = require('../tech-events/tech-event.model');
const { runNewsIngestion } = require('../news/news.service');
const { fetchGithubAITrending } = require('../automation/github/github.service');
const { fetchRSSFeeds } = require('../automation/rss/rss.service');
const { fetchAirdropsExternal } = require('../airdrops/external/airdropScraper.service');
const { runAgentsSyncCycle } = require('../agents/agent.service');
const {
  fetchProductHuntTopics,
  fetchProductsByTopic,
  fetchAllTopicsProducts,
  syncTopProductsSnapshot,
  syncTrendingProductsDaily,
  refreshAllTopicProductsWeekly,
  cleanupLowVoteProducts,
} = require('../automation/producthunt/producthunt.service');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function buildSubmissionStatusMap(rows) {
  const map = { pending: 0, approved: 0, rejected: 0 };
  rows.forEach((row) => {
    const key = String(row?._id || '').trim();
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      map[key] = Number(row?.count || 0);
    }
  });
  map.total = map.pending + map.approved + map.rejected;
  return map;
}

function buildFetchStatusMap(rows) {
  const map = { success: 0, partial: 0, error: 0 };
  rows.forEach((row) => {
    const key = String(row?._id || '').trim();
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      map[key] = Number(row?.count || 0);
    }
  });
  map.total = map.success + map.partial + map.error;
  return map;
}

router.get(
  '/admin/ops/overview',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      listingsCount,
      leadsCount,
      usersCount,
      newsCount,
      cryptoCount,
      activeAlertsCount,
      topicsCount,
      productsCount,
      topSnapshotsCount,
      trendingCount,
      airdropsCount,
      submissionStatusRows,
      latestNews,
      latestCrypto,
      latestFetchLog,
      fetchStatusRows,
    ] = await Promise.all([
      Listing.countDocuments({}),
      Lead.countDocuments({}),
      AuthUser.countDocuments({}),
      News.countDocuments({}),
      CryptoCoin.countDocuments({}),
      AlertSubscription.countDocuments({ isActive: true }),
      ProductHuntTopic.countDocuments({}),
      ProductHuntProduct.countDocuments({}),
      ProductHuntTopProduct.countDocuments({}),
      ProductHuntTrending.countDocuments({}),
      AirdropExternalSource.countDocuments({}),
      Submission.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      News.findOne({}).sort({ publishedAt: -1 }).select('publishedAt source title').lean(),
      CryptoCoin.findOne({}).sort({ lastUpdated: -1 }).select('lastUpdated name symbol').lean(),
      FetchLog.findOne({}).sort({ createdAt: -1 }).select('createdAt status jobName source').lean(),
      FetchLog.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          listings: listingsCount,
          leads: leadsCount,
          users: usersCount,
          news: newsCount,
          cryptoCoins: cryptoCount,
          activeAlerts: activeAlertsCount,
          productHuntTopics: topicsCount,
          productHuntProducts: productsCount,
          topProductSnapshots: topSnapshotsCount,
          trendingProducts: trendingCount,
          airdrops: airdropsCount,
        },
        submissions: buildSubmissionStatusMap(submissionStatusRows),
        fetchLogsLast7d: buildFetchStatusMap(fetchStatusRows),
        freshness: {
          latestNews: latestNews || null,
          latestCrypto: latestCrypto || null,
          latestFetchLog: latestFetchLog || null,
        },
        cache: getCacheStats(),
      },
    });
  })
);

router.post(
  '/admin/ops/cache/flush',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    flushCache();
    res.status(200).json({ success: true, message: 'Cache flushed' });
  })
);

router.get(
  '/admin/ops/fetch-logs/recent',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const limit = Number.isFinite(Number(req.query.limit)) ? Math.max(1, Math.min(50, Number(req.query.limit))) : 10;
    const data = await FetchLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('jobName source status fetched matched inserted skipped deleted durationMs createdAt')
      .lean();

    res.status(200).json({ success: true, data });
  })
);

router.post(
  '/admin/ops/crypto/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await fetchTopCoins();
    res.status(200).json({ success: true, message: 'Crypto sync complete', data });
  })
);

router.post(
  '/admin/ops/news/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await runNewsIngestion({ trigger: 'admin_ops', withCleanup: true });
    res.status(200).json({ success: true, message: 'News sync complete', data });
  })
);

router.post(
  '/admin/ops/agents/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await runAgentsSyncCycle({ trigger: 'admin_ops' });
    res.status(200).json({ success: true, message: 'Agents sync complete', data });
  })
);

router.post(
  '/admin/ops/github/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await fetchGithubAITrending();
    res.status(200).json({ success: true, message: 'GitHub sync complete', data });
  })
);

router.post(
  '/admin/ops/rss/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await fetchRSSFeeds();
    res.status(200).json({ success: true, message: 'RSS sync complete', data });
  })
);

router.post(
  '/admin/ops/airdrops/external-sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const force = parseBoolean(req.body?.force, true);
    const data = await fetchAirdropsExternal({ force });
    res.status(200).json({ success: true, message: 'Airdrops external sync complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/topics-sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await fetchProductHuntTopics();
    res.status(200).json({ success: true, message: 'Product Hunt topics sync complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/products-sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await fetchAllTopicsProducts();
    res.status(200).json({ success: true, message: 'Product Hunt products sync complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/products-topic-sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const topic = String(req.body?.topic || 'artificial-intelligence').trim();
    const data = await fetchProductsByTopic(topic);
    res.status(200).json({ success: true, message: 'Product Hunt topic products sync complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/top-sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const limit = Number.isFinite(Number(req.body?.limit)) ? Number(req.body.limit) : 20;
    const date = req.body?.date || null;
    const data = await syncTopProductsSnapshot(limit, date);
    res.status(200).json({ success: true, message: 'Product Hunt top products sync complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/trending-sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await syncTrendingProductsDaily();
    res.status(200).json({ success: true, message: 'Product Hunt trending sync complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/products-refresh',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const data = await refreshAllTopicProductsWeekly();
    res.status(200).json({ success: true, message: 'Product Hunt products refresh complete', data });
  })
);

router.post(
  '/admin/ops/producthunt/products-cleanup',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const count = Number.isFinite(Number(req.body?.count)) ? Number(req.body.count) : 40;
    const data = await cleanupLowVoteProducts(count);
    res.status(200).json({ success: true, message: 'Product Hunt products cleanup complete', data });
  })
);

// ── Events admin endpoints ────────────────────────────────────────────────────
router.get(
  '/admin/ops/events/stats',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(todayStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const [total, todayCount, thisWeek, hotCount, latest] = await Promise.all([
      CryptoEvent.countDocuments({ dateEvent: { $gte: todayStart } }),
      CryptoEvent.countDocuments({ dateEvent: { $gte: todayStart, $lt: new Date(todayStart.getTime() + 86400000) } }),
      CryptoEvent.countDocuments({ dateEvent: { $gte: todayStart, $lt: weekEnd } }),
      CryptoEvent.countDocuments({ isHot: true, dateEvent: { $gte: todayStart } }),
      CryptoEvent.findOne({ dateEvent: { $gte: todayStart } }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        today: todayCount,
        thisWeek,
        hot: hotCount,
        lastSynced: latest?.updatedAt || null,
      },
    });
  })
);

router.post(
  '/admin/ops/events/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const result = await fetchAndSyncEvents();
    res.status(200).json({
      success: true,
      message: `Synced ${result.fetched} events, deleted ${result.deleted} past events.`,
      data: result,
    });
  })
);

router.post(
  '/admin/ops/events/cleanup',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const result = await CryptoEvent.deleteMany({ dateEvent: { $lt: todayStart } });
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} past events.`,
      data: { deleted: result.deletedCount },
    });
  })
);

router.get(
  '/admin/ops/events/list',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = req.query.filter || 'upcoming';
    const skip = (page - 1) * limit;

    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const query = filter === 'past'
      ? { dateEvent: { $lt: todayStart } }
      : { dateEvent: { $gte: todayStart } };

    const [total, items] = await Promise.all([
      CryptoEvent.countDocuments(query),
      CryptoEvent.find(query)
        .sort({ dateEvent: filter === 'past' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  })
);

// ── Tech Events admin endpoints ───────────────────────────────────────────────
router.get(
  '/admin/ops/tech-events/stats',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const stats = await getTechEventStats();
    res.status(200).json({ success: true, stats });
  })
);

router.post(
  '/admin/ops/tech-events/sync',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const result = await fetchAndSyncTechEvents();
    res.status(200).json({
      success: true,
      message: `Synced ${result.fetched} conferences from GitHub + dev.events. Deleted ${result.deleted} past events.`,
      data: result,
    });
  })
);

router.post(
  '/admin/ops/tech-events/cleanup',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const result = await TechEvent.deleteMany({ startDate: { $lt: todayStart } });
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} past tech conferences.`,
      data: { deleted: result.deletedCount },
    });
  })
);

router.get(
  '/admin/ops/tech-events/list',
  requireAdminAccess,
  asyncHandler(async (req, res) => {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = req.query.filter || 'upcoming';
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);

    const query = filter === 'past'
      ? { startDate: { $lt: todayStart } }
      : { startDate: { $gte: todayStart } };

    const [total, items] = await Promise.all([
      TechEvent.countDocuments(query),
      TechEvent.find(query)
        .sort({ startDate: filter === 'past' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  })
);

module.exports = router;
