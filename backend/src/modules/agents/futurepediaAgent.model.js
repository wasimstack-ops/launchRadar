const mongoose = require('mongoose');

const futurepediaAgentSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: '', trim: true },
    link:         { type: String, required: true, unique: true, trim: true },
    website:      { type: String, default: '', trim: true },
    logoUrl:      { type: String, default: '', trim: true },
    tags:         { type: [String], default: [] },
    pricing:      { type: String, default: '', trim: true },
    category:     { type: String, default: 'agent', trim: true },
    sourceType:   { type: String, default: 'curated', trim: true },
    stars:        { type: Number, default: 0 },
    forks:        { type: Number, default: 0 },
    language:     { type: String, default: '', trim: true },
    trendingScore:{ type: Number, default: 0 },
    pushedAt:     { type: Date, default: null },
    createdAt:    { type: Date, default: Date.now },
    rawSource:    { type: String, default: 'futurepedia', trim: true },
  },
  {
    timestamps: false,
    collection: 'futurepedia_agents',
  }
);

futurepediaAgentSchema.index({ trendingScore: -1 });
futurepediaAgentSchema.index({ createdAt: -1 });
futurepediaAgentSchema.index({ link: 1 }, { unique: true });

module.exports = mongoose.model('FuturepediaAgent', futurepediaAgentSchema);
