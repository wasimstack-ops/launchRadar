const mongoose = require('mongoose');

const alertSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuthUser',
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'weekly',
    },
    keywords: {
      type: [String],
      default: [],
    },
    sources: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'alert_subscriptions',
  }
);

const AlertSubscription = mongoose.model('AlertSubscription', alertSubscriptionSchema);

module.exports = AlertSubscription;
