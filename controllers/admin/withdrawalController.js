const WithdrawalRequest = require('../../models/WithdrawalRequest');
const Wallet = require('../../models/Wallet');
const Transaction = require('../../models/Transaction');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE, WITHDRAWAL_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || '';

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const total = await WithdrawalRequest.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const withdrawals = await WithdrawalRequest.find(filter)
      .populate('supplier', 'username email')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/withdrawals/index', {
      layout: 'layouts/admin',
      title: 'Withdrawal Management',
      withdrawals,
      pagination,
      status,
      statuses: Object.values(WITHDRAWAL_STATUS),
    });
  } catch (err) {
    next(err);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawal) {
      req.flash('error', 'Withdrawal request not found');
      return res.redirect('/admin/withdrawals');
    }

    if (withdrawal.status !== 'pending') {
      req.flash('error', 'Only pending requests can be approved');
      return res.redirect('/admin/withdrawals');
    }

    withdrawal.status = 'approved';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = req.body.adminNote || '';
    await withdrawal.save();

    // Deduct from wallet
    const wallet = await Wallet.findOne({ user: withdrawal.supplier });
    if (wallet) {
      wallet.balance -= withdrawal.amount;
      wallet.totalWithdrawn += withdrawal.amount;
      await wallet.save();
    }

    // Create transaction
    await Transaction.create({
      user: withdrawal.supplier,
      type: TRANSACTION_TYPE.WITHDRAWAL,
      amount: withdrawal.amount,
      status: TRANSACTION_STATUS.COMPLETED,
      description: `Withdrawal approved - ${withdrawal.paymentMethod}`,
      reference: withdrawal._id,
    });

    req.flash('success', 'Withdrawal approved');
    res.redirect('/admin/withdrawals');
  } catch (err) {
    next(err);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawal) {
      req.flash('error', 'Withdrawal request not found');
      return res.redirect('/admin/withdrawals');
    }

    if (withdrawal.status !== 'pending') {
      req.flash('error', 'Only pending requests can be rejected');
      return res.redirect('/admin/withdrawals');
    }

    withdrawal.status = 'rejected';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = req.body.adminNote || 'Rejected by admin';
    await withdrawal.save();

    req.flash('success', 'Withdrawal rejected');
    res.redirect('/admin/withdrawals');
  } catch (err) {
    next(err);
  }
};
