const mongoose = require('mongoose');

const topicNodeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    slug: { type: String, default: '' },
  },
  { _id: false }
);

const makerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    username: { type: String, default: '' },
    twitterUsername: { type: String, default: '' },
  },
  { _id: false }
);

const productHuntTopProductSchema = new mongoose.Schema(
  {
    ph_id: { type: String, required: true, index: true },
    snapshotDate: { type: String, required: true, index: true }, // YYYY-MM-DD (UTC window date)
    rank: { type: Number, default: 0 },
    name: { type: String, required: true },
    slug: { type: String, default: '' },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    website: { type: String, default: '' },
    url: { type: String, default: '' },
    votesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    dailyRank: { type: Number, default: 0 },
    featuredAt: { type: String, default: '' },
    createdAt: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    topics: { type: [topicNodeSchema], default: [] },
    makers: { type: [makerSchema], default: [] },
    postedAfter: { type: String, default: '' },
    postedBefore: { type: String, default: '' },
    rawData: { type: Object },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    id: false,
    timestamps: true,
    collection: 'producthunt_top_products',
  }
);

productHuntTopProductSchema.index({ ph_id: 1, snapshotDate: 1 }, { unique: true });
productHuntTopProductSchema.index({ snapshotDate: 1, votesCount: -1 });

const ProductHuntTopProduct = mongoose.model('ProductHuntTopProduct', productHuntTopProductSchema);

module.exports = ProductHuntTopProduct;
