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

// Trust the first proxy when running behind Koyeb/Railway/etc.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = env.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  for (const allowed of allowedOrigins) {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    // Support wildcard prefix patterns like *.vercel.app
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // e.g. ".vercel.app"
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Request logging
app.use(
  morgan(':method :url :status :response-time ms', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// Body parsers
// Stripe webhooks require the raw request body for signature verification.
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL injection sanitization
app.use(mongoSanitize());

// HTTP parameter pollution prevention
app.use(hpp());

function isReadHeavyPath(path) {
  const exactReadPaths = new Set([
    '/api/news',
    '/api/news/sources',
    '/api/producthunt/topics',
    '/api/producthunt/categories',
    '/api/producthunt/top-today',
    '/api/producthunt/trending',
    '/api/agents/latest',
    '/api/agents/trending',
    '/api/agents/repos',
    '/api/agents/ai',
    '/api/crypto/top',
    '/api/crypto/trending',
    '/api/airdrops',
    '/api/idea-reports/leaderboard',
    '/api/idea-reports/me/list',
  ]);

  if (exactReadPaths.has(path)) {
    return true;
  }

  return /^\/api\/idea-reports\/[^/]+(?:\/pdf)?$/.test(path);
}

function shouldSkipGlobalRateLimit(req) {
  if (req.path === '/health') return true;
  return req.method === 'GET' && isReadHeavyPath(req.path);
}

// Global rate limit: relaxed for general traffic, stricter limiters added below
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  skip: shouldSkipGlobalRateLimit,
});

// Read-heavy public pages should tolerate normal browsing and refreshes
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  skip: (req) => req.method !== 'GET' || !isReadHeavyPath(req.path),
});

// Auth rate limit: 10 attempts / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

// AI/report generation is more expensive than simple reads
const ideaWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many report generations, please try again later.' },
  skip: (req) => req.method !== 'POST',
});

const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many billing attempts, please try again later.' },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many admin requests, please try again later.' },
});

app.use(globalLimiter);
app.use(readLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stricter limits on sensitive endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/idea-reports', ideaWriteLimiter);
app.use('/api/billing/checkout', billingLimiter);
app.use('/api/admin', adminLimiter);

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((err) => ({
      field: err.path,
      message: err.message,
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
