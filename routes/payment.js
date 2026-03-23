const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const walletService = require('../services/walletService');
const paymentService = require('../services/paymentService');
const aamarpayService = require('../services/aamarpayService');
const plisioService = require('../services/plisioService');

// Initiate deposit
router.post('/deposit', isAuthenticated, async (req, res) => {
  try {
    const { amount, gateway } = req.body;
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount < 1) {
      req.flash('error', 'Minimum deposit is $1');
      return res.redirect('/user/wallet');
    }

    const transactionId = 'DEP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Create pending transaction
    await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount: depositAmount,
      status: 'pending',
      gateway,
      gatewayTransactionId: transactionId,
      description: `Wallet deposit via ${gateway}`,
    });

    const baseUrl = process.env.BASE_URL;

    if (gateway === 'aamarpay') {
      const result = await aamarpayService.initiatePayment({
        transactionId,
        amount: depositAmount,
        customerName: req.user.username,
        customerEmail: req.user.email,
        customerPhone: req.user.phone || '01700000000',
        successUrl: `${baseUrl}/payment/success?txn=${transactionId}`,
        failUrl: `${baseUrl}/payment/fail?txn=${transactionId}`,
        cancelUrl: `${baseUrl}/payment/fail?txn=${transactionId}`,
      });
      return res.redirect(result.paymentUrl);
    }

    if (gateway === 'plisio') {
      const result = await plisioService.initiatePayment({
        orderName: 'Wallet Deposit',
        orderNumber: transactionId,
        amount: depositAmount,
        callbackUrl: `${baseUrl}/payment/plisio/callback`,
      });
      return res.redirect(result.invoiceUrl);
    }

    req.flash('error', 'Invalid payment gateway');
    res.redirect('/user/wallet');
  } catch (err) {
    console.error('Deposit error:', err);
    req.flash('error', err.message || 'Payment initiation failed');
    res.redirect('/user/wallet');
  }
});

// aamarpay IPN callback
router.post('/aamarpay/ipn', async (req, res) => {
  try {
    const { mer_txnid, pay_status, amount } = req.body;
    if (!mer_txnid) return res.status(400).send('Missing transaction ID');

    // Verify with aamarpay server
    const verification = await aamarpayService.verifyPayment(mer_txnid);
    if (verification.pay_status !== 'Successful') {
      await Transaction.updateOne(
        { gatewayTransactionId: mer_txnid },
        { status: 'failed', metadata: verification }
      );
      return res.status(200).send('Payment not successful');
    }

    const transaction = await Transaction.findOne({ gatewayTransactionId: mer_txnid, status: 'pending' });
    if (!transaction) return res.status(200).send('Transaction not found or already processed');

    await walletService.credit(
      transaction.user,
      transaction.amount,
      'deposit',
      `Deposit via aamarpay (${mer_txnid})`,
      { gateway: 'aamarpay', gatewayTransactionId: mer_txnid, reference: mer_txnid }
    );

    // Update original pending transaction
    transaction.status = 'completed';
    transaction.metadata = verification;
    await transaction.save();

    res.status(200).send('OK');
  } catch (err) {
    console.error('aamarpay IPN error:', err);
    res.status(500).send('Error');
  }
});

// Plisio callback
router.post('/plisio/callback', async (req, res) => {
  try {
    const isValid = await plisioService.verifyCallback(req.body);
    if (!isValid) return res.status(400).send('Invalid signature');

    const { order_number, status } = req.body;
    if (status !== 'completed' && status !== 'mismatch') {
      return res.status(200).send('Pending');
    }

    const transaction = await Transaction.findOne({ gatewayTransactionId: order_number, status: 'pending' });
    if (!transaction) return res.status(200).send('Not found or processed');

    await walletService.credit(
      transaction.user,
      transaction.amount,
      'deposit',
      `Deposit via Plisio (${order_number})`,
      { gateway: 'plisio', gatewayTransactionId: order_number, reference: order_number }
    );

    transaction.status = 'completed';
    transaction.metadata = req.body;
    await transaction.save();

    res.status(200).send('OK');
  } catch (err) {
    console.error('Plisio callback error:', err);
    res.status(500).send('Error');
  }
});

// Payment success redirect
router.get('/success', async (req, res) => {
  req.flash('success', 'Payment processed successfully! Your wallet will be credited shortly.');
  res.redirect('/user/wallet');
});

// Payment fail redirect
router.get('/fail', async (req, res) => {
  const { txn } = req.query;
  if (txn) {
    await Transaction.updateOne({ gatewayTransactionId: txn, status: 'pending' }, { status: 'failed' });
  }
  req.flash('error', 'Payment failed or was cancelled');
  res.redirect('/user/wallet');
});

module.exports = router;
