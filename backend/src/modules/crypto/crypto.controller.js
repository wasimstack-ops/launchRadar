const cryptoService = require('./crypto.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const getTopCryptoController = asyncHandler(async (req, res) => {
  const data = await cryptoService.getTopCoins(req.query.page, req.query.limit);
  res.status(200).json({ success: true, ...data });
});

const getTrendingCryptoController = asyncHandler(async (req, res) => {
  const data = await cryptoService.fetchTrendingCoins();
  res.status(200).json({ success: true, data });
});

module.exports = {
  getTopCryptoController,
  getTrendingCryptoController,
};
