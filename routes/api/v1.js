const express = require('express');
const router = express.Router();
const apiAuth = require('../../middleware/apiAuth');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Order = require('../../models/Order');
const AccountStock = require('../../models/AccountStock');
const Wallet = require('../../models/Wallet');
const walletService = require('../../services/walletService');
const deliveryService = require('../../services/deliveryService');
const { success, error } = require('../../utils/apiResponse');

// All routes require API key
router.use(apiAuth);

// List products
router.get('/products', async (req, res) => {
  try {
    const { category, search, in_stock, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }
    if (search) filter.$text = { $search: search };
    if (in_stock === 'true') filter.stockCount = { $gt: 0 };

    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .select('-__v')
      .populate('category', 'name slug')
      .sort('-createdAt')
      .skip((p - 1) * l)
      .limit(l)
      .lean();

    success(res, products, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

// Product detail
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true })
      .populate('category', 'name slug').lean();
    if (!product) return error(res, 'NOT_FOUND', 'Product not found', 404);
    success(res, product);
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

// Categories
router.get('/categories', async (req, res) => {
  try {
    const tree = await Category.getTree();
    success(res, tree);
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

// Create order (wallet purchase)
router.post('/orders', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = parseInt(quantity);
    if (!productId) return error(res, 'MISSING_FIELD', 'productId is required');

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) return error(res, 'NOT_FOUND', 'Product not found', 404);
    if (product.stockCount < qty && product.deliveryType === 'auto') {
      return error(res, 'OUT_OF_STOCK', 'Not enough stock');
    }

    const totalAmount = product.price * qty;
    const wallet = await walletService.getOrCreateWallet(req.apiUser._id);
    if (wallet.balance < totalAmount) {
      return error(res, 'INSUFFICIENT_BALANCE', `Need $${totalAmount}, have $${wallet.balance}`);
    }

    // Debit wallet
    await walletService.debit(req.apiUser._id, totalAmount, 'purchase', `API Purchase: ${product.title} x${qty}`);

    // Create order
    const commissionRate = req.apiUser.supplierInfo?.commissionRate || 10;
    const supplierEarning = product.supplier ? totalAmount * (1 - commissionRate / 100) : 0;

    const order = await Order.create({
      user: req.apiUser._id,
      items: [{
        product: product._id,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalAmount,
        deliveryType: product.deliveryType,
        supplierEarning,
      }],
      totalAmount,
      status: 'paid',
      paymentMethod: 'wallet',
    });

    // Process delivery
    if (product.deliveryType === 'auto') {
      await deliveryService.processAutoDelivery(order);
    }

    const updatedOrder = await Order.findById(order._id).lean();
    success(res, updatedOrder, 201);
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

// List user orders
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { user: req.apiUser._id };
    if (status) filter.status = status;

    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter).sort('-createdAt').skip((p - 1) * l).limit(l).lean();
    success(res, orders, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

// Order detail
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.apiUser._id }).lean();
    if (!order) return error(res, 'NOT_FOUND', 'Order not found', 404);
    success(res, order);
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

// Wallet balance
router.get('/balance', async (req, res) => {
  try {
    const wallet = await walletService.getOrCreateWallet(req.apiUser._id);
    success(res, { balance: wallet.balance });
  } catch (err) {
    error(res, 'SERVER_ERROR', err.message, 500);
  }
});

module.exports = router;
