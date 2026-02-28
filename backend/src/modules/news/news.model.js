const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    summary: {
      type: String,
      default: '',
    },
    aiSummary: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    voteCount: {
      type: Number,
      default: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'ai_news',
  }
);

newsSchema.index({ source: 1, publishedAt: -1 });
newsSchema.index({ title: 'text', summary: 'text' });

const News = mongoose.model('News', newsSchema);

module.exports = News;
