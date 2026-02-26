const express = require('express');
const adminKeyMiddleware = require('../../../middleware/adminKey.middleware');
const { fetchRSSFeeds } = require('./rss.service');

const router = express.Router();

router.get('/admin/automation/rss-test', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await fetchRSSFeeds();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
