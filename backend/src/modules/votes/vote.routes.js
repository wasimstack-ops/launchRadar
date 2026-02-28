const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const voteController = require('./vote.controller');

const router = express.Router();

router.get('/news/leaderboard', voteController.getLeaderboardController);
router.post('/news/:newsId/vote', authMiddleware, voteController.upvoteNewsController);
router.delete('/news/:newsId/vote', authMiddleware, voteController.removeVoteController);

module.exports = router;
