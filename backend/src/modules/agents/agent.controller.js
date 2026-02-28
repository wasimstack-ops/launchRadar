const agentService = require('./agent.service');

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
  res.status(200).json({
    success: true,
    message: 'Agents sync completed successfully',
    data,
  });
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
  const data = await agentService.getRepoAgents({ page, limit });
  res.status(200).json({ success: true, data });
});

const getAiAgentsController = asyncHandler(async (req, res) => {
  const data = await agentService.getAgentsByCategory('agent');
  res.status(200).json({ success: true, data });
});

module.exports = {
  fetchAgentsController,
  getLatestAgentsController,
  getTrendingAgentsController,
  getRepoAgentsController,
  getAiAgentsController,
};
