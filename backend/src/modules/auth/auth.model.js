const mongoose = require('mongoose');

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'user',
      enum: ['user', 'admin'],
    },
    profileRole: {
      type: String,
      default: 'founder',
      enum: ['founder', 'builder', 'investor', 'advisor', 'other'],
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    plan: {
      type: String,
      default: 'free',
      enum: ['free', 'pro', 'business'],
    },
    subscriptionStatus: {
      type: String,
      default: 'inactive',
      enum: ['inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'],
    },
    stripeCustomerId: {
      type: String,
      default: '',
    },
    stripeSubscriptionId: {
      type: String,
      default: '',
    },
    stripeCurrentPeriodEnd: {
      type: Date,
      default: null,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
      },
    ],
    lastLoginAt: {
      type: Date,
      default: null,
    },
    digestSubscribed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const AuthUser = mongoose.model('AuthUser', authSchema);

module.exports = AuthUser;
