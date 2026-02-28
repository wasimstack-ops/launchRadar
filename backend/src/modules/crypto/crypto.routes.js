const express = require('express');
const cryptoController = require('./crypto.controller');

const router = express.Router();

router.get('/crypto/top', cryptoController.getTopCryptoController);
router.get('/crypto/trending', cryptoController.getTrendingCryptoController);

module.exports = router;
