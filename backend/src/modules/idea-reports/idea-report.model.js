const mongoose = require('mongoose');

const breakdownSchema = new mongoose.Schema(
  {
    marketFit: { type: Number, default: 0 },
    problemUrgency: { type: Number, default: 0 },
    distributionPotential: { type: Number, default: 0 },
    technicalFeasibility: { type: Number, default: 0 },
    monetizationClarity: { type: Number, default: 0 },
    defensibility: { type: Number, default: 0 },
    founderAdvantage: { type: Number, default: 0 },
    timing: { type: Number, default: 0 },
  },
  { _id: false }
);

const memoSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false }
);

const playbookItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false }
);

const readinessMetricSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const ideaReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuthUser',
      required: true,
      index: true,
    },
    idea: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    executiveSummary: {
      type: String,
      default: '',
    },
    investorScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    scoreDelta: {
      type: Number,
      default: 0,
    },
    breakdown: {
      type: breakdownSchema,
      required: true,
    },
    memoSections: {
      type: [memoSectionSchema],
      default: [],
    },
    playbook: {
      type: [playbookItemSchema],
      default: [],
    },
    readinessMetrics: {
      type: [readinessMetricSchema],
      default: [],
    },
    globalRank: {
      type: Number,
      default: 1,
    },
    totalBuilders: {
      type: Number,
      default: 1,
    },
    pointsToTopFive: {
      type: Number,
      default: 0,
    },
    trendTier: {
      type: String,
      default: '',
    },
    regionalFocus: {
      type: String,
      default: '',
    },
    regionalNote: {
      type: String,
      default: '',
    },
    rawAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'idea_reports',
  }
);

ideaReportSchema.index({ investorScore: -1, createdAt: 1 });

module.exports = mongoose.model('IdeaReport', ideaReportSchema);
