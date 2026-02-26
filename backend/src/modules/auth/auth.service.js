const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const env = require('../../config/env');
const AuthUser = require('./auth.model');
const Listing = require('../listings/listing.model');

const googleClient = new OAuth2Client();

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function registerUser({ name, email, password }) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const existing = await AuthUser.findOne({ email: normalizedEmail });

  if (existing) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await AuthUser.create({
    name: String(name || '').trim(),
    email: normalizedEmail,
    passwordHash,
  });

  const token = createToken(user);
  return { user: sanitizeUser(user), token };
}

async function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const user = await AuthUser.findOne({ email: normalizedEmail });

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const token = createToken(user);
  return { user: sanitizeUser(user), token };
}

async function loginWithGoogle(idToken) {
  if (!env.googleClientId) {
    const error = new Error('GOOGLE_CLIENT_ID is not configured on server');
    error.statusCode = 500;
    throw error;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  const email = String(payload?.email || '').toLowerCase().trim();

  if (!email || !payload?.email_verified) {
    const error = new Error('Google account email is not verified');
    error.statusCode = 400;
    throw error;
  }

  let user = await AuthUser.findOne({ email });

  if (!user) {
    const randomPassword = crypto.randomBytes(18).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    try {
      user = await AuthUser.create({
        name: String(payload?.name || 'Google User').trim(),
        email,
        passwordHash,
      });
    } catch (error) {
      if (error?.code === 11000) {
        user = await AuthUser.findOne({ email });
      } else {
        throw error;
      }
    }
  }

  const token = createToken(user);
  return { user: sanitizeUser(user), token };
}

async function getCurrentUser(userId) {
  const user = await AuthUser.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
}

async function getFavoriteListings(userId) {
  const user = await AuthUser.findById(userId).populate({
    path: 'favorites',
    options: { sort: { createdAt: -1 } },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user.favorites || [];
}

async function addFavoriteListing(userId, listingId) {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    const error = new Error(`Listing not found: ${listingId}`);
    error.statusCode = 404;
    throw error;
  }

  await AuthUser.findByIdAndUpdate(userId, { $addToSet: { favorites: listingId } });
  return getFavoriteListings(userId);
}

async function removeFavoriteListing(userId, listingId) {
  await AuthUser.findByIdAndUpdate(userId, { $pull: { favorites: listingId } });
  return getFavoriteListings(userId);
}

module.exports = {
  registerUser,
  loginUser,
  loginWithGoogle,
  getCurrentUser,
  getFavoriteListings,
  addFavoriteListing,
  removeFavoriteListing,
};
