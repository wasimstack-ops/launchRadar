const FetchLog = require('./fetch-log.model');

async function createFetchLog(payload) {
  return FetchLog.create(payload);
}

async function getFetchLogs({ page = 1, limit = 20, jobName = '', status = '', source = '' }) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
  const skip = (safePage - 1) * safeLimit;

  const query = {};
  if (jobName) query.jobName = String(jobName).trim();
  if (status) query.status = String(status).trim();
  if (source) query.source = String(source).trim();

  const [total, data] = await Promise.all([
    FetchLog.countDocuments(query),
    FetchLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
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

async function getFetchLogSummary(days = 7) {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(1, Math.min(365, Number(days))) : 7;
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const [overall] = await FetchLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: 1 },
        successRuns: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        partialRuns: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
        errorRuns: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        totalFetched: { $sum: '$fetched' },
        totalInserted: { $sum: '$inserted' },
        totalSkipped: { $sum: '$skipped' },
        totalDeleted: { $sum: '$deleted' },
      },
    },
  ]);

  const byJob = await FetchLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$jobName',
        runs: { $sum: 1 },
        successRuns: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        errorRuns: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        fetched: { $sum: '$fetched' },
        inserted: { $sum: '$inserted' },
      },
    },
    { $sort: { runs: -1, _id: 1 } },
  ]);

  return {
    windowDays: safeDays,
    since: since.toISOString(),
    overall: overall || {
      totalRuns: 0,
      successRuns: 0,
      partialRuns: 0,
      errorRuns: 0,
      totalFetched: 0,
      totalInserted: 0,
      totalSkipped: 0,
      totalDeleted: 0,
    },
    byJob,
  };
}

module.exports = {
  createFetchLog,
  getFetchLogs,
  getFetchLogSummary,
};
