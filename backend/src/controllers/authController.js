const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

// Helper to generate tokens
const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });
  return { accessToken, refreshToken };
};

// Helper to set cookie
const setRefreshCookie = (res, refreshToken) => {
  // Convert 7d to ms
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES) || 7;
  const maxAge = days * 24 * 60 * 60 * 1000;
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true if in production
    sameSite: 'strict',
    maxAge,
  });
};

/**
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // The email unique index and global error handler takes care of duplicate emails
  // We don't need to manually query `User.findOne({ email })` which avoids race conditions

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token to user
  user.refreshTokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  res.status(201).json(
    successResponse({
      user,
      accessToken,
    })
  );
});

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    return next(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
  }

  if (!user.isActive) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Account is deactivated'));
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Add new refresh token to array (allow multi-device)
  // Optional: limit array size to e.g. 5 to prevent bloat
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) {
    user.refreshTokens.shift(); // remove oldest
  }
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  res.status(200).json(
    successResponse({
      user,
      accessToken,
    })
  );
});

/**
 * @route   POST /api/auth/refresh
 * @access  Public (needs cookie)
 */
const refresh = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    return next(new ApiError(401, 'INVALID_REFRESH_TOKEN', 'No refresh token provided'));
  }

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(incomingRefreshToken)) {
      return next(new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Account is deactivated'));
    }

    // Issue new access token (rotate access, keep same refresh for MVP, or rotate both)
    // Rotating both is more secure:
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter((rt) => rt !== incomingRefreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, newRefreshToken);

    res.status(200).json(
      successResponse({
        accessToken,
      })
    );
  } catch (error) {
    return next(new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token expired or invalid'));
  }
});

/**
 * @route   POST /api/auth/logout
 * @access  Authenticated
 */
const logout = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken = req.cookies.refreshToken;
  
  if (req.user && incomingRefreshToken) {
    // Remove the specific refresh token from DB
    req.user.refreshTokens = req.user.refreshTokens.filter((rt) => rt !== incomingRefreshToken);
    await req.user.save({ validateBeforeSave: false });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json(successResponse({}, 'Logged out'));
});

/**
 * @route   GET /api/auth/me
 * @access  Authenticated
 */
const getMe = asyncHandler(async (req, res, next) => {
  res.status(200).json(successResponse(req.user));
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
