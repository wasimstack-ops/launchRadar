const express = require('express');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');
const agentController = require('./agent.controller');
const { cacheMiddleware, TTL, invalidate } = require('../../config/cache');

const router = express.Router();

function invalidateAgents(req, res, next) {
  const origJson = res.json.bind(res);
  res.json = (body) => {
    invalidate('agents-latest'); invalidate('agents-trending');
    invalidate('agents-repos'); invalidate('agents-ai');
    return origJson(body);
  };
  next();
}

router.post('/admin/agents/fetch', adminKeyMiddleware, invalidateAgents, agentController.fetchAgentsController);
router.post('/admin/futurepedia/fetch', adminKeyMiddleware, invalidateAgents, agentController.fetchFuturepediaController);

router.get('/agents/latest', cacheMiddleware('agents-latest', TTL.LONG), agentController.getLatestAgentsController);
router.get('/agents/trending', cacheMiddleware('agents-trending', TTL.LONG), agentController.getTrendingAgentsController);
router.get('/agents/repos', cacheMiddleware('agents-repos', TTL.LONG), agentController.getRepoAgentsController);
router.get('/agents/ai', cacheMiddleware('agents-ai', TTL.LONG), agentController.getAiAgentsController);

module.exports = router;

