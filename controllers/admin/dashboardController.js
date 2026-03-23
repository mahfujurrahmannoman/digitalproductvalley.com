const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const SupportTicket = require('../../models/SupportTicket');
const WithdrawalRequest = require('../../models/WithdrawalRequest');

exports.index = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Parallel stat queries
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      ordersToday,
      openTickets,
      pendingWithdrawals,
      totalRevenueAgg,
      revenueChartData,
      recentOrders,
      pendingSuppliers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, isBanned: false }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      WithdrawalRequest.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: { $in: ['paid', 'delivered', 'partially_delivered'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Revenue chart: last 30 days
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { $in: ['paid', 'delivered', 'partially_delivered'] },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'username email')
        .lean(),
      User.countDocuments({ role: 'supplier', 'supplierInfo.isApproved': false }),
    ]);

    const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

    // Fill in missing days for chart
    const chartLabels = [];
    const chartValues = [];
    const revenueMap = {};
    revenueChartData.forEach(d => { revenueMap[d._id] = d.revenue; });
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      chartLabels.push(key);
      chartValues.push(revenueMap[key] || 0);
    }

    res.render('admin/dashboard', {
      layout: 'layouts/admin',
      title: 'Dashboard',
      stats: {
        totalRevenue,
        ordersToday,
        activeUsers,
        openTickets,
        totalUsers,
        totalProducts,
        pendingWithdrawals,
        pendingSuppliers,
      },
      chart: { labels: chartLabels, values: chartValues },
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
};
