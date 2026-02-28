const mongoose = require('mongoose');
const Bookmark = require('./bookmark.model');
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

async function addBookmark(userId, newsId) {
  await assertNewsExists(newsId);

  await Bookmark.updateOne(
    { userId, newsId },
    { $setOnInsert: { userId, newsId } },
    { upsert: true }
  );

  return { newsId: String(newsId), bookmarked: true };
}

async function removeBookmark(userId, newsId) {
  if (!mongoose.isValidObjectId(newsId)) {
    throw createInvalidIdError('newsId');
  }

  await Bookmark.deleteOne({ userId, newsId });
  return { newsId: String(newsId), bookmarked: false };
}

async function getUserBookmarks(userId, page = 1, limit = 20) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
  const skip = (safePage - 1) * safeLimit;

  const query = { userId };
  const [total, rows] = await Promise.all([
    Bookmark.countDocuments(query),
    Bookmark.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('newsId')
      .lean(),
  ]);

  return {
    data: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
  };
}

module.exports = {
  addBookmark,
  removeBookmark,
  getUserBookmarks,
};
