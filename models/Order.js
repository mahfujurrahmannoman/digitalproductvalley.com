const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  deliveryType: { type: String, enum: ['auto', 'manual'] },
  deliveredAccounts: [String],
  isDelivered: { type: Boolean, default: false },
  deliveredAt: Date,
  supplierEarning: { type: Number, default: 0 },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'processing', 'delivered', 'partially_delivered', 'cancelled', 'refunded', 'disputed'],
    default: 'pending_payment',
  },
  paymentMethod: { type: String, enum: ['wallet', 'aamarpay', 'plisio'] },
  paymentId: String,
  paymentDetails: mongoose.Schema.Types.Mixed,
  notes: String,
}, { timestamps: true });

orderSchema.index({ user: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

orderSchema.pre('save', function () {
  if (!this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderNumber = `ORD-${dateStr}-${rand}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
