const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  balance: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
