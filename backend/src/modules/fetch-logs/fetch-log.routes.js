const express = require('express');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const fetchLogController = require('./fetch-log.controller');

const router = express.Router();

router.get('/admin/analytics/fetch-logs', requireAdminAccess, fetchLogController.getFetchLogsController);
router.get('/admin/analytics/fetch-logs/summary', requireAdminAccess, fetchLogController.getFetchLogSummaryController);

module.exports = router;
