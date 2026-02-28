const mongoose = require('mongoose');

const fetchLogSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'partial', 'error'],
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    fetched: {
      type: Number,
      default: 0,
    },
    matched: {
      type: Number,
      default: 0,
    },
    inserted: {
      type: Number,
      default: 0,
    },
    skipped: {
      type: Number,
      default: 0,
    },
    deleted: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'fetch_logs',
  }
);

fetchLogSchema.index({ createdAt: -1 });
fetchLogSchema.index({ jobName: 1, createdAt: -1 });

const FetchLog = mongoose.model('FetchLog', fetchLogSchema);

module.exports = FetchLog;
