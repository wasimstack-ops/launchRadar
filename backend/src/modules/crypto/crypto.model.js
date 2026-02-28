const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema(
  {
    coinId: { type: String, required: true, unique: true, index: true },
    symbol: { type: String, default: '' },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    currentPrice: { type: Number, default: 0 },
    marketCap: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },
    priceChange24h: { type: Number, default: 0 },
    marketCapRank: { type: Number, default: 0, index: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'crypto_coins',
  }
);

const CryptoCoin = mongoose.model('CryptoCoin', cryptoSchema);

module.exports = CryptoCoin;
