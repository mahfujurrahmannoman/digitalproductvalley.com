const Order = require('../../models/Order');
const AccountStock = require('../../models/AccountStock');
const Wallet = require('../../models/Wallet');
const Transaction = require('../../models/Transaction');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE, ORDER_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    const total = await Order.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const orders = await Order.find(filter)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/orders/index', {
      layout: 'layouts/admin',
      title: 'Order Management',
      orders,
      pagination,
      status,
      dateFrom,
      dateTo,
      statuses: Object.values(ORDER_STATUS),
    });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'username email')
      .populate('items.product', 'title slug price deliveryType')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    res.render('admin/orders/detail', {
      layout: 'layouts/admin',
      title: `Order ${order.orderNumber}`,
      order,
    });
  } catch (err) {
    next(err);
  }
};

exports.manualDeliver = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    const { itemId, deliveryData } = req.body;

    if (itemId) {
      // Deliver specific item
      const item = order.items.id(itemId);
      if (item && !item.isDelivered) {
        const accounts = deliveryData ? deliveryData.split('\n').map(l => l.trim()).filter(Boolean) : [];
        item.deliveredAccounts = accounts;
        item.isDelivered = true;
        item.deliveredAt = new Date();
      }
    } else {
      // Mark entire order delivered
      order.items.forEach(item => {
        if (!item.isDelivered) {
          item.isDelivered = true;
          item.deliveredAt = new Date();
        }
      });
    }

    // Check if all items delivered
    const allDelivered = order.items.every(i => i.isDelivered);
    const someDelivered = order.items.some(i => i.isDelivered);
    if (allDelivered) {
      order.status = 'delivered';
    } else if (someDelivered) {
      order.status = 'partially_delivered';
    }

    await order.save();
    req.flash('success', 'Order delivery updated');
    res.redirect(`/admin/orders/${order._id}`);
  } catch (err) {
    next(err);
  }
};

exports.refund = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    if (order.status === 'refunded') {
      req.flash('error', 'Order already refunded');
      return res.redirect(`/admin/orders/${order._id}`);
    }

    // Refund to wallet
    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = await Wallet.create({ user: order.user, balance: 0 });
    }

    wallet.balance += order.totalAmount;
    await wallet.save();

    // Create refund transaction
    await Transaction.create({
      user: order.user,
      type: TRANSACTION_TYPE.REFUND,
      amount: order.totalAmount,
      status: TRANSACTION_STATUS.COMPLETED,
      description: `Refund for order ${order.orderNumber}`,
      reference: order._id,
    });

    order.status = 'refunded';
    await order.save();

    req.flash('success', `$${order.totalAmount.toFixed(2)} refunded to user wallet`);
    res.redirect(`/admin/orders/${order._id}`);
  } catch (err) {
    next(err);
  }
};
