const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const voteController = require('./vote.controller');
const { cacheMiddleware, TTL, invalidate } = require('../../config/cache');

const router = express.Router();

router.get('/news/leaderboard', cacheMiddleware('leaderboard', TTL.SHORT), voteController.getLeaderboardController);
router.post('/news/:newsId/vote', authMiddleware, (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body) => { invalidate('leaderboard'); return origJson(body); };
  next();
}, voteController.upvoteNewsController);
router.delete('/news/:newsId/vote', authMiddleware, (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body) => { invalidate('leaderboard'); return origJson(body); };
  next();
}, voteController.removeVoteController);

module.exports = router;
