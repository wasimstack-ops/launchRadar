const express = require('express');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const { listUsersController, updateUserController } = require('./admin-users.controller');

const router = express.Router();

router.get('/admin/users', requireAdminAccess, listUsersController);
router.patch('/admin/users/:id', requireAdminAccess, updateUserController);
router.get('/admin/billing/subscriptions', requireAdminAccess, (req, res, next) => {
  req.query.plan = req.query.plan || 'pro';
  return listUsersController(req, res, next);
});

module.exports = router;
