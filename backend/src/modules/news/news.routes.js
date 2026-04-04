const express = require('express');
const newsController = require('./news.controller');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');
const { cacheMiddleware, TTL, invalidate } = require('../../config/cache');

const router = express.Router();

router.get('/news', cacheMiddleware('news', TTL.MEDIUM), newsController.getNewsController);
router.get('/news/sources', cacheMiddleware('news-sources', TTL.VERY_LONG), newsController.getNewsSourcesController);
router.post('/admin/news/fetch', adminKeyMiddleware, (req, res, next) => {
  // Invalidate news cache after sync
  const origJson = res.json.bind(res);
  res.json = (body) => { invalidate('news'); invalidate('news-sources'); return origJson(body); };
  next();
}, newsController.fetchNewsController);

module.exports = router;
