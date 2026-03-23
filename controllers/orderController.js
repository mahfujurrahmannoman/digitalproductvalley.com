const Product = require('../models/Product');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const AccountStock = require('../models/AccountStock');
const Transaction = require('../models/Transaction');
const { ORDER_STATUS, STOCK_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS } = require('../config/constants');

// POST /order/create - Create order from product purchase
exports.createOrder = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const product = await Product.findById(productId).populate('category', 'name slug');

    if (!product || !product.isActive) {
      req.flash('error', 'Product not found or unavailable');
      return res.redirect('/shop');
    }

    if (qty < product.minQuantity || qty > product.maxQuantity) {
      req.flash('error', `Quantity must be between ${product.minQuantity} and ${product.maxQuantity}`);
      return res.redirect('/product/' + product.slug);
    }

    // For auto delivery, check actual AccountStock; for manual, check stockCount set by admin
    if (product.deliveryType === 'auto') {
      const availableStock = await AccountStock.countDocuments({ product: product._id, status: STOCK_STATUS.AVAILABLE });
      if (availableStock < qty) {
        req.flash('error', 'Not enough stock available');
        return res.redirect('/product/' + product.slug);
      }
    } else if (product.stockCount < qty) {
      req.flash('error', 'Not enough stock available');
      return res.redirect('/product/' + product.slug);
    }

    const totalAmount = product.price * qty;

    const order = new Order({
      user: req.user._id,
      items: [{
        product: product._id,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalAmount,
        deliveryType: product.deliveryType,
      }],
      totalAmount,
      status: ORDER_STATUS.PENDING_PAYMENT,
    });

    await order.save();

    const wallet = await Wallet.findOne({ user: req.user._id });

    res.render('checkout/payment', {
      layout: 'layouts/main',
      title: 'Checkout',
      order,
      product,
      walletBalance: wallet ? wallet.balance : 0,
    });
  } catch (err) {
    next(err);
  }
};

// POST /order/checkout - Process payment
exports.processCheckout = async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id, status: ORDER_STATUS.PENDING_PAYMENT })
      .populate('items.product');

    if (!order) {
      req.flash('error', 'Order not found or already processed');
      return res.redirect('/user/orders');
    }

    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: req.user._id });

      if (!wallet || wallet.balance < order.totalAmount) {
        req.flash('error', 'Insufficient wallet balance');
        return res.redirect('/user/wallet');
      }

      // Debit wallet
      wallet.balance -= order.totalAmount;
      wallet.totalSpent += order.totalAmount;
      await wallet.save();

      // Record transaction
      await Transaction.create({
        user: req.user._id,
        type: TRANSACTION_TYPE.PURCHASE,
        amount: order.totalAmount,
        status: TRANSACTION_STATUS.COMPLETED,
        description: `Purchase order ${order.orderNumber}`,
        reference: order._id,
        referenceModel: 'Order',
      });

      // Update order status
      order.paymentMethod = 'wallet';
      order.status = ORDER_STATUS.PAID;
      await order.save();

      // Process delivery per item
      for (const item of order.items) {
        if (item.deliveryType === 'auto') {
          // Auto delivery: grab account credentials from stock
          const stocks = await AccountStock.find({
            product: item.product._id || item.product,
            status: STOCK_STATUS.AVAILABLE,
          }).limit(item.quantity);

          if (stocks.length === item.quantity) {
            const deliveredAccounts = [];
            for (const stock of stocks) {
              stock.status = STOCK_STATUS.SOLD;
              stock.order = order._id;
              stock.soldAt = new Date();
              await stock.save();
              deliveredAccounts.push(AccountStock.decryptData(stock.accountData));
            }

            item.deliveredAccounts = deliveredAccounts;
            item.isDelivered = true;
            item.deliveredAt = new Date();

            // Update product stock count
            await Product.findByIdAndUpdate(item.product._id || item.product, {
              $inc: { stockCount: -item.quantity, totalSold: item.quantity },
            });
          }
        } else {
          // Manual delivery: decrement stock count, set to processing (admin/supplier delivers later)
          await Product.findByIdAndUpdate(item.product._id || item.product, {
            $inc: { stockCount: -item.quantity, totalSold: item.quantity },
          });
        }
      }

      // Update order delivery status
      const allDelivered = order.items.every(i => i.isDelivered);
      const someDelivered = order.items.some(i => i.isDelivered);

      if (allDelivered) {
        order.status = ORDER_STATUS.DELIVERED;
      } else if (someDelivered) {
        order.status = ORDER_STATUS.PARTIALLY_DELIVERED;
      } else {
        order.status = ORDER_STATUS.PROCESSING;
      }

      await order.save();

      return res.redirect('/order/success/' + order._id);
    }

    // For external payment gateways (aamarpay, plisio)
    order.paymentMethod = paymentMethod;
    await order.save();

    // Redirect to payment gateway routes
    return res.redirect('/payment/' + paymentMethod + '/initiate?orderId=' + order._id);
  } catch (err) {
    next(err);
  }
};

// GET /order/success/:id - Order success page
exports.orderSuccess = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.product', 'title slug image')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/user/orders');
    }

    res.render('checkout/success', {
      layout: 'layouts/main',
      title: 'Order Successful',
      order,
    });
  } catch (err) {
    next(err);
  }
};
