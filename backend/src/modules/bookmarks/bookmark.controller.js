const bookmarkService = require('./bookmark.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const addBookmarkController = asyncHandler(async (req, res) => {
  const data = await bookmarkService.addBookmark(req.user.userId, req.params.newsId);
  res.status(200).json({ success: true, data });
});

const removeBookmarkController = asyncHandler(async (req, res) => {
  const data = await bookmarkService.removeBookmark(req.user.userId, req.params.newsId);
  res.status(200).json({ success: true, data });
});

const getUserBookmarksController = asyncHandler(async (req, res) => {
  const data = await bookmarkService.getUserBookmarks(req.user.userId, req.query.page, req.query.limit);
  res.status(200).json({ success: true, ...data });
});

module.exports = {
  addBookmarkController,
  removeBookmarkController,
  getUserBookmarksController,
};
