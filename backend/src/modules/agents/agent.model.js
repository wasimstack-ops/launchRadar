const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    link: { type: String, required: true, unique: true, trim: true },
    website: { type: String, default: '', trim: true },
    category: { type: String, enum: ['agent', 'repo'], required: true, index: true },
    sourceType: { type: String, enum: ['open_source', 'curated', 'community'], required: true },
    stars: { type: Number, default: 0, index: true },
    forks: { type: Number, default: 0 },
    openIssues: { type: Number, default: 0 },
    language: { type: String, default: '', trim: true },
    logoUrl: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    pushedAt: { type: Date, default: null },
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

