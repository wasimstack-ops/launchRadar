const express = require('express');
const cryptoController = require('./crypto.controller');
const { cacheMiddleware, TTL } = require('../../config/cache');

const router = express.Router();

router.get('/crypto/top', cacheMiddleware('crypto-top', TTL.MEDIUM), cryptoController.getTopCryptoController);
router.get('/crypto/trending', cacheMiddleware('crypto-trending', TTL.MEDIUM), cryptoController.getTrendingCryptoController);

module.exports = router;
