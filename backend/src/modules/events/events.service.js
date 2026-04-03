const puppeteer = require('puppeteer');
const cron = require('node-cron');
const CryptoEvent = require('./events.model');
const logger = require('../../config/logger');

const CMC_EVENTS_URL = 'https://coinmarketcap.com/events/';
const EVENTS_CRON_EXPRESSION = '0 */6 * * *'; // every 6 hours

let eventsCronTask = null;
let eventsSyncRunning = false;

// ── helpers ──────────────────────────────────────────────────────────────────
function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function buildCoinIcon(numericId) {
  if (!numericId) return '';
  return `https://s2.coinmarketcap.com/static/img/coins/64x64/${numericId}.png`;
}

function normalizeEvent(item) {
  const coins = Array.isArray(item?.name)
    ? item.name.map((c) => ({
        coinId:   String(c?.id || '').trim(),
        fullname: String(c?.name || '').trim(),
        symbol:   String(c?.symbol || c?.slug || c?.name || '').trim().toUpperCase(),
        icon:     buildCoinIcon(c?.id),
      })).filter((c) => c.coinId || c.fullname)
    : [];

  const categories = Array.isArray(item?.tags)
    ? item.tags.map((t) => ({
        categoryId: String(t?.id || ''),
        name:       String(t?.name || '').trim(),
      })).filter((c) => c.name)
    : [];

  const dateEvent = item?.eventTime ? new Date(Number(item.eventTime)) : null;
  const isHot = Boolean(item?.trending) ||
    categories.some((c) => c.name.toLowerCase() === 'hot');

  return {
    externalId:           String(item?.id || '').trim(),
    title:                String(item?.title || '').trim(),
    description:          String(item?.content || '').trim(),
    proof:                String(item?.originalSource || '').trim(),
    dateEvent,
    isHot,
    voteCount:            Number(item?.like || 0),
    coins,
    categories,
    confirmedByOfficials: Boolean(item?.confirmedByOfficials),
  };
}

// Extract events from any API response shape CMC might return
function extractFromApiResponse(data) {
  if (!data || typeof data !== 'object') return [];

  // calendar/query structure: {data: [{timestamp, eventsList: [{...event}]}]}
  if (Array.isArray(data?.data)) {
    const all = [];
    for (const day of data.data) {
      if (Array.isArray(day?.eventsList) && day.eventsList.length > 0) {
        // Inject parent day timestamp if individual event lacks eventTime
        const withTime = day.eventsList.map((e) => ({
          ...e,
          eventTime: e.eventTime || day.timestamp,
        }));
        all.push(...withTime);
      } else if (day?.id && day?.eventTime) {
        all.push(day); // flat event in data array
      }
    }
    if (all.length > 0) return all;
  }

  // trending / significant structure: flat array at root
  if (Array.isArray(data) && data.length > 0 && data[0]?.eventTime) return data;

  // fallback candidates
  const candidates = [
    data?.data?.events,
    data?.data?.list,
    data?.events,
    data?.eventList,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0 && c[0]?.eventTime) return c;
  }
  return [];
}

// ── main scrape ───────────────────────────────────────────────────────────────
async function scrapeCmcEvents() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Intercept every JSON response — captures the client-side API call for today's events
    const intercepted = [];
    page.on('response', async (response) => {
      const url = response.url();
      const ct  = response.headers()['content-type'] || '';
      if (!ct.includes('application/json')) return;
      if (!url.includes('coinmarketcap.com')) return;

      try {
        const json   = await response.json();
        const events = extractFromApiResponse(json);
        if (events.length > 0) {
          logger.info(`[Events] Intercepted ${events.length} events from: ${url}`);
          intercepted.push(...events);
        }
      } catch { /* ignore non-JSON or parse errors */ }
    });

    // Navigate and wait for everything including lazy-loaded today's events
    await page.goto(CMC_EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Extra wait for any deferred API calls
    await new Promise((r) => setTimeout(r, 3000));

    // Also pull __NEXT_DATA__ from the live page (may differ from raw HTML after hydration)
    const pageEvents = await page.evaluate(() => {
      try {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el) return [];
        const data = JSON.parse(el.textContent);
        const pp = data?.props?.pageProps || {};

        const combined = [];
        for (const key of Object.keys(pp)) {
          const val = pp[key];
          if (Array.isArray(val) && val.length > 0 && val[0]?.eventTime && val[0]?.id) {
            combined.push(...val);
          }
        }
        return combined;
      } catch { return []; }
    });

    return [...pageEvents, ...intercepted];
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ── sync ──────────────────────────────────────────────────────────────────────
async function deletePastEvents() {
  const result = await CryptoEvent.deleteMany({ dateEvent: { $lt: startOfTodayUTC() } });
  return result.deletedCount;
}

async function fetchAndSyncEvents() {
  logger.info('[Events Cron] Launching browser to scrape CoinMarketCap events…');

  const rawItems = await scrapeCmcEvents();

  // Deduplicate by id
  const seen = new Set();
  const unique = rawItems.filter((item) => {
    const id = String(item?.id || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const todayStart = startOfTodayUTC();
  const normalized = unique
    .map(normalizeEvent)
    .filter((e) => e.externalId && e.title && e.dateEvent && e.dateEvent >= todayStart);

  const deleted = await deletePastEvents();

  if (normalized.length === 0) {
    logger.warn('[Events Cron] No upcoming events found.');
    return { fetched: 0, upserted: 0, deleted };
  }

  const operations = normalized.map((event) => ({
    updateOne: {
      filter: { externalId: event.externalId },
      update: { $set: event },
      upsert: true,
    },
  }));

  await CryptoEvent.bulkWrite(operations, { ordered: false });

  return { fetched: normalized.length, upserted: operations.length, deleted };
}

// ── read ──────────────────────────────────────────────────────────────────────
async function getEvents({ page = 1, limit = 20, filter = 'upcoming', date = null } = {}) {
  const safePage  = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const query = {};

  if (date) {
    const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
    const end   = new Date(date); end.setUTCHours(23, 59, 59, 999);
    query.dateEvent = { $gte: start, $lte: end };
  } else if (filter === 'hot') {
    query.isHot = true;
    query.dateEvent = { $gte: startOfTodayUTC() };
  } else if (filter === 'past') {
    query.dateEvent = { $lt: startOfTodayUTC() };
  } else {
    query.dateEvent = { $gte: startOfTodayUTC() };
  }

  const sort = filter === 'past' ? -1 : 1;
  const [total, data] = await Promise.all([
    CryptoEvent.countDocuments(query),
    CryptoEvent.find(query).sort({ dateEvent: sort, voteCount: -1 }).skip(skip).limit(safeLimit).lean(),
  ]);

  return {
    data,
    pagination: {
      page: safePage, limit: safeLimit, total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
      hasMore: safePage < Math.ceil(total / safeLimit),
    },
  };
}

async function getEventDates() {
  const events = await CryptoEvent.find({ dateEvent: { $gte: startOfTodayUTC() } }).select('dateEvent').lean();
  const dateSet = new Set();
  for (const e of events) {
    if (e.dateEvent) {
      const d = new Date(e.dateEvent);
      dateSet.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`);
    }
  }
  return Array.from(dateSet);
}

async function clearAllEvents() {
  const result = await CryptoEvent.deleteMany({});
  return result.deletedCount || 0;
}

// ── cron ──────────────────────────────────────────────────────────────────────
function startEventsCron() {
  if (eventsCronTask) return;

  const run = async () => {
    if (eventsSyncRunning) return;
    eventsSyncRunning = true;
    try {
      const result = await fetchAndSyncEvents();
      logger.info(`[Events Cron] fetched=${result.fetched}, upserted=${result.upserted}, deleted=${result.deleted}`);
    } catch (error) {
      logger.error('[Events Cron] failed', error?.message || error);
    } finally {
      eventsSyncRunning = false;
    }
  };

  run();
  eventsCronTask = cron.schedule(EVENTS_CRON_EXPRESSION, run, { timezone: 'UTC' });
}

function stopEventsCron() {
  if (!eventsCronTask) return;
  eventsCronTask.stop();
  eventsCronTask.destroy();
  eventsCronTask = null;
}

module.exports = {
  fetchAndSyncEvents,
  getEvents,
  getEventDates,
  clearAllEvents,
  startEventsCron,
  stopEventsCron,
};
