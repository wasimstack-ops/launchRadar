const env = require('../config/env');

function adminKeyMiddleware(req, res, next) {
  const key = req.header('x-admin-key');

  if (!key || key !== env.adminKey) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  return next();
}

module.exports = adminKeyMiddleware;
