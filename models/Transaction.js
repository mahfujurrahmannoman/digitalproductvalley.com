const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['deposit', 'purchase', 'sale_earning', 'withdrawal', 'refund', 'admin_credit', 'admin_debit'],
    required: true,
  },
  amount: { type: Number, required: true },
  balanceBefore: Number,
  balanceAfter: Number,
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  reference: String,
  gateway: String,
  gatewayTransactionId: String,
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ gateway: 1, gatewayTransactionId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
