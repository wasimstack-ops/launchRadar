const express = require('express');
const adminKeyMiddleware = require('../../../middleware/adminKey.middleware');
const { fetchGithubAITrending } = require('./github.service');

const router = express.Router();

router.get('/admin/automation/github-test', adminKeyMiddleware, async (req, res, next) => {
  try {
    const data = await fetchGithubAITrending();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
