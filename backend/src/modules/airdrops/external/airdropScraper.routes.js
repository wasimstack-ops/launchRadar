const express = require('express');
const rateLimit = require('express-rate-limit');
const adminKeyMiddleware = require('../../../middleware/adminKey.middleware');
const { fetchAirdropsExternalController, getAirdropsPublicController } = require('./airdropScraper.controller');
const { cacheMiddleware, TTL, invalidate } = require('../../../config/cache');

const router = express.Router();

const airdropExternalFetchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Try again after 1 minute.',
  },
});

router.get('/airdrops', cacheMiddleware('airdrops', TTL.LONG), getAirdropsPublicController);

router.post(
  '/admin/airdrops/external/fetch',
  adminKeyMiddleware,
  airdropExternalFetchLimiter,
  (req, res, next) => {
    const origJson = res.json.bind(res);
    res.json = (body) => { invalidate('airdrops'); return origJson(body); };
    next();
  },
  fetchAirdropsExternalController
);

module.exports = router;
