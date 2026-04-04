const express = require('express');
const eventsController = require('./events.controller');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');
const { cacheMiddleware, TTL, invalidate } = require('../../config/cache');

const router = express.Router();

router.get('/events',       cacheMiddleware('events', TTL.VERY_LONG), eventsController.getEventsController);
router.get('/events/dates', cacheMiddleware('events-dates', TTL.VERY_LONG), eventsController.getEventDatesController);
router.post('/events/sync', adminKeyMiddleware, (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body) => { invalidate('events'); invalidate('events-dates'); return origJson(body); };
  next();
}, eventsController.syncEventsController);

module.exports = router;
