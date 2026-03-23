const mongoose = require('mongoose');
const AccountStock = require('../models/AccountStock');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const walletService = require('./walletService');

const processAutoDelivery = async (order) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let allDelivered = true;

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      if (item.deliveryType !== 'auto' || item.isDelivered) continue;

      const stocks = await AccountStock.find({
        product: item.product,
        status: 'available',
      }).limit(item.quantity).session(session);

      if (stocks.length < item.quantity) {
        allDelivered = false;
        continue;
      }

      const deliveredAccounts = [];
      for (const stock of stocks) {
        stock.status = 'sold';
        stock.order = order._id;
        stock.soldAt = new Date();
        await stock.save({ session });
        deliveredAccounts.push(AccountStock.decryptData(stock.accountData));
      }

      order.items[i].deliveredAccounts = deliveredAccounts;
      order.items[i].isDelivered = true;
      order.items[i].deliveredAt = new Date();

      await Product.updateOne(
        { _id: item.product },
        { $inc: { stockCount: -item.quantity, totalSold: item.quantity } },
        { session }
      );

      // Credit supplier earnings
      const product = await Product.findById(item.product).session(session);
      if (product && product.supplier) {
        const earning = item.supplierEarning || item.totalPrice * 0.9;
        await walletService.credit(product.supplier, earning, 'sale_earning',
          `Sale: ${item.quantity}x ${product.title}`, { reference: order.orderNumber });
      }
    }

    const hasManual = order.items.some(i => i.deliveryType === 'manual');
    if (allDelivered && !hasManual) {
      order.status = 'delivered';
    } else if (order.items.some(i => i.isDelivered)) {
      order.status = 'partially_delivered';
    } else {
      order.status = 'processing';
    }

    await order.save({ session });
    await session.commitTransaction();

    // Notify user
    await Notification.create({
      user: order.user,
      type: 'order_delivered',
      title: 'Order Delivered',
      message: `Your order ${order.orderNumber} has been delivered`,
      link: `/user/orders/${order._id}`,
    });

    return order;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const processManualDelivery = async (orderId, itemIndex, accountData) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.items[itemIndex].deliveredAccounts = accountData;
  order.items[itemIndex].isDelivered = true;
  order.items[itemIndex].deliveredAt = new Date();

  const allDelivered = order.items.every(i => i.isDelivered);
  order.status = allDelivered ? 'delivered' : 'partially_delivered';
  await order.save();

  await Notification.create({
    user: order.user,
    type: 'order_delivered',
    title: 'Order Updated',
    message: `Your order ${order.orderNumber} has been updated with delivery details`,
    link: `/user/orders/${order._id}`,
  });

  return order;
};

module.exports = { processAutoDelivery, processManualDelivery };
