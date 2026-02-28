const mongoose = require('mongoose');
const Vote = require('./vote.model');
const News = require('../news/news.model');

function createInvalidIdError(field) {
  const error = new Error(`Invalid ${field}`);
  error.statusCode = 400;
  return error;
}

async function assertNewsExists(newsId) {
  if (!mongoose.isValidObjectId(newsId)) {
    throw createInvalidIdError('newsId');
  }

  const news = await News.findById(newsId).select('_id');
  if (!news) {
    const error = new Error(`News not found: ${newsId}`);
    error.statusCode = 404;
    throw error;
  }
}

async function syncVoteCount(newsId) {
  const count = await Vote.countDocuments({ newsId });
  await News.findByIdAndUpdate(newsId, { $set: { voteCount: count } });
  return count;
}

async function upvoteNews(userId, newsId) {
  await assertNewsExists(newsId);

  const existing = await Vote.findOne({ userId, newsId }).select('_id');
  if (!existing) {
    await Vote.create({ userId, newsId, value: 1 });
  }

  const voteCount = await syncVoteCount(newsId);
  return { newsId: String(newsId), voted: true, voteCount };
}

async function removeVote(userId, newsId) {
  if (!mongoose.isValidObjectId(newsId)) {
    throw createInvalidIdError('newsId');
  }

  await Vote.deleteOne({ userId, newsId });
  const voteCount = await syncVoteCount(newsId);
  return { newsId: String(newsId), voted: false, voteCount };
}

async function getLeaderboard(page = 1, limit = 20) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
  const skip = (safePage - 1) * safeLimit;

  const query = { voteCount: { $gt: 0 } };
  const [total, data] = await Promise.all([
    News.countDocuments(query),
    News.find(query)
      .sort({ voteCount: -1, commentCount: -1, publishedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
  };
}

module.exports = {
  upvoteNews,
  removeVote,
  getLeaderboard,
};
