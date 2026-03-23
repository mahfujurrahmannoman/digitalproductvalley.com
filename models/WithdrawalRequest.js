const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  paymentMethod: { type: String, required: true },
  paymentDetails: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  adminNote: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
}, { timestamps: true });

withdrawalRequestSchema.index({ supplier: 1 });
withdrawalRequestSchema.index({ status: 1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
