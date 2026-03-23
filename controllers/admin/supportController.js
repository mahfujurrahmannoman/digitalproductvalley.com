const SupportTicket = require('../../models/SupportTicket');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE, TICKET_STATUS } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || '';

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const total = await SupportTicket.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const tickets = await SupportTicket.find(filter)
      .populate('user', 'username email')
      .sort({ updatedAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/support/index', {
      layout: 'layouts/admin',
      title: 'Support Tickets',
      tickets,
      pagination,
      status,
      statuses: Object.values(TICKET_STATUS),
    });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'username email avatar')
      .populate('order', 'orderNumber')
      .populate('messages.sender', 'username avatar role');

    if (!ticket) {
      req.flash('error', 'Ticket not found');
      return res.redirect('/admin/support');
    }

    res.render('admin/support/detail', {
      layout: 'layouts/admin',
      title: `Ticket: ${ticket.ticketNumber}`,
      ticket,
      statuses: Object.values(TICKET_STATUS),
    });
  } catch (err) {
    next(err);
  }
};

exports.reply = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      req.flash('error', 'Ticket not found');
      return res.redirect('/admin/support');
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      req.flash('error', 'Message cannot be empty');
      return res.redirect(`/admin/support/${ticket._id}`);
    }

    ticket.messages.push({
      sender: req.user._id,
      message: message.trim(),
      isAdminReply: true,
    });

    ticket.status = 'awaiting_reply';
    await ticket.save();

    req.flash('success', 'Reply sent');
    res.redirect(`/admin/support/${ticket._id}`);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.values(TICKET_STATUS).includes(status)) {
      req.flash('error', 'Invalid status');
      return res.redirect(`/admin/support/${req.params.id}`);
    }

    await SupportTicket.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', 'Ticket status updated');
    res.redirect(`/admin/support/${req.params.id}`);
  } catch (err) {
    next(err);
  }
};
