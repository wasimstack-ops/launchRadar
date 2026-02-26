const listingService = require('./listing.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const createListingController = asyncHandler(async (req, res) => {
  const data = await listingService.createListing(req.body);
  res.status(201).json({ success: true, data });
});

const getAllListingsController = asyncHandler(async (req, res) => {
  const data = await listingService.getAllListings(req.query.sort);
  res.status(200).json({ success: true, data });
});

const getListingByIdController = asyncHandler(async (req, res) => {
  const data = await listingService.getListingById(req.params.id);
  res.status(200).json({ success: true, data });
});

const updateListingController = asyncHandler(async (req, res) => {
  const data = await listingService.updateListing(req.params.id, req.body);
  res.status(200).json({ success: true, data });
});

const deleteListingController = asyncHandler(async (req, res) => {
  await listingService.deleteListing(req.params.id);
  res.status(204).send();
});

const rateListingController = asyncHandler(async (req, res) => {
  const score = Number(req.body?.score);

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    const error = new Error('score must be an integer between 1 and 5');
    error.statusCode = 400;
    throw error;
  }

  const data = await listingService.rateListing(req.params.id, req.user.userId, score);
  res.status(200).json({ success: true, data });
});

module.exports = {
  createListingController,
  getAllListingsController,
  getListingByIdController,
  updateListingController,
  deleteListingController,
  rateListingController,
};
