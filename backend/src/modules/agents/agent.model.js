const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    link: { type: String, required: true, unique: true, index: true, trim: true },
    category: { type: String, enum: ['agent', 'repo'], required: true },
    sourceType: { type: String, enum: ['open_source', 'curated', 'community'], required: true },
    stars: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: true },
    rawSource: { type: String, default: '', trim: true },
    rawData: { type: Object, default: {} },
  },
  {
    timestamps: false,
    collection: 'agents_intelligence',
  }
);

agentSchema.index({ category: 1, createdAt: -1 });
agentSchema.index({ trendingScore: -1, createdAt: -1 });

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;

