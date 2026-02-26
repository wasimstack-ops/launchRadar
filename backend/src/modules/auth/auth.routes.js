const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const {
  registerController,
  loginController,
  googleLoginController,
  meController,
  getFavoritesController,
  addFavoriteController,
  removeFavoriteController,
} = require('./auth.controller');

const router = express.Router();

router.post('/auth/register', registerController);
router.post('/auth/login', loginController);
router.post('/auth/google', googleLoginController);
router.get('/auth/me', authMiddleware, meController);
router.get('/auth/favorites', authMiddleware, getFavoritesController);
router.post('/auth/favorites/:listingId', authMiddleware, addFavoriteController);
router.delete('/auth/favorites/:listingId', authMiddleware, removeFavoriteController);

module.exports = router;
