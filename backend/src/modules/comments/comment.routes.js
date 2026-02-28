const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const commentController = require('./comment.controller');

const router = express.Router();

router.get('/news/:newsId/comments', commentController.getNewsCommentsController);
router.post('/news/:newsId/comments', authMiddleware, commentController.createCommentController);
router.delete('/news/comments/:commentId', authMiddleware, commentController.deleteCommentController);

module.exports = router;
