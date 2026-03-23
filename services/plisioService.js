const axios = require('axios');
const crypto = require('crypto');
const PaymentSetting = require('../models/PaymentSetting');

const getConfig = async () => {
  const setting = await PaymentSetting.findOne({ gateway: 'plisio' });
  if (!setting || !setting.isEnabled) throw new Error('Plisio is not enabled');
  return setting;
};

const initiatePayment = async ({ orderName, orderNumber, amount, callbackUrl }) => {
  const config = await getConfig();

  const params = new URLSearchParams({
    source_currency: 'USD',
    source_amount: amount.toString(),
    order_name: orderName,
    order_number: orderNumber,
    callback_url: callbackUrl,
    api_key: config.apiKey,
    currency: 'BTC',
  });

  const { data } = await axios.get(`https://api.plisio.net/api/v1/invoices/new?${params}`);
  if (data.status === 'success' && data.data) {
    return {
      invoiceUrl: data.data.invoice_url,
      invoiceId: data.data.txn_id,
    };
  }
  throw new Error(data.data?.message || 'Failed to create Plisio invoice');
};

const verifyCallback = async (body) => {
  const config = await getConfig();
  const { verify_hash, ...params } = body;
  if (!verify_hash) return false;

  const sortedKeys = Object.keys(params).sort();
  const sortedValues = sortedKeys.map(k => params[k]).join('');
  const hash = crypto.createHmac('sha1', config.apiKey).update(sortedValues).digest('hex');
  return hash === verify_hash;
};

module.exports = { initiatePayment, verifyCallback };
