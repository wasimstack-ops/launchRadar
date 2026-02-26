const mongoose = require('mongoose');
const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
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

let server;
let isShuttingDown = false;

async function startServer() {
  try {
    await connectDB();
    startTopProductsDailyCron();
    startProductHuntWeeklyRefreshCron();
    startProductHuntWeeklyCleanupCron();
    startTrendingProductsDailyCron();

    server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Shutting down gracefully...`);
  stopTopProductsDailyCron();
  stopProductHuntWeeklyRefreshCron();
  stopProductHuntWeeklyCleanupCron();
  stopTrendingProductsDailyCron();

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
  console.error('Unhandled Rejection', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception', error);
  shutdown('uncaughtException');
});

startServer();
