const { fetchAirdropsExternal, getPublicAirdrops } = require('./airdropScraper.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function parseBoolean(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

const fetchAirdropsExternalController = asyncHandler(async (req, res) => {
  const force = parseBoolean(req.query?.force || req.body?.force);
  const data = await fetchAirdropsExternal({ force });
  res.status(200).json({ success: true, data });
});

const getAirdropsPublicController = asyncHandler(async (req, res) => {
  const data = await getPublicAirdrops();
  res.status(200).json({ success: true, data });
});

module.exports = {
  fetchAirdropsExternalController,
  getAirdropsPublicController,
};
