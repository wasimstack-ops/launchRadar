const express = require('express');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');

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
const { runNewsIngestion } = require('../news/news.service');
const { fetchGithubAITrending } = require('../automation/github/github.service');
const { fetchRSSFeeds } = require('../automation/rss/rss.service');
const { fetchAirdropsExternal } = require('../airdrops/external/airdropScraper.service');
const {
  fetchProductHuntTopics,
  fetchAllTopicsProducts,
  syncTopProductsSnapshot,
  syncTrendingProductsDaily,
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
      },
    });
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

module.exports = router;
