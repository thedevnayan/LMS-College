const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');
const { assertAccountAccess } = require('./access');

function generateTokens(user) {
  const claims = { id: String(user._id), version: user.tokenVersion || 0 };
  return {
    accessToken: jwt.sign(claims, process.env.JWT_ACCESS_SECRET, { algorithm: 'HS256', expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m', jwtid: randomUUID() }),
    refreshToken: jwt.sign(claims, process.env.JWT_REFRESH_SECRET, { algorithm: 'HS256', expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d', jwtid: randomUUID() }),
  };
}
function setRefreshCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie('refreshToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth', maxAge: Math.max(0, exp * 1000 - Date.now()) });
}
async function authenticate(token) {
  if (typeof token !== 'string') throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }); }
  catch (error) { throw new ApiError(401, error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED', 'Session expired or invalid'); }
  const user = await User.findById(decoded.id);
  if (!user || decoded.version !== (user.tokenVersion || 0)) throw new ApiError(401, 'UNAUTHORIZED', 'Session revoked');
  await assertAccountAccess(user);
  return user;
}
async function issueSession(user, res) {
  const tokens = generateTokens(user);
  await User.updateOne({ _id: user._id }, { $push: { refreshTokens: { $each: [tokens.refreshToken], $slice: -5 } } });
  setRefreshCookie(res, tokens.refreshToken);
  return tokens.accessToken;
}
module.exports = { generateTokens, setRefreshCookie, authenticate, issueSession };
