const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, unique: true, required: true },
  name: { type: String, default: 'Default' },
  isActive: { type: Boolean, default: true },
  rateLimit: { type: Number, default: 60 },
  permissions: [String],
  lastUsedAt: Date,
}, { timestamps: true });

apiKeySchema.statics.generateKey = function () {
  return 'acz_' + crypto.randomBytes(32).toString('hex');
};

const apiLogSchema = new mongoose.Schema({
  apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  endpoint: String,
  method: String,
  statusCode: Number,
  responseTime: Number,
  ipAddress: String,
}, { timestamps: true });

apiLogSchema.index({ apiKey: 1, createdAt: -1 });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const ApiLog = mongoose.model('ApiLog', apiLogSchema);

module.exports = { ApiKey, ApiLog };
