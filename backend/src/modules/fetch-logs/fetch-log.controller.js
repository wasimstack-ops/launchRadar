const fetchLogService = require('./fetch-log.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const getFetchLogsController = asyncHandler(async (req, res) => {
  const data = await fetchLogService.getFetchLogs({
    page: req.query.page,
    limit: req.query.limit,
    jobName: req.query.jobName,
    status: req.query.status,
    source: req.query.source,
  });

  res.status(200).json({ success: true, ...data });
});

const getFetchLogSummaryController = asyncHandler(async (req, res) => {
  const data = await fetchLogService.getFetchLogSummary(req.query.days);
  res.status(200).json({ success: true, data });
});

module.exports = {
  getFetchLogsController,
  getFetchLogSummaryController,
};
