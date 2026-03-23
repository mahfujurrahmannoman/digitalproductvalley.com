const axios = require('axios');
const PaymentSetting = require('../models/PaymentSetting');

const getConfig = async () => {
  const setting = await PaymentSetting.findOne({ gateway: 'aamarpay' });
  if (!setting || !setting.isEnabled) throw new Error('aamarpay is not enabled');
  return setting;
};

const initiatePayment = async ({ transactionId, amount, customerName, customerEmail, customerPhone, successUrl, failUrl, cancelUrl }) => {
  const config = await getConfig();
  const baseUrl = config.environment === 'sandbox'
    ? 'https://sandbox.aamarpay.com'
    : 'https://secure.aamarpay.com';

  const amountBDT = (amount * config.exchangeRate).toFixed(2);

  const payload = {
    store_id: config.storeId,
    signature_key: config.signatureKey,
    tran_id: transactionId,
    amount: amountBDT,
    currency: 'BDT',
    desc: 'AccsZone Wallet Deposit',
    cus_name: customerName || 'Customer',
    cus_email: customerEmail,
    cus_phone: customerPhone || '01700000000',
    cus_add1: 'N/A',
    cus_city: 'N/A',
    cus_country: 'Bangladesh',
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    type: 'json',
  };

  const { data } = await axios.post(`${baseUrl}/jsonpost.php`, payload);
  if (data.result === 'true' || data.payment_url) {
    return { paymentUrl: data.payment_url };
  }
  throw new Error(data.message || 'Failed to initiate aamarpay payment');
};

const verifyPayment = async (transactionId) => {
  const config = await getConfig();
  const baseUrl = config.environment === 'sandbox'
    ? 'https://sandbox.aamarpay.com'
    : 'https://secure.aamarpay.com';

  const { data } = await axios.get(
    `${baseUrl}/api/v1/trxcheck/request.php?request_id=${transactionId}&store_id=${config.storeId}&signature_key=${config.signatureKey}&type=json`
  );
  return data;
};

module.exports = { initiatePayment, verifyPayment };
