const Product = require('../../models/Product');
const Category = require('../../models/Category');
const AccountStock = require('../../models/AccountStock');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const category = req.query.category || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) {
      filter.category = category;
    }

    const total = await Product.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const [products, categories] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .populate('supplier', 'username')
        .sort({ createdAt: -1 })
        .skip((pagination.page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .lean(),
      Category.find({ isActive: true }).sort('name').lean(),
    ]);

    res.render('admin/products/index', {
      layout: 'layouts/admin',
      title: 'Product Management',
      products,
      categories,
      pagination,
      search,
      selectedCategory: category,
    });
  } catch (err) {
    next(err);
  }
};

exports.createForm = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name').lean();
    res.render('admin/products/form', {
      layout: 'layouts/admin',
      title: 'Create Product',
      product: null,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      title, description, shortDescription, category, price,
      minQuantity, maxQuantity, deliveryType, isActive, isFeatured,
      accountAge, region, verification, format, features,
    } = req.body;

    const productData = {
      title,
      description,
      shortDescription,
      category,
      price: parseFloat(price),
      minQuantity: parseInt(minQuantity) || 1,
      maxQuantity: parseInt(maxQuantity) || 100,
      deliveryType: deliveryType || 'auto',
      isActive: isActive === 'on' || isActive === 'true',
      isFeatured: isFeatured === 'on' || isFeatured === 'true',
      accountDetails: {
        accountAge,
        region,
        verification,
        format,
        features: features ? features.split(',').map(f => f.trim()).filter(Boolean) : [],
      },
    };

    if (req.file) {
      productData.image = '/uploads/' + req.file.filename;
    }

    await Product.create(productData);
    req.flash('success', 'Product created successfully');
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const [product, categories] = await Promise.all([
      Product.findById(req.params.id).lean(),
      Category.find({ isActive: true }).sort('name').lean(),
    ]);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }
    res.render('admin/products/form', {
      layout: 'layouts/admin',
      title: 'Edit Product',
      product,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const {
      title, description, shortDescription, category, price,
      minQuantity, maxQuantity, deliveryType, isActive, isFeatured,
      accountAge, region, verification, format, features,
    } = req.body;

    const updateData = {
      title,
      description,
      shortDescription,
      category,
      price: parseFloat(price),
      minQuantity: parseInt(minQuantity) || 1,
      maxQuantity: parseInt(maxQuantity) || 100,
      deliveryType: deliveryType || 'auto',
      isActive: isActive === 'on' || isActive === 'true',
      isFeatured: isFeatured === 'on' || isFeatured === 'true',
      accountDetails: {
        accountAge,
        region,
        verification,
        format,
        features: features ? features.split(',').map(f => f.trim()).filter(Boolean) : [],
      },
    };

    if (req.file) {
      updateData.image = '/uploads/' + req.file.filename;
    }

    await Product.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash('success', 'Product deleted');
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.addStock = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }

    const { stockType, stockData, manualStockCount } = req.body;

    if (stockType === 'manual') {
      // Manual delivery: just set the stock count directly
      const count = parseInt(manualStockCount) || 0;
      product.stockCount = count;
      await product.save();
      req.flash('success', `Stock count set to ${count}`);
    } else {
      // Auto delivery: add encrypted account credentials
      if (!stockData || !stockData.trim()) {
        req.flash('error', 'No stock data provided');
        return res.redirect(`/admin/products/${req.params.id}/edit`);
      }

      const CryptoJS = require('crypto-js');
      const lines = stockData.split('\n').map(l => l.trim()).filter(Boolean);
      const stockDocs = lines.map(line => ({
        product: product._id,
        supplier: product.supplier,
        accountData: CryptoJS.AES.encrypt(line, process.env.ENCRYPTION_KEY).toString(),
        status: 'available',
      }));

      if (stockDocs.length > 0) {
        await AccountStock.insertMany(stockDocs);
        const availableCount = await AccountStock.countDocuments({ product: product._id, status: 'available' });
        product.stockCount = availableCount;
        await product.save();
      }

      req.flash('success', `${lines.length} stock items added`);
    }

    res.redirect(`/admin/products/${req.params.id}/edit`);
  } catch (err) {
    next(err);
  }
};
