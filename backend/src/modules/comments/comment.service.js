const mongoose = require('mongoose');
const Comment = require('./comment.model');
const News = require('../news/news.model');

function createInvalidIdError(field) {
  const error = new Error(`Invalid ${field}`);
  error.statusCode = 400;
  return error;
}

function createNotFoundError(label, id) {
  const error = new Error(`${label} not found: ${id}`);
  error.statusCode = 404;
  return error;
}

async function assertNewsExists(newsId) {
  if (!mongoose.isValidObjectId(newsId)) throw createInvalidIdError('newsId');
  const news = await News.findById(newsId).select('_id');
  if (!news) throw createNotFoundError('News', newsId);
}

async function syncCommentCount(newsId) {
  const count = await Comment.countDocuments({ newsId, isDeleted: false });
  await News.findByIdAndUpdate(newsId, { $set: { commentCount: count } });
  return count;
}

function buildThreadTree(rows) {
  const nodeMap = new Map();
  const roots = [];

  for (const row of rows) {
    nodeMap.set(String(row._id), { ...row, children: [] });
  }

  for (const row of rows) {
    const current = nodeMap.get(String(row._id));
    if (!row.parentId) {
      roots.push(current);
      continue;
    }

    const parent = nodeMap.get(String(row.parentId));
    if (!parent) {
      roots.push(current);
      continue;
    }
    parent.children.push(current);
  }

  return roots;
}

async function createComment({ userId, newsId, content, parentId }) {
  await assertNewsExists(newsId);

  const cleanContent = String(content || '').trim();
  if (!cleanContent) {
    const error = new Error('content is required');
    error.statusCode = 400;
    throw error;
  }

  let cleanParentId = null;
  if (parentId) {
    if (!mongoose.isValidObjectId(parentId)) throw createInvalidIdError('parentId');
    const parent = await Comment.findById(parentId).select('_id newsId');
    if (!parent) throw createNotFoundError('Parent comment', parentId);
    if (String(parent.newsId) !== String(newsId)) {
      const error = new Error('parentId must belong to the same news item');
      error.statusCode = 400;
      throw error;
    }
    cleanParentId = parent._id;
  }

  const created = await Comment.create({
    userId,
    newsId,
    parentId: cleanParentId,
    content: cleanContent,
  });

  const populated = await Comment.findById(created._id)
    .populate('userId', 'name email')
    .lean();

  await syncCommentCount(newsId);
  return populated;
}

async function getNewsComments(newsId) {
  await assertNewsExists(newsId);

  const rows = await Comment.find({ newsId, isDeleted: false })
    .sort({ createdAt: 1 })
    .populate('userId', 'name email')
    .lean();

  return buildThreadTree(rows);
}

async function deleteComment({ userId, role, commentId }) {
  if (!mongoose.isValidObjectId(commentId)) throw createInvalidIdError('commentId');

  const comment = await Comment.findById(commentId);
  if (!comment) throw createNotFoundError('Comment', commentId);

  const isOwner = String(comment.userId) === String(userId);
  const isAdmin = role === 'admin';
  if (!isOwner && !isAdmin) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  if (!comment.isDeleted) {
    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();
  }

  const count = await syncCommentCount(comment.newsId);
  return { commentId: String(commentId), deleted: true, commentCount: count };
}

module.exports = {
  createComment,
  getNewsComments,
  deleteComment,
};
