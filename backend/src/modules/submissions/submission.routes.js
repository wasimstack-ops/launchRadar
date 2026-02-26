const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const {
  createSubmissionController,
  getSubmissionsController,
  approveSubmissionController,
  rejectSubmissionController,
} = require('./submission.controller');

const router = express.Router();

router.post('/submissions', authMiddleware, createSubmissionController);
router.get('/admin/submissions', requireAdminAccess, getSubmissionsController);
router.patch('/admin/submissions/:id/approve', requireAdminAccess, approveSubmissionController);
router.patch('/admin/submissions/:id/reject', requireAdminAccess, rejectSubmissionController);

module.exports = router;
