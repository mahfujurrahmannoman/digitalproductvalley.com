const cron = require('node-cron');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AccountStock = require('../models/AccountStock');

// Cancel unpaid orders older than 30 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const expired = await Order.find({
      status: 'pending_payment',
      createdAt: { $lt: thirtyMinAgo },
    });

    for (const order of expired) {
      // Release reserved stock
      for (const item of order.items) {
        await AccountStock.updateMany(
          { order: order._id, status: 'reserved' },
          { status: 'available', order: null }
        );
        const count = await AccountStock.countDocuments({ product: item.product, status: 'available' });
        await Product.updateOne({ _id: item.product }, { stockCount: count });
      }
      order.status = 'cancelled';
      await order.save();
    }

    if (expired.length > 0) {
      console.log(`Cancelled ${expired.length} expired orders`);
    }
  } catch (err) {
    console.error('Cron error (cancel orders):', err);
  }
});

console.log('Cron jobs started');
