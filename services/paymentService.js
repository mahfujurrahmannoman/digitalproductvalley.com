const PaymentSetting = require('../models/PaymentSetting');
const aamarpayService = require('./aamarpayService');
const plisioService = require('./plisioService');

const getEnabledGateways = async () => {
  const settings = await PaymentSetting.find({ isEnabled: true }).lean();
  return settings.map(s => ({
    gateway: s.gateway,
    displayName: s.displayName || s.gateway,
    description: s.description || '',
  }));
};

const initiatePayment = async (gateway, params) => {
  if (gateway === 'aamarpay') {
    return aamarpayService.initiatePayment(params);
  }
  if (gateway === 'plisio') {
    return plisioService.initiatePayment(params);
  }
  throw new Error('Unknown payment gateway');
};

module.exports = { getEnabledGateways, initiatePayment };
