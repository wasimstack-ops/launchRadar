const express = require('express');
const adminKeyMiddleware = require('../../../middleware/adminKey.middleware');
const {
  fetchProductHuntTrending,
  fetchProductHuntTopics,
  getProductHuntTopics,
  fetchProductsByTopic,
  fetchAllTopicsProducts,
  fetchTopProductsToday,
  syncTopProductsSnapshot,
  cleanupLowVoteProducts,
  refreshAllTopicProductsWeekly,
  syncTrendingProductsDaily,
  getTrendingProducts,
} = require('./producthunt.service');
const ProductHuntProduct = require('./producthunt-product.model');

const router = express.Router();

router.get('/admin/automation/producthunt-test', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await fetchProductHuntTrending();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-topics-test', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await fetchProductHuntTopics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/producthunt/topics', async (req, res, next) => {
  try {
    const data = await getProductHuntTopics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/producthunt/categories', async (req, res, next) => {
  try {
    const data = await getProductHuntTopics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-products-by-topic-test', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await fetchProductsByTopic(req.query.topic);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-products-all-topics-test', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await fetchAllTopicsProducts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/producthunt/products', async (req, res, next) => {
  try {
    const topic = String(req.query.topic || '').trim();
    const query = topic ? { topic_slug: topic } : {};
    const data = await ProductHuntProduct.find(query)
      .sort({ votesCount: -1, createdAt: -1 })
      .limit(200);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/producthunt/top-today', async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const date = req.query.date;
    const page = req.query.page;
    const data = await fetchTopProductsToday(limit, date, page);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-top-products-sync', adminKeyMiddleware, async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const date = req.query.date;
    const data = await syncTopProductsSnapshot(limit, date);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-products-weekly-cleanup', adminKeyMiddleware, async (req, res, next) => {
  try {
    const count = req.query.count;
    const data = await cleanupLowVoteProducts(count);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-products-weekly-refresh', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await refreshAllTopicProductsWeekly();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/automation/producthunt-trending-sync', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await syncTrendingProductsDaily();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/producthunt/trending', async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const data = await getTrendingProducts(limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
