const voteService = require('./vote.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const upvoteNewsController = asyncHandler(async (req, res) => {
  const data = await voteService.upvoteNews(req.user.userId, req.params.newsId);
  res.status(200).json({ success: true, data });
});

const removeVoteController = asyncHandler(async (req, res) => {
  const data = await voteService.removeVote(req.user.userId, req.params.newsId);
  res.status(200).json({ success: true, data });
});

const getLeaderboardController = asyncHandler(async (req, res) => {
  const data = await voteService.getLeaderboard(req.query.page, req.query.limit);
  res.status(200).json({ success: true, ...data });
});

module.exports = {
  upvoteNewsController,
  removeVoteController,
  getLeaderboardController,
};
