const mongoose = require('mongoose');
const dns = require('node:dns');
const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./config/logger');
const {
  startTopProductsDailyCron,
  stopTopProductsDailyCron,
  startProductHuntWeeklyCleanupCron,
  stopProductHuntWeeklyCleanupCron,
  startProductHuntWeeklyRefreshCron,
  stopProductHuntWeeklyRefreshCron,
  startTrendingProductsDailyCron,
  stopTrendingProductsDailyCron,
} = require('./modules/automation/producthunt/producthunt.service');
const { startNewsCron, stopNewsCron } = require('./modules/news/news.service');
const { startCryptoCron, stopCryptoCron } = require('./modules/crypto/crypto.service');
const { startAgentsCron, stopAgentsCron } = require('./modules/agents/agent.service');

let server;
let isShuttingDown = false;

// Prefer IPv4 on hosts where IPv6 routing is unavailable, which avoids ETIMEDOUT
// when upstream domains return AAAA records first.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (error) {
  logger.error('Failed to set DNS result order', error);
}

async function startServer() {
  try {
    await connectDB();
    startTopProductsDailyCron();
    startProductHuntWeeklyRefreshCron();
    startProductHuntWeeklyCleanupCron();
    startTrendingProductsDailyCron();
    startNewsCron();
    startCryptoCron();
    startAgentsCron();

    server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopTopProductsDailyCron();
  stopProductHuntWeeklyRefreshCron();
  stopProductHuntWeeklyCleanupCron();
  stopTrendingProductsDailyCron();
  stopNewsCron();
  stopCryptoCron();
  stopAgentsCron();

  if (!server) {
    mongoose.connection.close(false).finally(() => process.exit(0));
    return;
  }

  server.close(() => {
    mongoose.connection
      .close(false)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  shutdown('uncaughtException');
});

startServer();
