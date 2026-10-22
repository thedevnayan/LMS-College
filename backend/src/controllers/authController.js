const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');
const { assertAccountAccess } = require('../services/access');
const { generateTokens, issueSession, setRefreshCookie } = require('../services/tokens');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password, role: 'student' });
  const accessToken = await issueSession(user, res);
  res.status(201).json(successResponse({ user, accessToken }));
});
const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !await user.matchPassword(req.body.password)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  await assertAccountAccess(user);
  const accessToken = await issueSession(user, res);
  res.json(successResponse({ user, accessToken }));
});
const refresh = asyncHandler(async (req, res) => {
  const incoming = req.cookies.refreshToken;
  let decoded;
  try { decoded = jwt.verify(incoming, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }); }
  catch { throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Session expired or invalid'); }
  const user = await User.findById(decoded.id);
  if (!user || decoded.version !== (user.tokenVersion || 0) || !user.refreshTokens.includes(incoming)) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Session revoked');
  await assertAccountAccess(user);
  const tokens = generateTokens(user);
  const rotated = await User.updateOne({ _id: user._id, tokenVersion: user.tokenVersion, refreshTokens: incoming }, { $set: { 'refreshTokens.$': tokens.refreshToken } });
  if (!rotated.modifiedCount) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token already used');
  setRefreshCookie(res, tokens.refreshToken);
  res.json(successResponse({ accessToken: tokens.accessToken }));
});
const logout = asyncHandler(async (req, res) => {
  // Explicit all-device logout also invalidates outstanding bearer tokens.
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 }, $set: { refreshTokens: [] } });
  for (const path of ['/', '/api/auth']) res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path });
  try { require('../sockets/testSocket').getIo().in('user_' + req.user._id).disconnectSockets(true); } catch {}
  res.json(successResponse({}, 'Logged out on all devices'));
});
const getMe = asyncHandler(async (req, res) => res.json(successResponse(req.user)));
module.exports = { register, login, refresh, logout, getMe };
