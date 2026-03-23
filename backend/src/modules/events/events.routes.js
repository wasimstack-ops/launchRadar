const express = require('express');
const eventsController = require('./events.controller');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');

const router = express.Router();

router.get('/events',       eventsController.getEventsController);
router.get('/events/dates', eventsController.getEventDatesController);
router.post('/events/sync', adminKeyMiddleware, eventsController.syncEventsController);

module.exports = router;
