const leadService = require('./lead.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const createLeadController = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await leadService.createLead(email);

  res.status(201).json({
    success: true,
    message: 'Email captured',
  });
});

module.exports = {
  createLeadController,
};
