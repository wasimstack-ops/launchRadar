const env = require('../config/env');
const logger = require('../config/logger');

function adminKeyMiddleware(req, res, next) {
  const key = req.header('x-admin-key');

  if (!key || key !== env.adminKey) {
    logger.info('Admin access denied', {
      requestId: req.requestId || null,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      reason: key ? 'invalid_admin_key' : 'missing_admin_key',
    });
    return res.status(403).json({ message: 'Forbidden' });
  }

  return next();
}

module.exports = adminKeyMiddleware;
