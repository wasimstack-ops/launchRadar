const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const env = require('./config/env');
const logger = require('./config/logger');
const apiRoutes = require('./routes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = env.corsOrigin
  .split(',')
  .map((o) => o.trim())
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
    credentials: true,
  })
);

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  morgan(':method :url :status :response-time ms', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── NoSQL injection sanitization ──────────────────────────────────────────────
app.use(mongoSanitize());

// ── HTTP parameter pollution prevention ──────────────────────────────────────
app.use(hpp());

// ── Global rate limit: 100 req / 15 min per IP ───────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
});

// ── Auth rate limit: 10 attempts / 15 min per IP ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Stricter limits on auth endpoints ────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ message: 'Validation failed', details });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${error.path}: ${error.value}` });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  if (statusCode >= 500) {
    logger.error('Unhandled server error', { message: error.message, stack: error.stack });
  }

  const isProd = env.nodeEnv === 'production';
  const safeMessage = String(error.message || '').trim();
  const clientMessage =
    statusCode >= 500
      ? isProd
        ? 'Internal Server Error'
        : safeMessage || 'Unexpected server error'
      : safeMessage || 'Request failed';

  return res.status(statusCode).json({
    message: clientMessage,
    ...(statusCode >= 500 && !isProd ? { stack: error.stack } : {}),
  });
});

module.exports = app;
