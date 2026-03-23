const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema({
  gateway: { type: String, enum: ['aamarpay', 'plisio'], unique: true, required: true },
  isEnabled: { type: Boolean, default: false },
  environment: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
  storeId: String,
  signatureKey: String,
  exchangeRate: { type: Number, default: 120 },
  apiKey: String,
  webhookSecret: String,
  displayName: String,
  description: String,
}, { timestamps: true });

module.exports = mongoose.model('PaymentSetting', paymentSettingSchema);
