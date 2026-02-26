const Listing = require('./listing.model');
const ListingRating = require('./listing-rating.model');

function createNotFoundError(id) {
  const error = new Error(`Listing not found: ${id}`);
  error.statusCode = 404;
  return error;
}

async function createListing(data) {
  return Listing.create(data);
}

async function getAllListings(sortOption) {
  if (sortOption === 'popular') {
    return Listing.find().sort({ views: -1, createdAt: -1 });
  }

  return Listing.find().sort({ createdAt: -1 });
}

async function getListingById(id) {
  const listing = await Listing.findByIdAndUpdate(
    id,
    {
      $inc: { views: 1 },
    },
    {
      new: true,
    }
  );

  if (!listing) {
    throw createNotFoundError(id);
  }

  return listing;
}

async function updateListing(id, data) {
  const listing = await Listing.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!listing) {
    throw createNotFoundError(id);
  }

  return listing;
}

async function deleteListing(id) {
  const listing = await Listing.findByIdAndDelete(id);

  if (!listing) {
    throw createNotFoundError(id);
  }

  return listing;
}

async function rateListing(id, userId, score) {
  const listing = await Listing.findById(id);

  if (!listing) {
    throw createNotFoundError(id);
  }

  await ListingRating.findOneAndUpdate(
    { listingId: listing._id, userId },
    { $set: { score } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const stats = await ListingRating.aggregate([
    { $match: { listingId: listing._id } },
    {
      $group: {
        _id: '$listingId',
        ratingAverage: { $avg: '$score' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const ratingAverage = Number(stats?.[0]?.ratingAverage || 0);
  const ratingCount = Number(stats?.[0]?.ratingCount || 0);

  listing.ratingAverage = Number(ratingAverage.toFixed(2));
  listing.ratingCount = ratingCount;
  await listing.save();

  return listing;
}

module.exports = {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  rateListing,
};
