const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { ApiKey } = require('../models/ApiKey');
const PaymentSetting = require('../models/PaymentSetting');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');

// Profile validation
const profileValidation = [
  body('firstName').optional().trim().isLength({ max: 50 }).withMessage('First name too long'),
  body('lastName').optional().trim().isLength({ max: 50 }).withMessage('Last name too long'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number too long'),
  body('currentPassword').optional(),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('confirmNewPassword')
    .optional()
    .custom((value, { req }) => {
      if (req.body.newPassword && value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// GET /user/dashboard
const getDashboard = async (req, res) => {
  try {
    const wallet = await walletService.getOrCreateWallet(req.user._id);

    const recentOrders = await Order.find({ user: req.user._id })
      .sort('-createdAt')
      .limit(5)
      .populate('items.product', 'name slug')
      .lean();

    const orderStats = await Order.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
          },
          pendingOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending_payment', 'paid', 'processing']] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      completedOrders: 0,
      pendingOrders: 0,
    };

    const recentNotifications = await notificationService.getRecent(req.user._id, 5);

    res.render('user/dashboard', {
      title: 'Dashboard',
      wallet,
      recentOrders,
      stats,
      recentNotifications,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
};

// GET /user/orders
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'name slug')
        .lean(),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('user/orders', {
      title: 'My Orders',
      orders,
      pagination: {
        page,
        totalPages,
        total,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      queryString: req.query.status ? `&status=${req.query.status}` : '',
      currentStatus: req.query.status || '',
    });
  } catch (err) {
    console.error('Orders error:', err);
    req.flash('error', 'Failed to load orders');
    res.redirect('/user/dashboard');
  }
};

// GET /user/orders/:id
const getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate('items.product', 'name slug category')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/user/orders');
    }

    res.render('user/order-detail', {
      title: `Order ${order.orderNumber}`,
      order,
    });
  } catch (err) {
    console.error('Order detail error:', err);
    req.flash('error', 'Failed to load order');
    res.redirect('/user/orders');
  }
};

// GET /user/wallet
const getWallet = async (req, res) => {
  try {
    const wallet = await walletService.getOrCreateWallet(req.user._id);

    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ user: req.user._id }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const paymentSettings = await PaymentSetting.find({ isEnabled: true }).lean();

    res.render('user/wallet', {
      title: 'Wallet',
      wallet,
      transactions,
      paymentSettings,
      pagination: {
        page,
        totalPages,
        total,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (err) {
    console.error('Wallet error:', err);
    req.flash('error', 'Failed to load wallet');
    res.redirect('/user/dashboard');
  }
};

// GET /user/profile
const getProfile = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user._id).lean();
    const apiKeys = await ApiKey.find({ user: req.user._id }).sort('-createdAt').lean();

    res.render('user/profile', {
      title: 'Edit Profile',
      profile: userDoc,
      apiKeys,
      errors: [],
    });
  } catch (err) {
    console.error('Profile error:', err);
    req.flash('error', 'Failed to load profile');
    res.redirect('/user/dashboard');
  }
};

// POST /user/profile
const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const userDoc = await User.findById(req.user._id).lean();
    return res.render('user/profile', {
      title: 'Edit Profile',
      profile: userDoc,
      errors: errors.array(),
    });
  }

  try {
    const { firstName, lastName, phone, currentPassword, newPassword } = req.body;

    const userDoc = await User.findById(req.user._id);

    userDoc.firstName = firstName || '';
    userDoc.lastName = lastName || '';
    userDoc.phone = phone || '';

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.render('user/profile', {
          title: 'Edit Profile',
          profile: userDoc.toObject(),
          errors: [{ msg: 'Current password is required to change password' }],
        });
      }

      const isMatch = await userDoc.comparePassword(currentPassword);
      if (!isMatch) {
        return res.render('user/profile', {
          title: 'Edit Profile',
          profile: userDoc.toObject(),
          errors: [{ msg: 'Current password is incorrect' }],
        });
      }

      userDoc.password = newPassword;
    }

    await userDoc.save();

    req.flash('success', 'Profile updated successfully');
    res.redirect('/user/profile');
  } catch (err) {
    console.error('Profile update error:', err);
    req.flash('error', 'Failed to update profile');
    res.redirect('/user/profile');
  }
};

// GET /user/notifications
const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: req.user._id }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('user/notifications', {
      title: 'Notifications',
      notifications,
      pagination: {
        page,
        totalPages,
        total,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (err) {
    console.error('Notifications error:', err);
    req.flash('error', 'Failed to load notifications');
    res.redirect('/user/dashboard');
  }
};

// POST /user/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    req.flash('success', 'All notifications marked as read');
    res.redirect('/user/notifications');
  } catch (err) {
    console.error('Mark notifications error:', err);
    req.flash('error', 'Failed to mark notifications as read');
    res.redirect('/user/notifications');
  }
};

// POST /user/api-keys
const createApiKey = async (req, res) => {
  try {
    const { name } = req.body;

    const existingCount = await ApiKey.countDocuments({ user: req.user._id });
    if (existingCount >= 5) {
      req.flash('error', 'Maximum 5 API keys allowed');
      return res.redirect('/user/profile');
    }

    const key = ApiKey.generateKey();

    await ApiKey.create({
      user: req.user._id,
      key,
      name: name || 'Default',
    });

    req.flash('success', `API key created: ${key}. Copy it now, it won't be shown again in full.`);
    res.redirect('/user/profile');
  } catch (err) {
    console.error('API key create error:', err);
    req.flash('error', 'Failed to create API key');
    res.redirect('/user/profile');
  }
};

// DELETE /user/api-keys/:id
const deleteApiKey = async (req, res) => {
  try {
    const result = await ApiKey.deleteOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      req.flash('error', 'API key not found');
    } else {
      req.flash('success', 'API key deleted successfully');
    }

    res.redirect('/user/profile');
  } catch (err) {
    console.error('API key delete error:', err);
    req.flash('error', 'Failed to delete API key');
    res.redirect('/user/profile');
  }
};

module.exports = {
  profileValidation,
  getDashboard,
  getOrders,
  getOrderDetail,
  getWallet,
  getProfile,
  updateProfile,
  getNotifications,
  markAllNotificationsRead,
  createApiKey,
  deleteApiKey,
};
