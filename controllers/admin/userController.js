const User = require('../../models/User');
const Order = require('../../models/Order');
const Wallet = require('../../models/Wallet');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE, ROLES } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) {
      filter.role = role;
    }

    const total = await User.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/users/index', {
      layout: 'layouts/admin',
      title: 'User Management',
      users,
      pagination,
      search,
      role,
      roles: Object.values(ROLES),
    });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    const [orders, wallet] = await Promise.all([
      Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Wallet.findOne({ user: user._id }).lean(),
    ]);

    res.render('admin/users/detail', {
      layout: 'layouts/admin',
      title: `User: ${user.username}`,
      profileUser: user,
      orders,
      wallet: wallet || { balance: 0, totalDeposited: 0, totalSpent: 0, totalEarned: 0 },
      roles: Object.values(ROLES),
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    user.isBanned = !user.isBanned;
    user.banReason = user.isBanned ? (req.body.banReason || 'Banned by admin') : '';
    await user.save();

    req.flash('success', user.isBanned ? 'User has been banned' : 'User has been unbanned');
    res.redirect(`/admin/users/${user._id}`);
  } catch (err) {
    next(err);
  }
};

exports.changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) {
      req.flash('error', 'Invalid role');
      return res.redirect(`/admin/users/${req.params.id}`);
    }

    await User.findByIdAndUpdate(req.params.id, { role });
    req.flash('success', 'User role updated');
    res.redirect(`/admin/users/${req.params.id}`);
  } catch (err) {
    next(err);
  }
};
