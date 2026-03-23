const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const accountStockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accountData: { type: String, required: true },
  status: { type: String, enum: ['available', 'sold', 'reserved', 'invalid'], default: 'available' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  soldAt: Date,
}, { timestamps: true });

accountStockSchema.index({ product: 1, status: 1 });
accountStockSchema.index({ order: 1 });

accountStockSchema.methods.encrypt = function () {
  this.accountData = CryptoJS.AES.encrypt(this.accountData, process.env.ENCRYPTION_KEY).toString();
  return this;
};

accountStockSchema.methods.decrypt = function () {
  const bytes = CryptoJS.AES.decrypt(this.accountData, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

accountStockSchema.statics.decryptData = function (encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = mongoose.model('AccountStock', accountStockSchema);
