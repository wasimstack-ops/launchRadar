const ProductHuntSource = require('./producthunt.model');
const ProductHuntTopic = require('./producthunt-topic.model');
const ProductHuntProduct = require('./producthunt-product.model');
const ProductHuntTopProduct = require('./producthunt-top-product.model');
const ProductHuntTrending = require('./producthunt-trending.model');
const logger = require('../../../config/logger');

const PRODUCTHUNT_GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql';
const TOP_PRODUCTS_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const TOP_PRODUCTS_DAILY_INSERT_COUNT = 50;
const TOP_PRODUCTS_DAILY_DELETE_COUNT = 50;
const WEEKLY_CLEANUP_DAY_UTC = 0; // Sunday
const WEEKLY_CLEANUP_HOUR_UTC = 0;
const WEEKLY_CLEANUP_MINUTE_UTC = 15;
const WEEKLY_CLEANUP_DELETE_COUNT = 40;
const WEEKLY_REFRESH_DAY_UTC = 0; // Sunday
const WEEKLY_REFRESH_HOUR_UTC = 0;
const WEEKLY_REFRESH_MINUTE_UTC = 5;
const TRENDING_SYNC_HOUR_UTC = 0;
const TRENDING_SYNC_MINUTE_UTC = 25;

let dailySyncStartTimeout = null;
let dailySyncInterval = null;
let weeklyCleanupStartTimeout = null;
let weeklyCleanupInterval = null;
let weeklyRefreshStartTimeout = null;
let weeklyRefreshInterval = null;
let trendingSyncStartTimeout = null;
let trendingSyncInterval = null;

const PRODUCTHUNT_POSTS_QUERY = `
query LaunchRadarProductHuntPosts {
  posts(first: 50, order: NEWEST) {
    edges {
      node {
        id
        name
        tagline
        description
        slug
        website
        url
        votesCount
        commentsCount
        dailyRank
        weeklyRank
        featuredAt
        createdAt
        isVoted
        isCollected
      }
    }
  }
}
`;

const PRODUCTHUNT_TOPICS_QUERY = `
query LaunchRadarProductHuntTopics {
  topics(first: 50, order: FOLLOWERS_COUNT) {
    edges {
      node {
        id
        name
        slug
        followersCount
        postsCount
      }
    }
  }
}
`;

const PRODUCTHUNT_PRODUCTS_BY_TOPIC_QUERY = `
query LaunchRadarProductHuntProductsByTopic($topic: String!) {
  posts(first: 20, order: VOTES, topic: $topic) {
    edges {
      node {
        id
        name
        slug
        tagline
        description
        website
        url
        votesCount
        commentsCount
        dailyRank
        featuredAt
        createdAt
        thumbnail { url }
        topics { edges { node { name slug } } }
        makers { name username twitterUsername }
      }
    }
  }
}
`;

const PRODUCTHUNT_TOP_TODAY_QUERY = `
query LaunchRadarProductHuntTopToday($first: Int!, $after: String, $postedAfter: DateTime!, $postedBefore: DateTime!) {
  posts(first: $first, after: $after, order: VOTES, postedAfter: $postedAfter, postedBefore: $postedBefore) {
    edges {
      cursor
      node {
        id
        name
        slug
        tagline
        website
        url
        votesCount
        commentsCount
        dailyRank
        featuredAt
        createdAt
        thumbnail { url }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

const PRODUCTHUNT_TRENDING_QUERY = `
query LaunchRadarProductHuntTrending {
  posts(first: 10, order: VOTES) {
    edges {
      node {
        name
        tagline
        votesCount
        website
      }
    }
  }
}
`;

function getProductHuntToken() {
  return (
    process.env.PRODUCTHUNT_TOKEN ||
    process.env.PRODUCTHUNT_ACCESS_TOKEN ||
    process.env.PRODUCTHUNT_BEARER_TOKEN ||
    ''
  );
}

function formatDateUtcKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSnapshotKeyUtc(date) {
  const dayKey = formatDateUtcKey(date);
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${dayKey}T${hour}:${minute}:00Z`;
}

function getUtcDayWindow(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const postedAfter = new Date(Date.UTC(year, month, day, 0, 0, 0)).toISOString();
  const postedBefore = new Date(Date.UTC(year, month, day + 1, 0, 0, 0)).toISOString();
  return {
    postedAfter,
    postedBefore,
    snapshotDate: formatDateUtcKey(date),
    snapshotKey: formatSnapshotKeyUtc(new Date()),
  };
}

function getExpiryDateFromSnapshot(snapshotDate) {
  const dayOnly = String(snapshotDate || '').split('T')[0];
  const [year, month, day] = dayOnly.split('-').map((value) => Number(value));
  return new Date(Date.UTC(year, month - 1, day + 7, 0, 0, 0));
}

async function executeProductHuntQuery(query, variables = {}) {
  const token = getProductHuntToken();
  if (!token) {
    const error = new Error('Missing Product Hunt token. Set PRODUCTHUNT_TOKEN in backend .env');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(PRODUCTHUNT_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'LaunchRadar-Automation',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Product Hunt fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.errors?.length) {
    const error = new Error(`Product Hunt GraphQL error: ${payload.errors[0].message}`);
    error.statusCode = 502;
    throw error;
  }

  return payload;
}

async function fetchProductHuntTrending() {
  const payload = await executeProductHuntQuery(PRODUCTHUNT_POSTS_QUERY);
  const edges = Array.isArray(payload?.data?.posts?.edges) ? payload.data.posts.edges : [];
  const posts = edges.map((edge) => edge?.node).filter(Boolean);

  const mapped = posts
    .map((post) => ({
      id: String(post?.id || '').trim(),
      name: String(post?.name || '').trim(),
      tagline: String(post?.tagline || '').trim(),
      description: String(post?.description || '').trim(),
      slug: String(post?.slug || '').trim(),
      website: String(post?.website || '').trim(),
      url: String(post?.url || '').trim(),
      votesCount: Number(post?.votesCount || 0),
      commentsCount: Number(post?.commentsCount || 0),
      dailyRank: Number(post?.dailyRank || 0),
      weeklyRank: Number(post?.weeklyRank || 0),
      featuredAt: String(post?.featuredAt || '').trim(),
      createdAt: String(post?.createdAt || '').trim(),
      isVoted: Boolean(post?.isVoted),
      isCollected: Boolean(post?.isCollected),
      rawData: post,
    }))
    .filter((item) => item.id && item.name && item.url);

  if (mapped.length === 0) {
    return { fetched: posts.length, matched: 0, inserted: 0 };
  }

  const uniqueMapped = [];
  const seenIds = new Set();
  const seenUrls = new Set();
  for (const item of mapped) {
    if (seenIds.has(item.id) || seenUrls.has(item.url)) continue;
    seenIds.add(item.id);
    seenUrls.add(item.url);
    uniqueMapped.push(item);
  }

  const existing = await ProductHuntSource.find({
    $or: [{ id: { $in: uniqueMapped.map((item) => item.id) } }, { url: { $in: uniqueMapped.map((item) => item.url) } }],
  }).select('id url');

  const existingIds = new Set(existing.map((doc) => String(doc.id)));
  const existingUrls = new Set(existing.map((doc) => String(doc.url)));
  const insertable = uniqueMapped.filter((item) => !existingIds.has(item.id) && !existingUrls.has(item.url));

  if (insertable.length > 0) {
    await ProductHuntSource.insertMany(insertable);
  }

  return {
    fetched: posts.length,
    matched: uniqueMapped.length,
    inserted: insertable.length,
  };
}

async function fetchProductHuntTopics() {
  const payload = await executeProductHuntQuery(PRODUCTHUNT_TOPICS_QUERY);
  const edges = Array.isArray(payload?.data?.topics?.edges) ? payload.data.topics.edges : [];
  const topics = edges.map((edge) => edge?.node).filter(Boolean);

  const mapped = topics
    .map((topic) => ({
      id: String(topic?.id || '').trim(),
      name: String(topic?.name || '').trim(),
      slug: String(topic?.slug || '').trim(),
      followersCount: Number(topic?.followersCount || 0),
      postsCount: Number(topic?.postsCount || 0),
      rawData: topic,
    }))
    .filter((item) => item.id && item.name && item.slug);

  if (mapped.length === 0) {
    return { fetched: topics.length, matched: 0, inserted: 0 };
  }

  const uniqueMapped = [];
  const seenIds = new Set();
  const seenSlugs = new Set();
  for (const item of mapped) {
    if (seenIds.has(item.id) || seenSlugs.has(item.slug)) continue;
    seenIds.add(item.id);
    seenSlugs.add(item.slug);
    uniqueMapped.push(item);
  }

  const existing = await ProductHuntTopic.find({
    $or: [{ id: { $in: uniqueMapped.map((item) => item.id) } }, { slug: { $in: uniqueMapped.map((item) => item.slug) } }],
  }).select('id slug');

  const existingIds = new Set(existing.map((doc) => String(doc.id)));
  const existingSlugs = new Set(existing.map((doc) => String(doc.slug)));
  const insertable = uniqueMapped.filter((item) => !existingIds.has(item.id) && !existingSlugs.has(item.slug));

  if (insertable.length > 0) {
    await ProductHuntTopic.insertMany(insertable);
  }

  return {
    fetched: topics.length,
    matched: uniqueMapped.length,
    inserted: insertable.length,
  };
}

async function getProductHuntTopics() {
  return ProductHuntTopic.find({})
    .sort({ followersCount: -1, name: 1 })
    .select('id name slug followersCount postsCount');
}

async function fetchProductsByTopic(topicSlug) {
  const cleanTopicSlug = String(topicSlug || '').trim();
  if (!cleanTopicSlug) {
    const error = new Error('topicSlug is required');
    error.statusCode = 400;
    throw error;
  }

  const payload = await executeProductHuntQuery(PRODUCTHUNT_PRODUCTS_BY_TOPIC_QUERY, { topic: cleanTopicSlug });
  const edges = Array.isArray(payload?.data?.posts?.edges) ? payload.data.posts.edges : [];
  const posts = edges.map((edge) => edge?.node).filter(Boolean);

  let inserted = 0;
  let updated = 0;

  for (const post of posts) {
    const phId = String(post?.id || '').trim();
    const name = String(post?.name || '').trim();
    const slug = String(post?.slug || '').trim();
    const url = String(post?.url || '').trim();
    if (!phId || !name || !slug || !url) continue;

    const topics = Array.isArray(post?.topics?.edges)
      ? post.topics.edges
          .map((edge) => ({
            name: String(edge?.node?.name || '').trim(),
            slug: String(edge?.node?.slug || '').trim(),
          }))
          .filter((item) => item.name && item.slug)
      : [];

    const makers = Array.isArray(post?.makers)
      ? post.makers.map((maker) => ({
          name: String(maker?.name || '').trim(),
          username: String(maker?.username || '').trim(),
          twitterUsername: String(maker?.twitterUsername || '').trim(),
        }))
      : [];

    const updatePayload = {
      name,
      slug,
      tagline: String(post?.tagline || '').trim(),
      description: String(post?.description || '').trim(),
      websiteUrl: String(post?.website || '').trim(),
      url,
      votesCount: Number(post?.votesCount || 0),
      commentsCount: Number(post?.commentsCount || 0),
      dailyRank: Number(post?.dailyRank || 0),
      featuredAt: String(post?.featuredAt || '').trim(),
      createdAt: String(post?.createdAt || '').trim(),
      thumbnail: String(post?.thumbnail?.url || '').trim(),
      topics,
      makers,
      topic_slug: cleanTopicSlug,
      is_trending: false,
      rawData: post,
    };

    const result = await ProductHuntProduct.updateOne(
      { ph_id: phId },
      { $set: updatePayload, $setOnInsert: { ph_id: phId } },
      { upsert: true }
    );

    if (result?.upsertedCount) {
      inserted += result.upsertedCount;
    } else if (result?.matchedCount) {
      updated += 1;
    }
  }

  return {
    topic: cleanTopicSlug,
    fetched: posts.length,
    saved: inserted + updated,
    inserted,
    updated,
  };
}

async function fetchAllTopicsProducts() {
  const topics = await ProductHuntTopic.find({ slug: { $exists: true, $ne: '' } })
    .sort({ followersCount: -1 })
    .select('slug');

  const results = [];
  let totalFetched = 0;
  let totalSaved = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const topic of topics) {
    const summary = await fetchProductsByTopic(topic.slug);
    results.push(summary);
    totalFetched += summary.fetched;
    totalSaved += summary.saved;
    totalInserted += summary.inserted;
    totalUpdated += summary.updated;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    topicsProcessed: topics.length,
    totalFetched,
    totalSaved,
    totalInserted,
    totalUpdated,
    results,
  };
}

async function fetchTopProductsLiveByDate(limit = 20, dateValue = null) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Number(limit))) : 20;
  const baseDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    const error = new Error('Invalid date parameter. Use YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  async function runWindow(dateForWindow) {
    const { postedAfter, postedBefore, snapshotDate } = getUtcDayWindow(dateForWindow);
    const posts = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage && posts.length < safeLimit) {
      const remaining = safeLimit - posts.length;
      const first = Math.min(20, remaining);

      const payload = await executeProductHuntQuery(PRODUCTHUNT_TOP_TODAY_QUERY, {
        first,
        after: endCursor,
        postedAfter,
        postedBefore,
      });

      const connection = payload?.data?.posts || {};
      const edges = Array.isArray(connection?.edges) ? connection.edges : [];
      const pagePosts = edges.map((edge) => edge?.node).filter(Boolean);
      posts.push(...pagePosts);

      hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
      endCursor = connection?.pageInfo?.endCursor || null;

      if (edges.length === 0) break;
    }

    return { postedAfter, postedBefore, snapshotDate, posts: posts.slice(0, safeLimit) };
  }

  let result = await runWindow(baseDate);
  let fallbackUsed = false;

  if (!dateValue && result.posts.length === 0) {
    const yesterday = new Date(baseDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    result = await runWindow(yesterday);
    fallbackUsed = true;
  }

  return {
    ...result,
    fallbackUsed,
  };
}

async function syncTopProductsSnapshot(limit = 20, dateValue = null) {
  const live = await fetchTopProductsLiveByDate(limit, dateValue);
  const expiresAt = getExpiryDateFromSnapshot(live.snapshotDate);
  const snapshotKey = live.snapshotKey || live.snapshotDate;

  const operations = live.posts
    .map((post, index) => {
      const phId = String(post?.id || '').trim();
      const name = String(post?.name || '').trim();
      if (!phId || !name) return null;

      const normalized = {
        ph_id: phId,
        snapshotDate: snapshotKey,
        rank: index + 1,
        name,
        slug: String(post?.slug || '').trim(),
        tagline: String(post?.tagline || '').trim(),
        description: String(post?.description || '').trim(),
        website: String(post?.website || '').trim(),
        url: String(post?.url || '').trim(),
        votesCount: Number(post?.votesCount || 0),
        commentsCount: Number(post?.commentsCount || 0),
        dailyRank: Number(post?.dailyRank || 0),
        featuredAt: String(post?.featuredAt || '').trim(),
        createdAt: String(post?.createdAt || '').trim(),
        thumbnail: String(post?.thumbnail?.url || '').trim(),
        topics: Array.isArray(post?.topics?.edges)
          ? post.topics.edges
              .map((edge) => ({
                name: String(edge?.node?.name || '').trim(),
                slug: String(edge?.node?.slug || '').trim(),
              }))
              .filter((item) => item.name && item.slug)
          : [],
        makers: Array.isArray(post?.makers)
          ? post.makers.map((maker) => ({
              name: String(maker?.name || '').trim(),
              username: String(maker?.username || '').trim(),
              twitterUsername: String(maker?.twitterUsername || '').trim(),
            }))
          : [],
        postedAfter: live.postedAfter,
        postedBefore: live.postedBefore,
        rawData: post,
        expiresAt,
      };

      return {
        updateOne: {
          filter: { ph_id: normalized.ph_id, snapshotDate: normalized.snapshotDate },
          update: { $set: normalized },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (operations.length > 0) {
    await ProductHuntTopProduct.bulkWrite(operations, { ordered: false });
  }

  return {
    snapshotDate: snapshotKey,
    postedAfter: live.postedAfter,
    postedBefore: live.postedBefore,
    fallbackUsed: live.fallbackUsed,
    fetched: live.posts.length,
    saved: operations.length,
    expiresAt: expiresAt.toISOString(),
  };
}

async function getTopProductsSnapshot(page = 1, limit = 10, dateValue = null) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Number(limit))) : 10;

  let snapshotDate = dateValue ? String(dateValue).trim() : '';
  if (snapshotDate) {
    const isDayInput = /^\d{4}-\d{2}-\d{2}$/.test(snapshotDate);
    if (isDayInput) {
      const latestForDay = await ProductHuntTopProduct.findOne({
        snapshotDate: { $regex: `^${snapshotDate}` },
      })
        .sort({ snapshotDate: -1 })
        .select('snapshotDate');
      snapshotDate = latestForDay?.snapshotDate || '';
    }
  } else {
    const latest = await ProductHuntTopProduct.findOne({}).sort({ snapshotDate: -1 }).select('snapshotDate');
    snapshotDate = latest?.snapshotDate || '';
  }

  if (!snapshotDate) {
    return {
      snapshotDate: '',
      page: safePage,
      limit: safeLimit,
      total: 0,
      totalPages: 0,
      data: [],
    };
  }

  const query = { snapshotDate };
  const total = await ProductHuntTopProduct.countDocuments(query);
  const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
  const skip = (safePage - 1) * safeLimit;

  const data = await ProductHuntTopProduct.find(query)
    .sort({ votesCount: -1, rank: 1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  return {
    snapshotDate,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    paginationActive: total > 10,
    data,
  };
}

async function fetchTopProductsToday(limit = 10, dateValue = null, page = 1) {
  const snapshot = await getTopProductsSnapshot(page, limit, dateValue);
  if (snapshot.total > 0 || dateValue) return snapshot;

  // Try syncing once if collection is empty.
  await syncTopProductsSnapshot(Math.max(Number(limit) || 10, 20), null);
  return getTopProductsSnapshot(page, limit, null);
}

async function cleanupOldTopProducts(deleteCount = TOP_PRODUCTS_DAILY_DELETE_COUNT) {
  const safeDeleteCount = Number.isFinite(Number(deleteCount))
    ? Math.max(1, Math.min(200, Number(deleteCount)))
    : TOP_PRODUCTS_DAILY_DELETE_COUNT;

  const latest = await ProductHuntTopProduct.findOne({}).sort({ snapshotDate: -1 }).select('snapshotDate');
  if (!latest?.snapshotDate) {
    return { requested: safeDeleteCount, deleted: 0, candidates: 0 };
  }

  const candidates = await ProductHuntTopProduct.find({ snapshotDate: { $ne: latest.snapshotDate } })
    .sort({ snapshotDate: 1, createdAt: 1, rank: 1 })
    .limit(safeDeleteCount)
    .select('_id');

  if (candidates.length === 0) {
    return { requested: safeDeleteCount, deleted: 0, candidates: 0 };
  }

  const ids = candidates.map((item) => item._id);
  const result = await ProductHuntTopProduct.deleteMany({ _id: { $in: ids } });

  return {
    requested: safeDeleteCount,
    candidates: candidates.length,
    deleted: Number(result?.deletedCount || 0),
  };
}

async function syncTrendingProductsDaily() {
  const payload = await executeProductHuntQuery(PRODUCTHUNT_TRENDING_QUERY);
  const edges = Array.isArray(payload?.data?.posts?.edges) ? payload.data.posts.edges : [];
  const rawItems = edges.map((edge) => edge?.node).filter(Boolean);

  const sourceDate = formatDateUtcKey(new Date());
  const mapped = rawItems
    .map((item) => ({
      name: String(item?.name || '').trim(),
      tagline: String(item?.tagline || '').trim(),
      votesCount: Number(item?.votesCount || 0),
      website: String(item?.website || '').trim(),
      source: 'producthunt',
      sourceDate,
    }))
    .filter((item) => item.name);

  const unique = [];
  const seen = new Set();
  for (const item of mapped) {
    const key = `${item.name.toLowerCase()}::${item.website.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  const deleteResult = await ProductHuntTrending.deleteMany({});
  if (unique.length > 0) {
    await ProductHuntTrending.insertMany(unique, { ordered: false });
  }

  return {
    fetched: rawItems.length,
    inserted: unique.length,
    removed: Number(deleteResult?.deletedCount || 0),
    sourceDate,
  };
}

async function getTrendingProducts(limit = 10) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Number(limit))) : 10;
  return ProductHuntTrending.find({})
    .sort({ votesCount: -1, name: 1 })
    .limit(safeLimit)
    .lean();
}

function getMsUntilNextUtcRun(hour = 0, minute = DAILY_SYNC_DELAY_MINUTES) {
  const now = new Date();
  const nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0));
  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }
  return nextRun.getTime() - now.getTime();
}

function getMsUntilNextUtcWeeklyRun(day = WEEKLY_CLEANUP_DAY_UTC, hour = WEEKLY_CLEANUP_HOUR_UTC, minute = WEEKLY_CLEANUP_MINUTE_UTC) {
  const now = new Date();
  const nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0));

  const currentDay = now.getUTCDay();
  let daysToAdd = (day - currentDay + 7) % 7;
  if (daysToAdd === 0 && nextRun.getTime() <= now.getTime()) {
    daysToAdd = 7;
  }
  nextRun.setUTCDate(nextRun.getUTCDate() + daysToAdd);

  return nextRun.getTime() - now.getTime();
}

function startTopProductsDailyCron() {
  if (dailySyncStartTimeout || dailySyncInterval) return;

  const runJob = async () => {
    try {
      const result = await syncTopProductsSnapshot(TOP_PRODUCTS_DAILY_INSERT_COUNT, null);
      const cleanup = await cleanupOldTopProducts(TOP_PRODUCTS_DAILY_DELETE_COUNT);
      logger.info(
        `[ProductHunt Cron] synced snapshot ${result.snapshotDate}, saved=${result.saved}, fallback=${result.fallbackUsed}, oldDeleted=${cleanup.deleted}`
      );
    } catch (error) {
      logger.error('[ProductHunt Cron] sync failed', error);
    }
  };

  runJob();
  dailySyncInterval = setInterval(runJob, TOP_PRODUCTS_SYNC_INTERVAL_MS);
}

function stopTopProductsDailyCron() {
  if (dailySyncStartTimeout) {
    clearTimeout(dailySyncStartTimeout);
    dailySyncStartTimeout = null;
  }
  if (dailySyncInterval) {
    clearInterval(dailySyncInterval);
    dailySyncInterval = null;
  }
}

async function refreshAllTopicProductsWeekly() {
  const topicsResult = await fetchProductHuntTopics();
  const productsResult = await fetchAllTopicsProducts();

  return {
    topics: topicsResult,
    products: productsResult,
  };
}

async function cleanupLowVoteProducts(deleteCount = WEEKLY_CLEANUP_DELETE_COUNT) {
  const safeDeleteCount = Number.isFinite(Number(deleteCount))
    ? Math.max(1, Math.min(500, Number(deleteCount)))
    : WEEKLY_CLEANUP_DELETE_COUNT;

  const candidates = await ProductHuntProduct.find({})
    .sort({ votesCount: 1, updatedAt: 1, _id: 1 })
    .limit(safeDeleteCount)
    .select('_id name votesCount');

  if (candidates.length === 0) {
    return {
      requested: safeDeleteCount,
      candidates: 0,
      deleted: 0,
      message: 'No products available for cleanup.',
    };
  }

  const ids = candidates.map((item) => item._id);
  const deleteResult = await ProductHuntProduct.deleteMany({ _id: { $in: ids } });

  return {
    requested: safeDeleteCount,
    candidates: candidates.length,
    deleted: Number(deleteResult?.deletedCount || 0),
    preview: candidates.slice(0, 10).map((item) => ({
      id: String(item._id),
      name: item.name,
      votesCount: item.votesCount,
    })),
  };
}

function startProductHuntWeeklyCleanupCron() {
  if (weeklyCleanupStartTimeout || weeklyCleanupInterval) return;

  const runCleanup = async () => {
    try {
      const result = await cleanupLowVoteProducts(WEEKLY_CLEANUP_DELETE_COUNT);
      logger.info(
        `[ProductHunt Weekly Cleanup] requested=${result.requested}, candidates=${result.candidates}, deleted=${result.deleted}`
      );
    } catch (error) {
      logger.error('[ProductHunt Weekly Cleanup] failed', error);
    }
  };

  const waitMs = getMsUntilNextUtcWeeklyRun();
  weeklyCleanupStartTimeout = setTimeout(() => {
    runCleanup();
    weeklyCleanupInterval = setInterval(runCleanup, 7 * 24 * 60 * 60 * 1000);
  }, waitMs);
}

function stopProductHuntWeeklyCleanupCron() {
  if (weeklyCleanupStartTimeout) {
    clearTimeout(weeklyCleanupStartTimeout);
    weeklyCleanupStartTimeout = null;
  }
  if (weeklyCleanupInterval) {
    clearInterval(weeklyCleanupInterval);
    weeklyCleanupInterval = null;
  }
}

function startProductHuntWeeklyRefreshCron() {
  if (weeklyRefreshStartTimeout || weeklyRefreshInterval) return;

  const runRefresh = async () => {
    try {
      const result = await refreshAllTopicProductsWeekly();
      logger.info(
        `[ProductHunt Weekly Refresh] topicsInserted=${result.topics.inserted}, topicsProcessed=${result.products.topicsProcessed}, totalInserted=${result.products.totalInserted}, totalUpdated=${result.products.totalUpdated}`
      );
    } catch (error) {
      logger.error('[ProductHunt Weekly Refresh] failed', error);
    }
  };

  const waitMs = getMsUntilNextUtcWeeklyRun(
    WEEKLY_REFRESH_DAY_UTC,
    WEEKLY_REFRESH_HOUR_UTC,
    WEEKLY_REFRESH_MINUTE_UTC
  );

  weeklyRefreshStartTimeout = setTimeout(() => {
    runRefresh();
    weeklyRefreshInterval = setInterval(runRefresh, 7 * 24 * 60 * 60 * 1000);
  }, waitMs);
}

function stopProductHuntWeeklyRefreshCron() {
  if (weeklyRefreshStartTimeout) {
    clearTimeout(weeklyRefreshStartTimeout);
    weeklyRefreshStartTimeout = null;
  }
  if (weeklyRefreshInterval) {
    clearInterval(weeklyRefreshInterval);
    weeklyRefreshInterval = null;
  }
}

function startTrendingProductsDailyCron() {
  if (trendingSyncStartTimeout || trendingSyncInterval) return;

  const runSync = async () => {
    try {
      const result = await syncTrendingProductsDaily();
      logger.info(
        `[ProductHunt Trending Cron] fetched=${result.fetched}, inserted=${result.inserted}, removed=${result.removed}, date=${result.sourceDate}`
      );
    } catch (error) {
      logger.error('[ProductHunt Trending Cron] sync failed', error);
    }
  };

  const waitMs = getMsUntilNextUtcRun(TRENDING_SYNC_HOUR_UTC, TRENDING_SYNC_MINUTE_UTC);
  trendingSyncStartTimeout = setTimeout(() => {
    runSync();
    trendingSyncInterval = setInterval(runSync, 24 * 60 * 60 * 1000);
  }, waitMs);
}

function stopTrendingProductsDailyCron() {
  if (trendingSyncStartTimeout) {
    clearTimeout(trendingSyncStartTimeout);
    trendingSyncStartTimeout = null;
  }
  if (trendingSyncInterval) {
    clearInterval(trendingSyncInterval);
    trendingSyncInterval = null;
  }
}

module.exports = {
  fetchProductHuntTrending,
  fetchProductHuntTopics,
  getProductHuntTopics,
  fetchProductsByTopic,
  fetchAllTopicsProducts,
  fetchTopProductsToday,
  syncTopProductsSnapshot,
  cleanupOldTopProducts,
  startTopProductsDailyCron,
  stopTopProductsDailyCron,
  cleanupLowVoteProducts,
  startProductHuntWeeklyCleanupCron,
  stopProductHuntWeeklyCleanupCron,
  refreshAllTopicProductsWeekly,
  startProductHuntWeeklyRefreshCron,
  stopProductHuntWeeklyRefreshCron,
  syncTrendingProductsDaily,
  getTrendingProducts,
  startTrendingProductsDailyCron,
  stopTrendingProductsDailyCron,
};
