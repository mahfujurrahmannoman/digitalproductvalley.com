const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');
const upload = require('../config/multer');

// New ticket form
router.get('/new', isAuthenticated, (req, res) => {
  res.render('user/ticket-new', { layout: 'layouts/main', title: 'Ask a Question' });
});

// Create ticket
router.post('/new', isAuthenticated, upload.array('attachments', 3), async (req, res) => {
  try {
    const { subject, message, priority, orderId } = req.body;
    const attachments = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      priority: priority || 'medium',
      order: orderId || undefined,
      messages: [{
        sender: req.user._id,
        message,
        attachments,
      }],
    });
    req.flash('success', `Ticket ${ticket.ticketNumber} created`);
    res.redirect(`/support/${ticket._id}`);
  } catch (err) {
    req.flash('error', 'Failed to create ticket');
    res.redirect('/support/new');
  }
});

// My tickets
router.get('/', isAuthenticated, async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id }).sort('-updatedAt').lean();
  res.render('user/tickets', { layout: 'layouts/main', title: 'My Tickets', tickets });
});

// Ticket detail
router.get('/:id', isAuthenticated, async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id })
    .populate('messages.sender', 'username role avatar');
  if (!ticket) { req.flash('error', 'Ticket not found'); return res.redirect('/support'); }
  res.render('user/ticket-detail', { layout: 'layouts/main', title: ticket.subject, ticket });
});

// Reply to ticket
router.post('/:id/reply', isAuthenticated, upload.array('attachments', 3), async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) { req.flash('error', 'Ticket not found'); return res.redirect('/support'); }
    const attachments = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    ticket.messages.push({
      sender: req.user._id,
      message: req.body.message,
      attachments,
    });
    ticket.status = 'awaiting_reply';
    await ticket.save();
    res.redirect(`/support/${ticket._id}`);
  } catch (err) {
    req.flash('error', 'Failed to send reply');
    res.redirect(`/support/${req.params.id}`);
  }
});

module.exports = router;
