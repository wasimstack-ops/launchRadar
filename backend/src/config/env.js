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
  nodeEnv:        getEnv('NODE_ENV', 'development'),
  port:           Number(getEnv('PORT', 5000)),
  mongoUri:       getEnv('MONGO_URI'),
  adminKey:       getEnv('ADMIN_KEY'),
  corsOrigin:     getEnv('CORS_ORIGIN', '*'),

  // JWT — no insecure default in production
  jwtSecret:      getEnv('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev_jwt_secret_CHANGE_ME'),
  jwtExpiresIn:   getEnv('JWT_EXPIRES_IN', '7d'),

  // Google OAuth
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),

  // Product Hunt
  productHuntToken: getEnv('PRODUCTHUNT_TOKEN', ''),

  // Email (Nodemailer)
  smtpHost:     getEnv('SMTP_HOST', ''),
  smtpPort:     Number(getEnv('SMTP_PORT', 587)),
  smtpUser:     getEnv('SMTP_USER', ''),
  smtpPass:     getEnv('SMTP_PASS', ''),
  smtpFrom:     getEnv('SMTP_FROM', 'LaunchRadar <no-reply@launchradar.io>'),

  // OpenAI
  openaiApiKey: getEnv('OPENAI_API_KEY', ''),

  // Frontend base URL (for email links)
  frontendUrl:  getEnv('FRONTEND_URL', 'http://localhost:5174'),
};

if (Number.isNaN(env.port) || env.port <= 0) {
  throw new Error('PORT must be a valid positive number');
}

module.exports = env;
