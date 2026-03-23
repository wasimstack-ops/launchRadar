const eventsService = require('./events.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const getEventsController = asyncHandler(async (req, res) => {
  const { page, limit, filter, date } = req.query;
  const result = await eventsService.getEvents({ page, limit, filter, date });
  res.status(200).json({ success: true, ...result });
});

const getEventDatesController = asyncHandler(async (req, res) => {
  const dates = await eventsService.getEventDates();
  res.status(200).json({ success: true, dates });
});

const syncEventsController = asyncHandler(async (req, res) => {
  const result = await eventsService.fetchAndSyncEvents();
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  getEventsController,
  getEventDatesController,
  syncEventsController,
};
