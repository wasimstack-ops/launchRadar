const mongoose = require('mongoose');

const productHuntSourceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    slug: { type: String, default: '' },
    website: { type: String, default: '' },
    url: { type: String, required: true, unique: true, index: true },
    votesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    dailyRank: { type: Number, default: 0 },
    weeklyRank: { type: Number, default: 0 },
    featuredAt: { type: String, default: '' },
    createdAt: { type: String, default: '' },
    isVoted: { type: Boolean, default: false },
    isCollected: { type: Boolean, default: false },
    rawData: { type: Object },
  },
  {
    id: false,
    timestamps: false,
    collection: 'producthunt_sources',
  }
);

const ProductHuntSource = mongoose.model('ProductHuntSource', productHuntSourceSchema);

module.exports = ProductHuntSource;
