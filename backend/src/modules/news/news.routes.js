const express = require('express');
const newsController = require('./news.controller');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');

const router = express.Router();

router.get('/news', newsController.getNewsController);
router.get('/news/sources', newsController.getNewsSourcesController);
router.post('/admin/news/fetch', adminKeyMiddleware, newsController.fetchNewsController);

module.exports = router;
