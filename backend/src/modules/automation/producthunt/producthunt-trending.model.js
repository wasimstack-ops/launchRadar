const mongoose = require('mongoose');

const productHuntTrendingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    tagline: { type: String, default: '' },
    votesCount: { type: Number, default: 0, index: true },
    website: { type: String, default: '' },
    source: { type: String, default: 'producthunt' },
    sourceDate: { type: String, default: '' }, // YYYY-MM-DD (UTC sync date)
  },
  {
    id: false,
    timestamps: true,
    collection: 'producthunt_trending',
  }
);

productHuntTrendingSchema.index({ name: 1, website: 1 }, { unique: true });

const ProductHuntTrending = mongoose.model('ProductHuntTrending', productHuntTrendingSchema);

module.exports = ProductHuntTrending;
