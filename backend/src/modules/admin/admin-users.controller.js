const adminUsersService = require('./admin-users.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const listUsersController = asyncHandler(async (req, res) => {
  const data = await adminUsersService.listUsers({
    page: req.query?.page,
    limit: req.query?.limit,
    search: req.query?.search,
    plan: req.query?.plan,
    status: req.query?.status,
  });

  res.status(200).json({ success: true, data });
});

const updateUserController = asyncHandler(async (req, res) => {
  const data = await adminUsersService.updateUser(req.params.id, req.body || {});

  res.status(200).json({ success: true, data });
});

module.exports = {
  listUsersController,
  updateUserController,
};
