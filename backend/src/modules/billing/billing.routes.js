const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const { createCheckoutSession, handleWebhook } = require('./billing.controller');

const router = express.Router();

router.post('/billing/checkout', authMiddleware, createCheckoutSession);
router.post('/billing/webhook', handleWebhook);

module.exports = router;
