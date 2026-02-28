const AlertSubscription = require('./alert-subscription.model');
const { sendSubscriptionConfirmation } = require('./email.service');

function normalizeArray(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function validateEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    const error = new Error('Invalid email');
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function validateFrequency(frequency) {
  const value = String(frequency || 'weekly').trim().toLowerCase();
  if (!['daily', 'weekly'].includes(value)) {
    const error = new Error('frequency must be daily or weekly');
    error.statusCode = 400;
    throw error;
  }
  return value;
}

async function subscribe({ userId = null, email, frequency, keywords, sources }) {
  const normalizedEmail = validateEmail(email);
  const safeFrequency = validateFrequency(frequency);

  const update = {
    userId: userId || null,
    email: normalizedEmail,
    frequency: safeFrequency,
    keywords: normalizeArray(keywords),
    sources: normalizeArray(sources),
    isActive: true,
  };

  const doc = await AlertSubscription.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: update },
    { upsert: true, new: true, runValidators: true }
  );

  try {
    await sendSubscriptionConfirmation(normalizedEmail);
  } catch (_error) {
    // Email sending is best-effort.
  }

  return doc;
}

async function unsubscribe(email) {
  const normalizedEmail = validateEmail(email);
  const doc = await AlertSubscription.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: { isActive: false } },
    { new: true }
  );

  if (!doc) {
    const error = new Error('Subscription not found');
    error.statusCode = 404;
    throw error;
  }

  return doc;
}

async function listSubscriptions(page = 1, limit = 50, active = '') {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(200, Number(limit))) : 50;
  const skip = (safePage - 1) * safeLimit;
  const query = {};

  if (String(active).trim() === 'true') query.isActive = true;
  if (String(active).trim() === 'false') query.isActive = false;

  const [total, data] = await Promise.all([
    AlertSubscription.countDocuments(query),
    AlertSubscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
  };
}

module.exports = {
  subscribe,
  unsubscribe,
  listSubscriptions,
};
