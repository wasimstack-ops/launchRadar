const mongoose = require('mongoose');

const listingRatingSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuthUser',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

listingRatingSchema.index({ listingId: 1, userId: 1 }, { unique: true });

const ListingRating = mongoose.model('ListingRating', listingRatingSchema);

module.exports = ListingRating;
