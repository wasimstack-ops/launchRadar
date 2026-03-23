const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema(
  {
    coinId:   { type: String, default: '' },
    fullname: { type: String, default: '' },
    symbol:   { type: String, default: '' },
    icon:     { type: String, default: '' },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    categoryId: { type: String, default: '' },
    name:       { type: String, default: '' },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    externalId:  { type: String, required: true, unique: true, index: true },
    title:       { type: String, default: '' },
    description: { type: String, default: '' },
    proof:       { type: String, default: '' },
    dateEvent:   { type: Date, index: true },
    isHot:       { type: Boolean, default: false },
    voteCount:   { type: Number, default: 0 },
    coins:       { type: [coinSchema], default: [] },
    categories:  { type: [categorySchema], default: [] },
    confirmedByOfficials: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'crypto_events',
  }
);

const CryptoEvent = mongoose.model('CryptoEvent', eventSchema);

module.exports = CryptoEvent;
