const { ApiKey, ApiLog } = require('../models/ApiKey');

const rateLimitStore = new Map();

const apiAuth = async (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) {
    return res.status(401).json({ success: false, error: { code: 'NO_API_KEY', message: 'API key required' } });
  }

  const apiKey = await ApiKey.findOne({ key, isActive: true }).populate('user');
  if (!apiKey || !apiKey.user || !apiKey.user.isActive) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_API_KEY', message: 'Invalid or inactive API key' } });
  }

  // Rate limiting
  const now = Date.now();
  const windowMs = 60000;
  const storeKey = apiKey._id.toString();
  if (!rateLimitStore.has(storeKey)) {
    rateLimitStore.set(storeKey, []);
  }
  const timestamps = rateLimitStore.get(storeKey).filter(t => t > now - windowMs);
  if (timestamps.length >= apiKey.rateLimit) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    });
  }
  timestamps.push(now);
  rateLimitStore.set(storeKey, timestamps);

  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  req.apiKey = apiKey;
  req.apiUser = apiKey.user;

  // Log request
  const startTime = Date.now();
  res.on('finish', async () => {
    try {
      await ApiLog.create({
        apiKey: apiKey._id,
        user: apiKey.user._id,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime,
        ipAddress: req.ip,
      });
    } catch (e) { /* ignore logging errors */ }
  });

  next();
};

module.exports = apiAuth;
