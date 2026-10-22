const { ApiError } = require('../middleware/errorHandler');
function allowedOrigins() {
  return (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);
}
function originAllowed(origin) { return !origin || allowedOrigins().includes(origin); }
function corsOrigin(origin, cb) { cb(originAllowed(origin) ? null : new ApiError(403, 'ORIGIN_DENIED', 'Origin is not allowed'), originAllowed(origin)); }
function validateEnvironment() {
  for (const key of ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!process.env[key]) throw new Error(`Missing required configuration: ${key}`);
  }
  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      if (process.env[key].length < 32 || /your_|secret_here|replace_with/i.test(process.env[key])) throw new Error(`Use a strong random ${key}`);
    }
    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error('JWT secrets must differ');
    if (!process.env.CORS_ORIGIN || allowedOrigins().some(o => !/^https:\/\/[^/]+$/.test(o))) throw new Error('CORS_ORIGIN must contain exact HTTPS origins in production');
  }
}
module.exports = { allowedOrigins, originAllowed, corsOrigin, validateEnvironment };
