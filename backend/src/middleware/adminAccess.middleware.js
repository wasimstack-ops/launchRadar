const jwt = require('jsonwebtoken');
const env = require('../config/env');

function requireAdminAccess(req, res, next) {
  const authHeader = req.header('authorization') || req.header('Authorization');
  const adminKey = req.header('x-admin-key');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    try {
      const payload = jwt.verify(token, env.jwtSecret);
      if (payload?.role === 'admin') {
        req.user = {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        };
        return next();
      }
    } catch (error) {
      // Fall back to admin key path.
    }
  }

  if (adminKey && adminKey === env.adminKey) {
    req.user = { role: 'admin' };
    return next();
  }

  return res.status(403).json({ message: 'Forbidden' });
}

module.exports = requireAdminAccess;
