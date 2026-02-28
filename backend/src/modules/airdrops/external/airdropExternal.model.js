const mongoose = require('mongoose');

const airdropExternalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    sourceUrl: { type: String, required: true, unique: true, index: true, trim: true },
    logo: { type: String, default: '', trim: true },
    status: { type: String, default: '', trim: true },
    source: { type: String, default: 'airdrops.io', index: true, trim: true },
    aiSummary: { type: String, default: '', trim: true },
    importedAt: { type: Date, default: Date.now, index: true },
    rawData: { type: Object, default: {} },
  },
  {
    timestamps: true,
    collection: 'airdrop_external_sources',
  }
);

const AirdropExternalSource = mongoose.model('AirdropExternalSource', airdropExternalSchema);

module.exports = AirdropExternalSource;
