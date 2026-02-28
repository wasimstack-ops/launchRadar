const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const alertSubscriptionController = require('./alert-subscription.controller');

const router = express.Router();

router.post('/alerts/subscribe', alertSubscriptionController.subscribeController);
router.post('/alerts/unsubscribe', alertSubscriptionController.unsubscribeController);
router.post('/alerts/subscribe/me', authMiddleware, alertSubscriptionController.subscribeController);
router.get('/admin/alerts/subscriptions', requireAdminAccess, alertSubscriptionController.listSubscriptionsController);

module.exports = router;
