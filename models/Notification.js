const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['order_placed', 'order_delivered', 'order_cancelled', 'deposit_success',
      'withdrawal_approved', 'withdrawal_rejected', 'ticket_reply', 'new_sale',
      'stock_low', 'system', 'supplier_approved'],
  },
  title: String,
  message: String,
  link: String,
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
