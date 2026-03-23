const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Wallet = require('../../models/Wallet');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const approval = req.query.approval || '';

    const filter = { role: 'supplier' };
    if (approval === 'approved') {
      filter['supplierInfo.isApproved'] = true;
    } else if (approval === 'pending') {
      filter['supplierInfo.isApproved'] = false;
    }

    const total = await User.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const suppliers = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/suppliers/index', {
      layout: 'layouts/admin',
      title: 'Supplier Management',
      suppliers,
      pagination,
      approval,
    });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const supplier = await User.findById(req.params.id).lean();
    if (!supplier || supplier.role !== 'supplier') {
      req.flash('error', 'Supplier not found');
      return res.redirect('/admin/suppliers');
    }

    const [products, wallet, totalOrders] = await Promise.all([
      Product.find({ supplier: supplier._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Wallet.findOne({ user: supplier._id }).lean(),
      Order.countDocuments({ 'items.product': { $in: await Product.find({ supplier: supplier._id }).distinct('_id') } }),
    ]);

    res.render('admin/suppliers/detail', {
      layout: 'layouts/admin',
      title: `Supplier: ${supplier.username}`,
      supplier,
      products,
      wallet: wallet || { balance: 0, totalEarned: 0, totalWithdrawn: 0 },
      totalOrders,
    });
  } catch (err) {
    next(err);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'supplier') {
      req.flash('error', 'Supplier not found');
      return res.redirect('/admin/suppliers');
    }

    user.supplierInfo.isApproved = true;
    user.supplierInfo.approvedAt = new Date();
    if (req.body.commissionRate) {
      user.supplierInfo.commissionRate = parseFloat(req.body.commissionRate);
    }
    await user.save();

    req.flash('success', 'Supplier approved');
    res.redirect(`/admin/suppliers/${user._id}`);
  } catch (err) {
    next(err);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'supplier') {
      req.flash('error', 'Supplier not found');
      return res.redirect('/admin/suppliers');
    }

    user.supplierInfo.isApproved = false;
    user.role = 'customer';
    await user.save();

    req.flash('success', 'Supplier application rejected');
    res.redirect('/admin/suppliers');
  } catch (err) {
    next(err);
  }
};
