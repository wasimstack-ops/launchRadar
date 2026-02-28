const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const bookmarkController = require('./bookmark.controller');

const router = express.Router();

router.get('/news/bookmarks', authMiddleware, bookmarkController.getUserBookmarksController);
router.post('/news/:newsId/bookmark', authMiddleware, bookmarkController.addBookmarkController);
router.delete('/news/:newsId/bookmark', authMiddleware, bookmarkController.removeBookmarkController);

module.exports = router;
