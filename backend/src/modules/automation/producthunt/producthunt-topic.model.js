const mongoose = require('mongoose');

const productHuntTopicSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    followersCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    rawData: { type: Object },
  },
  {
    id: false,
    timestamps: true,
    collection: 'producthunt_topics',
  }
);

const ProductHuntTopic = mongoose.model('ProductHuntTopic', productHuntTopicSchema);

module.exports = ProductHuntTopic;
