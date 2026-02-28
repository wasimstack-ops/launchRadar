const newsService = require('./news.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const getNewsController = asyncHandler(async (req, res) => {
  const data = await newsService.getNews({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
  });

  res.status(200).json({
    success: true,
    ...data,
  });
});

const getNewsSourcesController = asyncHandler(async (req, res) => {
  const data = await newsService.getNewsSources();
  res.status(200).json({ success: true, data });
});

const fetchNewsController = asyncHandler(async (req, res) => {
  const data = await newsService.runNewsIngestion({ trigger: 'manual', withCleanup: true });
  res.status(200).json({
    success: true,
    message: 'News fetched successfully',
    data,
  });
});

module.exports = {
  getNewsController,
  getNewsSourcesController,
  fetchNewsController,
};
