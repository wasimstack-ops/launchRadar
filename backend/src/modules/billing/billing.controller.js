const env = require('../../config/env');
const AuthUser = require('../auth/auth.model');

let stripe = null;
if (env.stripeSecretKey) {
  const Stripe = require('stripe');
  stripe = new Stripe(env.stripeSecretKey, { apiVersion: '2024-06-20' });
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const createCheckoutSession = asyncHandler(async (req, res) => {
  if (!stripe || !env.stripePricePro) {
    const error = new Error('Stripe is not configured');
    error.statusCode = 500;
    throw error;
  }

  const plan = String(req.body?.plan || 'pro').toLowerCase();
  const priceId = plan === 'business' ? env.stripePriceBusiness : env.stripePricePro;
  if (!priceId) {
    const error = new Error('Stripe price is not configured');
    error.statusCode = 500;
    throw error;
  }

  const user = await AuthUser.findById(req.user.userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(user._id) },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: env.stripeSuccessUrl,
    cancel_url: env.stripeCancelUrl,
    metadata: { userId: String(user._id), plan },
    client_reference_id: String(user._id),
  });

  res.status(200).json({ success: true, data: { url: session.url } });
});

const handleWebhook = asyncHandler(async (req, res) => {
  if (!stripe || !env.stripeWebhookSecret) {
    const error = new Error('Stripe webhook is not configured');
    error.statusCode = 500;
    throw error;
  }

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const updateUserFromSubscription = async (subscription, userId) => {
    if (!subscription) return;
    const updates = {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      plan: subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free',
    };
    if (subscription.customer) {
      updates.stripeCustomerId = subscription.customer;
    }
    await AuthUser.findByIdAndUpdate(userId, updates);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      const plan = session.metadata?.plan || 'pro';
      if (userId) {
        const subscription = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription)
          : null;
        await updateUserFromSubscription(subscription, userId);
        if (plan === 'business') {
          await AuthUser.findByIdAndUpdate(userId, { plan: 'business' });
        }
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const user = await AuthUser.findOne({ stripeCustomerId: subscription.customer });
      if (user) {
        await updateUserFromSubscription(subscription, user._id);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const user = await AuthUser.findOne({ stripeCustomerId: subscription.customer });
      if (user) {
        await AuthUser.findByIdAndUpdate(user._id, {
          subscriptionStatus: 'canceled',
          plan: 'free',
          stripeSubscriptionId: '',
          stripeCurrentPeriodEnd: null,
        });
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

module.exports = {
  createCheckoutSession,
  handleWebhook,
};
