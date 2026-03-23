const { ApiKey, ApiLog } = require('../../models/ApiKey');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const total = await ApiKey.countDocuments();
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const apiKeys = await ApiKey.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/api-keys/index', {
      layout: 'layouts/admin',
      title: 'API Key Management',
      apiKeys,
      pagination,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggle = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      req.flash('error', 'API key not found');
      return res.redirect('/admin/api-keys');
    }

    apiKey.isActive = !apiKey.isActive;
    await apiKey.save();

    req.flash('success', `API key ${apiKey.isActive ? 'enabled' : 'disabled'}`);
    res.redirect('/admin/api-keys');
  } catch (err) {
    next(err);
  }
};
