const NodeCache = require('node-cache');
const logger = require('./logger');

// TTL values in seconds
const TTL = {
  SHORT: 2 * 60,        // 2 min  — fast-changing data (top products, trending)
  MEDIUM: 5 * 60,       // 5 min  — news, crypto, leaderboard
  LONG: 15 * 60,        // 15 min — agents, airdrops, listings
  VERY_LONG: 60 * 60,   // 1 hr   — topics, categories, events (rarely change)
};

const cache = new NodeCache({
  stdTTL: TTL.MEDIUM,
  checkperiod: 60,
  useClones: false,       // avoid deep-clone overhead on large payloads
  maxKeys: 500,
});

cache.on('expired', (key) => {
  logger.debug(`Cache expired: ${key}`);
});

/**
 * Build a cache key from route path + sorted query params.
 * e.g. "/api/news?page=1&limit=10" → "news:limit=10&page=1"
 */
function buildKey(prefix, query) {
  const params = Object.entries(query || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return params ? `${prefix}:${params}` : prefix;
}

/**
 * Express middleware factory.
 * Usage: router.get('/news', cacheMiddleware('news', TTL.MEDIUM), controller)
 */
function cacheMiddleware(prefix, ttl = TTL.MEDIUM) {
  return (req, res, next) => {
    const key = buildKey(prefix, req.query);
    const cached = cache.get(key);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate all keys matching a prefix.
 * Call after data sync/mutation to bust stale cache.
 */
function invalidate(prefix) {
  const keys = cache.keys().filter((k) => k === prefix || k.startsWith(`${prefix}:`));
  if (keys.length > 0) {
    cache.del(keys);
    logger.info(`Cache invalidated: ${prefix} (${keys.length} keys)`);
  }
}

/**
 * Invalidate multiple prefixes at once.
 */
function invalidateMany(prefixes) {
  for (const p of prefixes) {
    invalidate(p);
  }
}

/**
 * Flush entire cache. Use sparingly.
 */
function flushAll() {
  cache.flushAll();
  logger.info('Cache flushed completely');
}

/**
 * Get cache stats for admin monitoring.
 */
function getStats() {
  const stats = cache.getStats();
  return {
    keys: cache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) + '%'
      : '0%',
    ksize: stats.ksize,
    vsize: stats.vsize,
  };
}

module.exports = {
  cache,
  TTL,
  buildKey,
  cacheMiddleware,
  invalidate,
  invalidateMany,
  flushAll,
  getStats,
};
