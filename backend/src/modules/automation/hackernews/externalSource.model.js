const mongoose = require('mongoose');

const externalSourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    link: { type: String, required: true },
    category: { type: String, default: 'News' },
    news: { type: Boolean, default: true },
    tags: [{ type: String }],
    source: { type: String, default: 'hackernews' },
    popularity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'pending',
    },
    rawData: { type: Object },
  },
  {
    timestamps: true,
    collection: 'external_sources',
  }
);

const ExternalSource = mongoose.model('ExternalSource', externalSourceSchema);

module.exports = ExternalSource;
