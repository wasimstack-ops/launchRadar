const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const logger = require('./config/logger');
const apiRoutes = require('./routes');

const app = express();

const allowedOrigins = env.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);

app.use(
  morgan(':method :url :status :response-time ms', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);

app.use((req, res, next) => {
  const routeError = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  routeError.statusCode = 404;
  next(routeError);
});

app.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));

    return res.status(400).json({
      message: 'Validation failed',
      details,
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid ${error.path}: ${error.value}`,
    });
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  if (statusCode >= 500) {
    logger.error('Unhandled server error', error);
  }

  return res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal Server Error' : error.message,
  });
});

module.exports = app;