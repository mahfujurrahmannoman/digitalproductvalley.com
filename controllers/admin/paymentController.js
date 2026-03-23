const PaymentSetting = require('../../models/PaymentSetting');

exports.index = async (req, res, next) => {
  try {
    let aamarpay = await PaymentSetting.findOne({ gateway: 'aamarpay' }).lean();
    let plisio = await PaymentSetting.findOne({ gateway: 'plisio' }).lean();

    // Create defaults if not exist
    if (!aamarpay) {
      aamarpay = await PaymentSetting.create({
        gateway: 'aamarpay',
        displayName: 'aamarPay',
        description: 'Pay with bKash, Nagad, Rocket, Cards',
        environment: 'sandbox',
      });
      aamarpay = aamarpay.toObject();
    }
    if (!plisio) {
      plisio = await PaymentSetting.create({
        gateway: 'plisio',
        displayName: 'Plisio',
        description: 'Pay with Cryptocurrency',
      });
      plisio = plisio.toObject();
    }

    res.render('admin/payments/settings', {
      layout: 'layouts/admin',
      title: 'Payment Settings',
      aamarpay,
      plisio,
      activeTab: req.query.tab || 'aamarpay',
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { gateway } = req.params;

    if (gateway === 'aamarpay') {
      const { isEnabled, environment, storeId, signatureKey, exchangeRate, displayName, description } = req.body;
      await PaymentSetting.findOneAndUpdate(
        { gateway: 'aamarpay' },
        {
          isEnabled: isEnabled === 'on' || isEnabled === 'true',
          environment: environment || 'sandbox',
          storeId,
          signatureKey,
          exchangeRate: parseFloat(exchangeRate) || 120,
          displayName: displayName || 'aamarPay',
          description,
        },
        { upsert: true }
      );
    } else if (gateway === 'plisio') {
      const { isEnabled, apiKey, webhookSecret, displayName, description } = req.body;
      await PaymentSetting.findOneAndUpdate(
        { gateway: 'plisio' },
        {
          isEnabled: isEnabled === 'on' || isEnabled === 'true',
          apiKey,
          webhookSecret,
          displayName: displayName || 'Plisio',
          description,
        },
        { upsert: true }
      );
    } else {
      req.flash('error', 'Invalid gateway');
      return res.redirect('/admin/payments');
    }

    req.flash('success', `${gateway} settings updated`);
    res.redirect(`/admin/payments?tab=${gateway}`);
  } catch (err) {
    next(err);
  }
};
