const express = require('express');
const adminKeyMiddleware = require('../../middleware/adminKey.middleware');
const agentController = require('./agent.controller');

const router = express.Router();

router.post('/admin/agents/fetch', adminKeyMiddleware, agentController.fetchAgentsController);

router.get('/agents/latest', agentController.getLatestAgentsController);
router.get('/agents/trending', agentController.getTrendingAgentsController);
router.get('/agents/repos', agentController.getRepoAgentsController);
router.get('/agents/ai', agentController.getAiAgentsController);

module.exports = router;

