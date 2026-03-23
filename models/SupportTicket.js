const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  attachments: [String],
  isAdminReply: { type: Boolean, default: false },
}, { timestamps: true });

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  subject: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'awaiting_reply', 'resolved', 'closed'], default: 'open' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [ticketMessageSchema],
}, { timestamps: true });

supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ status: 1 });

supportTicketSchema.pre('save', function () {
  if (!this.ticketNumber) {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.ticketNumber = `TKT-${rand}`;
  }
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
