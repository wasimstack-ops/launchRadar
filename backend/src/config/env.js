const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getEnv(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number(getEnv('PORT', 5000)),
  mongoUri: getEnv('MONGO_URI'),
  adminKey: getEnv('ADMIN_KEY'),
  corsOrigin: getEnv('CORS_ORIGIN', '*'),
  jwtSecret: getEnv('JWT_SECRET', 'dev_jwt_secret_change_me'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
};

if (Number.isNaN(env.port) || env.port <= 0) {
  throw new Error('PORT must be a valid positive number');
}

module.exports = env;