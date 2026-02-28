const commentService = require('./comment.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const createCommentController = asyncHandler(async (req, res) => {
  const data = await commentService.createComment({
    userId: req.user.userId,
    newsId: req.params.newsId,
    content: req.body?.content,
    parentId: req.body?.parentId || null,
  });
  res.status(201).json({ success: true, data });
});

const getNewsCommentsController = asyncHandler(async (req, res) => {
  const data = await commentService.getNewsComments(req.params.newsId);
  res.status(200).json({ success: true, data });
});

const deleteCommentController = asyncHandler(async (req, res) => {
  const data = await commentService.deleteComment({
    userId: req.user.userId,
    role: req.user.role,
    commentId: req.params.commentId,
  });
  res.status(200).json({ success: true, data });
});

module.exports = {
  createCommentController,
  getNewsCommentsController,
  deleteCommentController,
};
