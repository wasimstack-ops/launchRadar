const authService = require('./auth.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function validateRegisterPayload(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const password = String(body.password || '');

  if (!name || !email || !password) {
    const error = new Error('name, email, and password are required');
    error.statusCode = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const error = new Error('Invalid email format');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  return { name, email, password };
}

function validateLoginPayload(body) {
  const email = String(body.email || '').trim();
  const password = String(body.password || '');

  if (!email || !password) {
    const error = new Error('email and password are required');
    error.statusCode = 400;
    throw error;
  }

  return { email, password };
}

function validateGooglePayload(body) {
  const idToken = String(body.idToken || '').trim();
  if (!idToken) {
    const error = new Error('idToken is required');
    error.statusCode = 400;
    throw error;
  }

  return { idToken };
}

const registerController = asyncHandler(async (req, res) => {
  const payload = validateRegisterPayload(req.body || {});
  const data = await authService.registerUser(payload);

  res.status(201).json({
    success: true,
    data,
  });
});

const loginController = asyncHandler(async (req, res) => {
  const payload = validateLoginPayload(req.body || {});
  const data = await authService.loginUser(payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const googleLoginController = asyncHandler(async (req, res) => {
  const { idToken } = validateGooglePayload(req.body || {});
  const data = await authService.loginWithGoogle(idToken);

  res.status(200).json({
    success: true,
    data,
  });
});

const meController = asyncHandler(async (req, res) => {
  const data = await authService.getCurrentUser(req.user.userId);

  res.status(200).json({
    success: true,
    data,
  });
});

const getFavoritesController = asyncHandler(async (req, res) => {
  const data = await authService.getFavoriteListings(req.user.userId);

  res.status(200).json({
    success: true,
    data,
  });
});

const addFavoriteController = asyncHandler(async (req, res) => {
  const data = await authService.addFavoriteListing(req.user.userId, req.params.listingId);

  res.status(200).json({
    success: true,
    data,
  });
});

const removeFavoriteController = asyncHandler(async (req, res) => {
  const data = await authService.removeFavoriteListing(req.user.userId, req.params.listingId);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  registerController,
  loginController,
  googleLoginController,
  meController,
  getFavoritesController,
  addFavoriteController,
  removeFavoriteController,
};
