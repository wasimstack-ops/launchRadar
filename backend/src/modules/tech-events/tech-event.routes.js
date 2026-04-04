const express = require('express');
const { getTechEvents } = require('./tech-event.service');
const { cacheMiddleware, TTL } = require('../../config/cache');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/tech-events', cacheMiddleware('tech-events', TTL.VERY_LONG), asyncHandler(async (req, res) => {
  const { page, limit, search, format } = req.query;
  const result = await getTechEvents({ page, limit, search, format: format || 'all' });
  res.status(200).json({ success: true, ...result });
}));

module.exports = router;
