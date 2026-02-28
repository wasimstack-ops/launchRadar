const axios = require('axios');
const cron = require('node-cron');
const CryptoCoin = require('./crypto.model');
const logger = require('../../config/logger');

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const CRYPTO_CRON_EXPRESSION = '*/10 * * * *';

let cryptoCronTask = null;
let cryptoSyncRunning = false;

function normalizeCoin(coin) {
  return {
    coinId: String(coin?.id || '').trim(),
    symbol: String(coin?.symbol || '').trim(),
    name: String(coin?.name || '').trim(),
    image: String(coin?.image || '').trim(),
    currentPrice: Number(coin?.current_price || 0),
    marketCap: Number(coin?.market_cap || 0),
    totalVolume: Number(coin?.total_volume || 0),
    priceChange24h: Number(coin?.price_change_percentage_24h || 0),
    marketCapRank: Number(coin?.market_cap_rank || 0),
    lastUpdated: coin?.last_updated ? new Date(coin.last_updated) : new Date(),
  };
}

async function fetchTopCoins() {
  const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 50,
      page: 1,
      sparkline: false,
    },
    timeout: 20000,
  });

  const rows = Array.isArray(response.data) ? response.data : [];
  const normalized = rows.map(normalizeCoin).filter((coin) => coin.coinId);

  if (normalized.length === 0) {
    return { fetched: 0, upserted: 0 };
  }

  const operations = normalized.map((coin) => ({
    updateOne: {
      filter: { coinId: coin.coinId },
      update: { $set: coin },
      upsert: true,
    },
  }));

  await CryptoCoin.bulkWrite(operations, { ordered: false });

  return {
    fetched: normalized.length,
    upserted: operations.length,
  };
}

async function getTopCoins(page = 1, limit = 20) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
  const skip = (safePage - 1) * safeLimit;

  const [total, data] = await Promise.all([
    CryptoCoin.countDocuments({}),
    CryptoCoin.find({})
      .sort({ marketCapRank: 1, marketCap: -1, currentPrice: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
  };
}

async function fetchTrendingCoins() {
  const response = await axios.get(`${COINGECKO_BASE_URL}/search/trending`, {
    timeout: 20000,
  });

  const coins = Array.isArray(response.data?.coins) ? response.data.coins : [];

  return coins.map((entry) => {
    const item = entry?.item || {};
    const data = item?.data || {};
    return {
      coinId: String(item?.id || '').trim(),
      symbol: String(item?.symbol || '').trim(),
      name: String(item?.name || '').trim(),
      image: String(item?.large || item?.small || item?.thumb || '').trim(),
      marketCapRank: Number(item?.market_cap_rank || 0),
      price: Number(data?.price || 0),
      priceBtc: Number(item?.price_btc || data?.price_btc || 0),
      score: Number(item?.score || 0),
    };
  });
}

function startCryptoCron() {
  if (cryptoCronTask) return;

  const run = async () => {
    if (cryptoSyncRunning) return;
    cryptoSyncRunning = true;

    try {
      const result = await fetchTopCoins();
      logger.info(`[Crypto Cron] fetched=${result.fetched}, upserted=${result.upserted}`);
    } catch (error) {
      logger.error('[Crypto Cron] failed', error);
    } finally {
      cryptoSyncRunning = false;
    }
  };

  run();
  cryptoCronTask = cron.schedule(CRYPTO_CRON_EXPRESSION, run, { timezone: 'UTC' });
}

function stopCryptoCron() {
  if (!cryptoCronTask) return;
  cryptoCronTask.stop();
  cryptoCronTask.destroy();
  cryptoCronTask = null;
}

module.exports = {
  fetchTopCoins,
  getTopCoins,
  fetchTrendingCoins,
  startCryptoCron,
  stopCryptoCron,
};
