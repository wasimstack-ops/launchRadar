const mongoose = require("mongoose");

const topicNodeSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    slug: { type: String, default: "" },
  },
  { _id: false },
);

const makerSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    username: { type: String, default: "" },
    twitterUsername: { type: String, default: "" },
  },
  { _id: false },
);

const productHuntProductSchema = new mongoose.Schema(
  {
    ph_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    website: { type: String, default: "" },
    url: { type: String, required: true },
    votesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    dailyRank: { type: Number, default: 0 },
    featuredAt: { type: String, default: "" },
    createdAt: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    topics: { type: [topicNodeSchema], default: [] },
    makers: { type: [makerSchema], default: [] },
    topic_slug: { type: String, required: true, index: true },
    is_trending: { type: Boolean, default: false },
    rawData: { type: Object },
  },
  {
    id: false,
    timestamps: true,
    collection: "producthunt_products",
  },
);

const ProductHuntProduct = mongoose.model(
  "ProductHuntProduct",
  productHuntProductSchema,
);

module.exports = ProductHuntProduct;
