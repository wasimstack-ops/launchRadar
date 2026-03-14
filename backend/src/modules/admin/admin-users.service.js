const AuthUser = require('../auth/auth.model');

async function listUsers({ page = 1, limit = 20, search = '', plan = '', status = '' }) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const skip = (normalizedPage - 1) * normalizedLimit;

  const query = {};
  if (search) {
    const term = String(search).trim();
    query.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }
  if (plan) {
    query.plan = plan;
  }
  if (status) {
    query.subscriptionStatus = status;
  }

  const [total, rows] = await Promise.all([
    AuthUser.countDocuments(query),
    AuthUser.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(normalizedLimit)
      .select('name email role profileRole company bio plan subscriptionStatus stripeCustomerId stripeSubscriptionId stripeCurrentPeriodEnd createdAt')
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));

  return {
    items: rows,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPrevPage: normalizedPage > 1,
    },
  };
}

async function updateUser(userId, payload) {
  const updates = {};
  if (typeof payload.role === 'string') updates.role = payload.role;
  if (typeof payload.profileRole === 'string') updates.profileRole = payload.profileRole;
  if (typeof payload.plan === 'string') updates.plan = payload.plan;
  if (typeof payload.subscriptionStatus === 'string') updates.subscriptionStatus = payload.subscriptionStatus;

  const user = await AuthUser.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

module.exports = {
  listUsers,
  updateUser,
};
