const alertSubscriptionService = require('./alert-subscription.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const subscribeController = asyncHandler(async (req, res) => {
  const data = await alertSubscriptionService.subscribe({
    userId: req.user?.userId || null,
    email: req.body?.email || req.user?.email,
    frequency: req.body?.frequency,
    keywords: req.body?.keywords,
    sources: req.body?.sources,
  });

  res.status(200).json({ success: true, data });
});

const unsubscribeController = asyncHandler(async (req, res) => {
  const data = await alertSubscriptionService.unsubscribe(req.body?.email);
  res.status(200).json({ success: true, data });
});

const listSubscriptionsController = asyncHandler(async (req, res) => {
  const data = await alertSubscriptionService.listSubscriptions(req.query.page, req.query.limit, req.query.active);
  res.status(200).json({ success: true, ...data });
});

module.exports = {
  subscribeController,
  unsubscribeController,
  listSubscriptionsController,
};
