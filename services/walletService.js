const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

const credit = async (userId, amount, type, description, extra = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, balance: 0 } },
      { upsert: true, new: false, session }
    );
    const currentBalance = wallet ? wallet.balance : 0;
    const newBalance = currentBalance + amount;

    await Wallet.updateOne(
      { user: userId },
      {
        $set: { balance: newBalance },
        $inc: {
          totalDeposited: ['deposit', 'admin_credit', 'refund'].includes(type) ? amount : 0,
          totalEarned: type === 'sale_earning' ? amount : 0,
        },
      },
      { session }
    );

    const transaction = await Transaction.create([{
      user: userId,
      type,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: 'completed',
      description,
      ...extra,
    }], { session });

    await session.commitTransaction();
    return { balance: newBalance, transaction: transaction[0] };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const debit = async (userId, amount, type, description, extra = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = wallet.balance - amount;
    await Wallet.updateOne(
      { user: userId },
      {
        $set: { balance: newBalance },
        $inc: {
          totalSpent: type === 'purchase' ? amount : 0,
          totalWithdrawn: type === 'withdrawal' ? amount : 0,
        },
      },
      { session }
    );

    const transaction = await Transaction.create([{
      user: userId,
      type,
      amount: -amount,
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
      status: 'completed',
      description,
      ...extra,
    }], { session });

    await session.commitTransaction();
    return { balance: newBalance, transaction: transaction[0] };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = { getOrCreateWallet, credit, debit };
