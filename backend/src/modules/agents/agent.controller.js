const agentService = require('./agent.service');
const futurepediaService = require('./futurepedia.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

const fetchAgentsController = asyncHandler(async (req, res) => {
  const data = await agentService.runAgentsSyncCycle({ trigger: 'admin' });
  res.status(200).json({ success: true, message: 'Agents sync completed successfully', data });
});

const getLatestAgentsController = asyncHandler(async (req, res) => {
  const data = await agentService.getLatestAgents();
  res.status(200).json({ success: true, data });
});

const getTrendingAgentsController = asyncHandler(async (req, res) => {
  const data = await agentService.getTrendingAgents();
  res.status(200).json({ success: true, data });
});

const getRepoAgentsController = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = toPositiveInt(req.query.limit, 20);
  const sort = req.query.sort === 'latest' ? 'latest' : 'trending';
  const data = await agentService.getAgentsPaginated({ category: 'repo', sort, page, limit });
  res.status(200).json({ success: true, data });
});

// GET /agents/ai?page=1&limit=20&sort=trending|latest  — served from futurepedia_agents
const getAiAgentsController = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = toPositiveInt(req.query.limit, 20);
  const sort = req.query.sort === 'latest' ? 'latest' : 'trending';
  const data = await futurepediaService.getFuturepediaAgentsPaginated({ sort, page, limit });
  res.status(200).json({ success: true, data });
});

// POST /admin/futurepedia/fetch
const fetchFuturepediaController = asyncHandler(async (req, res) => {
  const data = await futurepediaService.fetchFuturepediaAgents();
  res.status(200).json({ success: true, message: 'Futurepedia sync completed', data });
});

module.exports = {
  fetchAgentsController,
  fetchFuturepediaController,
  getLatestAgentsController,
  getTrendingAgentsController,
  getRepoAgentsController,
  getAiAgentsController,
};
