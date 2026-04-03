const axios     = require('axios');
const cheerio   = require('cheerio');
const cron      = require('node-cron');
const TechEvent = require('./tech-event.model');
const logger    = require('../../config/logger');

const CRON_EXPRESSION = '0 2 * * *'; // 02:00 UTC daily
let cronTask    = null;
let syncRunning = false;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/json,*/*;q=0.8',
};

// ── Source 1: github.com/tech-conferences/conference-data ─────────────────────
const GITHUB_TOPIC_FILES = ['data', 'javascript', 'python', 'devops', 'security'];
const GITHUB_YEARS       = ['2025', '2026', '2027'];

async function fetchGithubConferences() {
  const all = [];
  for (const year of GITHUB_YEARS) {
    for (const topic of GITHUB_TOPIC_FILES) {
      const url = `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${year}/${topic}.json`;
      try {
        const r = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        if (!Array.isArray(r.data)) continue;
        for (const item of r.data) {
          if (!item.name || !item.startDate) continue;
          all.push({
            externalId:  `gh::${year}::${topic}::${item.name}::${item.startDate}`.toLowerCase().replace(/\s+/g, '-'),
            name:        String(item.name).trim(),
            url:         String(item.url || '').trim(),
            startDate:   new Date(item.startDate),
            endDate:     item.endDate ? new Date(item.endDate) : null,
            city:        String(item.city    || '').trim(),
            country:     String(item.country || '').trim(),
            online:      Boolean(item.online),
            locales:     String(item.locales || 'EN').trim(),
            cfpUrl:      String(item.cfpUrl    || '').trim(),
            cfpEndDate:  item.cfpEndDate ? new Date(item.cfpEndDate) : null,
            twitter:     String(item.twitter || '').trim(),
            bluesky:     String(item.bluesky || '').trim(),
            topics:      [topic === 'data' ? 'general' : topic],
            source:      'github',
            format:      item.online ? 'online' : 'in-person',
          });
        }
      } catch (e) {
        if (e.response?.status !== 404) logger.warn(`[TechEvents] GitHub ${year}/${topic}: ${e.message}`);
      }
    }
  }
  return all;
}

// ── Source 2: dev.events — in-person conferences with JSON-LD ─────────────────
const DEV_EVENTS_PAGES = 4; // scrape first 4 pages

async function fetchDevEventsPage(page = 1) {
  const url = page === 1
    ? 'https://dev.events/conferences'
    : `https://dev.events/conferences?page=${page}`;
  try {
    const r = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    const $ = cheerio.load(r.data);
    const events = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw  = $(el).html();
        const data = JSON.parse(raw);
        const list = Array.isArray(data) ? data : [data];
        for (const item of list) {
          if (!item?.name || !item?.startDate) continue;
          if (!['EducationEvent','Event','BusinessEvent'].includes(item['@type'])) continue;

          const mode    = String(item.eventAttendanceMode || '').toLowerCase();
          const isOnline = mode.includes('online');
          const isMixed  = mode.includes('mixed');
          const city     = item.location?.address?.addressLocality || '';
          const country  = item.location?.address?.addressRegion   || '';

          events.push({
            externalId: `dev::${item.name}::${item.startDate}`.toLowerCase().replace(/\s+/g, '-'),
            name:       String(item.name).trim(),
            url:        String(item.url || '').trim(),
            startDate:  new Date(item.startDate),
            endDate:    item.endDate ? new Date(item.endDate) : null,
            city:       String(city).trim(),
            country:    String(country).trim(),
            online:     isOnline || isMixed,
            locales:    'EN',
            cfpUrl:     '',
            cfpEndDate: null,
            twitter:    '',
            bluesky:    '',
            topics:     ['general'],
            source:     'dev.events',
            format:     isOnline ? 'online' : isMixed ? 'hybrid' : 'in-person',
            description: String(item.description || '').trim(),
          });
        }
      } catch { /* skip malformed JSON-LD */ }
    });
    return events;
  } catch (e) {
    logger.warn(`[TechEvents] dev.events page ${page}: ${e.message}`);
    return [];
  }
}

async function fetchDevEventsConferences() {
  const all = [];
  for (let p = 1; p <= DEV_EVENTS_PAGES; p++) {
    const events = await fetchDevEventsPage(p);
    if (events.length === 0) break; // no more pages
    all.push(...events);
    await new Promise(r => setTimeout(r, 500)); // polite delay
  }
  return all;
}

// ── Sync ──────────────────────────────────────────────────────────────────────
function startOfTodayUTC() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d;
}

async function fetchAndSyncTechEvents() {
  const today = startOfTodayUTC();

  logger.info('[TechEvents] Fetching from GitHub conference-data…');
  const githubEvents = await fetchGithubConferences();

  logger.info('[TechEvents] Fetching from dev.events…');
  const devEvents = await fetchDevEventsConferences();

  const all  = [...githubEvents, ...devEvents];
  const seen = new Set();

  const unique = all.filter(e => {
    if (!e.externalId || !e.name || !e.startDate) return false;
    if (isNaN(e.startDate.getTime()) || e.startDate < today) return false;
    if (seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });

  // Delete past events
  const { deletedCount } = await TechEvent.deleteMany({ startDate: { $lt: today } });

  if (unique.length === 0) {
    logger.warn('[TechEvents] No upcoming conferences found.');
    return { fetched: 0, upserted: 0, deleted: deletedCount };
  }

  const ops = unique.map(e => ({
    updateOne: {
      filter: { externalId: e.externalId },
      update: { $set: e },
      upsert: true,
    },
  }));

  await TechEvent.bulkWrite(ops, { ordered: false });
  return { fetched: unique.length, upserted: ops.length, deleted: deletedCount };
}

// ── Read ──────────────────────────────────────────────────────────────────────
async function getTechEvents({ page = 1, limit = 20, search = '', format = 'all' } = {}) {
  const safePage  = Math.max(1, Number(page)  || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const today = startOfTodayUTC();

  const query = { startDate: { $gte: today } };

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { city: re }, { country: re }, { topics: re }, { description: re }];
  }

  if (format === 'in-person') query.format = 'in-person';
  else if (format === 'online')    query.online = true;
  else if (format === 'hybrid')    query.format = 'hybrid';

  const [total, data] = await Promise.all([
    TechEvent.countDocuments(query),
    TechEvent.find(query)
      .sort({ startDate: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    data,
    pagination: {
      page: safePage, limit: safeLimit, total,
      totalPages: Math.ceil(total / safeLimit) || 0,
      hasMore: safePage < Math.ceil(total / safeLimit),
    },
  };
}

async function getTechEventStats() {
  const today = startOfTodayUTC();
  const weekEnd = new Date(today); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [total, inPerson, online, thisWeek, latest] = await Promise.all([
    TechEvent.countDocuments({ startDate: { $gte: today } }),
    TechEvent.countDocuments({ startDate: { $gte: today }, format: 'in-person' }),
    TechEvent.countDocuments({ startDate: { $gte: today }, online: true }),
    TechEvent.countDocuments({ startDate: { $gte: today, $lt: weekEnd } }),
    TechEvent.findOne({ startDate: { $gte: today } }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
  ]);

  return { total, inPerson, online, thisWeek, lastSynced: latest?.updatedAt || null };
}

async function clearAllTechEvents() {
  const result = await TechEvent.deleteMany({});
  return result.deletedCount || 0;
}

// ── Cron ──────────────────────────────────────────────────────────────────────
function startTechEventsCron() {
  if (cronTask) return;
  const run = async () => {
    if (syncRunning) return;
    syncRunning = true;
    try {
      const r = await fetchAndSyncTechEvents();
      logger.info(`[TechEvents Cron] fetched=${r.fetched}, upserted=${r.upserted}, deleted=${r.deleted}`);
    } catch (e) {
      logger.error('[TechEvents Cron] failed', e?.message || e);
    } finally {
      syncRunning = false;
    }
  };
  run();
  cronTask = cron.schedule(CRON_EXPRESSION, run, { timezone: 'UTC' });
}

function stopTechEventsCron() {
  if (!cronTask) return;
  cronTask.stop(); cronTask.destroy(); cronTask = null;
}

module.exports = {
  fetchAndSyncTechEvents,
  getTechEvents,
  getTechEventStats,
  clearAllTechEvents,
  startTechEventsCron,
  stopTechEventsCron,
};
