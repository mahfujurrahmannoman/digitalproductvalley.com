const express = require('express');
const router = express.Router();
const { isAuthenticated, isSupplier } = require('../middleware/auth');
const upload = require('../config/multer');
const User = require('../models/User');
const Product = require('../models/Product');
const AccountStock = require('../models/AccountStock');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const CryptoJS = require('crypto-js');
const { paginate } = require('../utils/helpers');
const { ITEMS_PER_PAGE } = require('../config/constants');
const walletService = require('../services/walletService');

// Apply page
router.get('/apply', isAuthenticated, (req, res) => {
  if (req.user.role === 'supplier') {
    return res.redirect('/supplier/dashboard');
  }
  res.render('supplier/apply', { layout: 'layouts/main', title: 'Become a Supplier' });
});

router.post('/apply', isAuthenticated, async (req, res) => {
  try {
    const { companyName, description } = req.body;
    await User.updateOne({ _id: req.user._id }, {
      'supplierInfo.companyName': companyName,
      'supplierInfo.description': description,
      'supplierInfo.isApproved': false,
    });
    req.flash('success', 'Your supplier application has been submitted for review');
    res.redirect('/user/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to submit application');
    res.redirect('/supplier/apply');
  }
});

// Supplier dashboard
router.get('/dashboard', isAuthenticated, isSupplier, async (req, res) => {
  const products = await Product.countDocuments({ supplier: req.user._id });
  const orders = await Order.countDocuments({ 'items.product': { $in: await Product.find({ supplier: req.user._id }).distinct('_id') } });
  const wallet = await walletService.getOrCreateWallet(req.user._id);
  const recentOrders = await Order.find({
    'items.product': { $in: await Product.find({ supplier: req.user._id }).distinct('_id') },
  }).sort('-createdAt').limit(5).populate('user', 'username');

  res.render('supplier/dashboard', {
    layout: 'layouts/main',
    title: 'Supplier Dashboard',
    stats: { products, orders, balance: wallet.balance, totalEarnings: wallet.totalEarned },
    recentOrders,
  });
});

// Supplier products
router.get('/products', isAuthenticated, isSupplier, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const total = await Product.countDocuments({ supplier: req.user._id });
  const products = await Product.find({ supplier: req.user._id })
    .populate('category', 'name')
    .sort('-createdAt')
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .lean();
  res.render('supplier/products', {
    layout: 'layouts/main',
    title: 'My Products',
    products,
    pagination: paginate(page, ITEMS_PER_PAGE, total),
  });
});

// Create product
router.get('/products/new', isAuthenticated, isSupplier, async (req, res) => {
  const categories = await Category.getTree();
  res.render('supplier/product-form', {
    layout: 'layouts/main',
    title: 'New Product',
    product: null,
    categories,
  });
});

router.post('/products', isAuthenticated, isSupplier, upload.single('image'), async (req, res) => {
  try {
    const data = req.body;
    const product = new Product({
      title: data.title,
      description: data.description,
      shortDescription: data.shortDescription,
      category: data.category,
      supplier: req.user._id,
      price: parseFloat(data.price),
      minQuantity: parseInt(data.minQuantity) || 1,
      maxQuantity: parseInt(data.maxQuantity) || 100,
      deliveryType: data.deliveryType,
      accountDetails: {
        accountAge: data.accountAge,
        region: data.region,
        verification: data.verification,
        format: data.format,
        features: data.features ? data.features.split(',').map(f => f.trim()) : [],
      },
      image: req.file ? '/uploads/' + req.file.filename : null,
    });
    await product.save();

    // Add stock if provided
    if (data.stockData && data.stockData.trim()) {
      const lines = data.stockData.split('\n').filter(l => l.trim());
      const stocks = lines.map(line => ({
        product: product._id,
        supplier: req.user._id,
        accountData: CryptoJS.AES.encrypt(line.trim(), process.env.ENCRYPTION_KEY).toString(),
      }));
      await AccountStock.insertMany(stocks);
      product.stockCount = lines.length;
      await product.save();
    }

    req.flash('success', 'Product created successfully');
    res.redirect('/supplier/products');
  } catch (err) {
    req.flash('error', 'Failed to create product: ' + err.message);
    res.redirect('/supplier/products/new');
  }
});

// Edit product
router.get('/products/:id/edit', isAuthenticated, isSupplier, async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, supplier: req.user._id });
  if (!product) { req.flash('error', 'Product not found'); return res.redirect('/supplier/products'); }
  const categories = await Category.getTree();
  res.render('supplier/product-form', {
    layout: 'layouts/main',
    title: 'Edit Product',
    product,
    categories,
  });
});

router.post('/products/:id', isAuthenticated, isSupplier, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, supplier: req.user._id });
    if (!product) { req.flash('error', 'Product not found'); return res.redirect('/supplier/products'); }

    const data = req.body;
    Object.assign(product, {
      title: data.title,
      description: data.description,
      shortDescription: data.shortDescription,
      category: data.category,
      price: parseFloat(data.price),
      minQuantity: parseInt(data.minQuantity) || 1,
      maxQuantity: parseInt(data.maxQuantity) || 100,
      deliveryType: data.deliveryType,
      accountDetails: {
        accountAge: data.accountAge,
        region: data.region,
        verification: data.verification,
        format: data.format,
        features: data.features ? data.features.split(',').map(f => f.trim()) : [],
      },
    });
    if (req.file) product.image = '/uploads/' + req.file.filename;
    await product.save();

    req.flash('success', 'Product updated');
    res.redirect('/supplier/products');
  } catch (err) {
    req.flash('error', 'Failed to update product');
    res.redirect(`/supplier/products/${req.params.id}/edit`);
  }
});

// Manage stock
router.get('/products/:id/stock', isAuthenticated, isSupplier, async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, supplier: req.user._id });
  if (!product) { req.flash('error', 'Product not found'); return res.redirect('/supplier/products'); }
  const availableCount = await AccountStock.countDocuments({ product: product._id, status: 'available' });
  res.render('supplier/stock-manage', {
    layout: 'layouts/main',
    title: 'Manage Stock - ' + product.title,
    product,
    availableCount,
  });
});

router.post('/products/:id/stock', isAuthenticated, isSupplier, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, supplier: req.user._id });
    if (!product) { req.flash('error', 'Product not found'); return res.redirect('/supplier/products'); }

    const { stockType, stockData, manualStockCount } = req.body;

    if (stockType === 'manual') {
      // Manual delivery: just set stock count
      product.stockCount = parseInt(manualStockCount) || 0;
      await product.save();
      req.flash('success', `Stock count set to ${product.stockCount}`);
    } else {
      // Auto delivery: add encrypted credentials
      const lines = stockData.split('\n').filter(l => l.trim());
      const stocks = lines.map(line => ({
        product: product._id,
        supplier: req.user._id,
        accountData: CryptoJS.AES.encrypt(line.trim(), process.env.ENCRYPTION_KEY).toString(),
      }));
      await AccountStock.insertMany(stocks);

      const newCount = await AccountStock.countDocuments({ product: product._id, status: 'available' });
      product.stockCount = newCount;
      await product.save();

      req.flash('success', `Added ${lines.length} accounts to stock`);
    }

    res.redirect(`/supplier/products/${req.params.id}/stock`);
  } catch (err) {
    req.flash('error', 'Failed to update stock');
    res.redirect(`/supplier/products/${req.params.id}/stock`);
  }
});

// Supplier orders
router.get('/orders', isAuthenticated, isSupplier, async (req, res) => {
  const productIds = await Product.find({ supplier: req.user._id }).distinct('_id');
  const page = parseInt(req.query.page) || 1;
  const filter = { 'items.product': { $in: productIds } };
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort('-createdAt')
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .populate('user', 'username')
    .lean();
  res.render('supplier/orders', {
    layout: 'layouts/main',
    title: 'Orders',
    orders,
    pagination: paginate(page, ITEMS_PER_PAGE, total),
  });
});

// Manual delivery
router.post('/orders/:id/deliver', isAuthenticated, isSupplier, async (req, res) => {
  try {
    const { itemIndex, accountData } = req.body;
    const deliveryService = require('../services/deliveryService');
    await deliveryService.processManualDelivery(req.params.id, parseInt(itemIndex), accountData.split('\n').filter(l => l.trim()));
    req.flash('success', 'Order delivered');
    res.redirect('/supplier/orders');
  } catch (err) {
    req.flash('error', 'Delivery failed: ' + err.message);
    res.redirect('/supplier/orders');
  }
});

// Earnings
router.get('/earnings', isAuthenticated, isSupplier, async (req, res) => {
  const wallet = await walletService.getOrCreateWallet(req.user._id);
  const page = parseInt(req.query.page) || 1;
  const total = await Transaction.countDocuments({ user: req.user._id, type: 'sale_earning' });
  const transactions = await Transaction.find({ user: req.user._id, type: 'sale_earning' })
    .sort('-createdAt')
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .lean();
  res.render('supplier/earnings', {
    layout: 'layouts/main',
    title: 'Earnings',
    wallet,
    transactions,
    pagination: paginate(page, ITEMS_PER_PAGE, total),
  });
});

// Withdrawals
router.get('/withdrawals', isAuthenticated, isSupplier, async (req, res) => {
  const withdrawals = await WithdrawalRequest.find({ supplier: req.user._id }).sort('-createdAt').lean();
  const wallet = await walletService.getOrCreateWallet(req.user._id);
  res.render('supplier/withdrawals', {
    layout: 'layouts/main',
    title: 'Withdrawals',
    withdrawals,
    wallet,
  });
});

router.post('/withdrawals', isAuthenticated, isSupplier, async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const wallet = await walletService.getOrCreateWallet(req.user._id);
    if (wallet.balance < parseFloat(amount)) {
      req.flash('error', 'Insufficient balance');
      return res.redirect('/supplier/withdrawals');
    }
    await WithdrawalRequest.create({
      supplier: req.user._id,
      amount: parseFloat(amount),
      paymentMethod,
      paymentDetails,
    });
    req.flash('success', 'Withdrawal request submitted');
    res.redirect('/supplier/withdrawals');
  } catch (err) {
    req.flash('error', 'Failed to submit withdrawal request');
    res.redirect('/supplier/withdrawals');
  }
});

module.exports = router;
