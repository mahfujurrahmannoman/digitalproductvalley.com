const Product = require('../models/Product');
const Category = require('../models/Category');
const { paginate } = require('../utils/helpers');
const { ITEMS_PER_PAGE } = require('../config/constants');

// GET /shop - Shop page with all products
exports.shopPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const categorySlug = req.query.category;
    const sort = req.query.sort || 'newest';

    const filter = { isActive: true, stockCount: { $gt: 0 } };

    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug, isActive: true });
      if (category) {
        filter.category = category._id;
      }
    }

    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'price-low': sortOption = { price: 1 }; break;
      case 'price-high': sortOption = { price: -1 }; break;
      case 'popular': sortOption = { totalSold: -1 }; break;
      case 'newest': default: sortOption = { createdAt: -1 }; break;
    }

    const total = await Product.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    const categories = await Category.getTree();

    const queryString = '&sort=' + sort + (categorySlug ? '&category=' + categorySlug : '');

    res.render('pages/shop', {
      layout: 'layouts/main',
      title: 'Shop',
      products,
      categories,
      pagination,
      queryString,
      currentSort: sort,
      currentCategory: categorySlug || '',
    });
  } catch (err) {
    next(err);
  }
};

// GET /shop/search - Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'relevance';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
    const region = req.query.region || '';
    const verification = req.query.verification || '';

    const filter = { isActive: true };

    if (query) {
      filter.$text = { $search: query };
    }

    if (minPrice > 0 || maxPrice < Infinity) {
      filter.price = {};
      if (minPrice > 0) filter.price.$gte = minPrice;
      if (maxPrice < Infinity) filter.price.$lte = maxPrice;
    }

    if (region) {
      filter['accountDetails.region'] = new RegExp(region, 'i');
    }

    if (verification) {
      filter['accountDetails.verification'] = new RegExp(verification, 'i');
    }

    let sortOption = {};
    switch (sort) {
      case 'price-low': sortOption = { price: 1 }; break;
      case 'price-high': sortOption = { price: -1 }; break;
      case 'popular': sortOption = { totalSold: -1 }; break;
      case 'relevance': default:
        if (query) {
          sortOption = { score: { $meta: 'textScore' }, createdAt: -1 };
        } else {
          sortOption = { createdAt: -1 };
        }
        break;
    }

    const total = await Product.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    let productsQuery = Product.find(filter)
      .populate('category', 'name slug');

    if (query && sort === 'relevance') {
      productsQuery = productsQuery.select({ score: { $meta: 'textScore' } });
    }

    const products = await productsQuery
      .sort(sortOption)
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    const categories = await Category.getTree();

    let queryString = '&q=' + encodeURIComponent(query) + '&sort=' + sort;
    if (minPrice > 0) queryString += '&minPrice=' + minPrice;
    if (maxPrice < Infinity) queryString += '&maxPrice=' + maxPrice;
    if (region) queryString += '&region=' + encodeURIComponent(region);
    if (verification) queryString += '&verification=' + encodeURIComponent(verification);

    res.render('pages/search', {
      layout: 'layouts/main',
      title: query ? 'Search: ' + query : 'Search',
      products,
      categories,
      pagination,
      queryString,
      searchQuery: query,
      currentSort: sort,
      filters: { minPrice, maxPrice: maxPrice === Infinity ? '' : maxPrice, region, verification },
    });
  } catch (err) {
    next(err);
  }
};

// GET /shop/product/:slug - Product detail page
exports.productDetail = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug')
      .populate('supplier', 'username')
      .lean();

    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/shop');
    }

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true,
      stockCount: { $gt: 0 },
    })
      .limit(4)
      .lean();

    res.render('pages/product', {
      layout: 'layouts/main',
      title: product.title,
      product,
      relatedProducts,
    });
  } catch (err) {
    next(err);
  }
};

// GET /shop/category/:slug - Products by category
exports.categoryPage = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();

    if (!category) {
      req.flash('error', 'Category not found');
      return res.redirect('/shop');
    }

    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'newest';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
    const region = req.query.region || '';
    const verification = req.query.verification || '';

    const filter = { category: category._id, isActive: true };

    if (minPrice > 0 || maxPrice < Infinity) {
      filter.price = {};
      if (minPrice > 0) filter.price.$gte = minPrice;
      if (maxPrice < Infinity) filter.price.$lte = maxPrice;
    }

    if (region) {
      filter['accountDetails.region'] = new RegExp(region, 'i');
    }

    if (verification) {
      filter['accountDetails.verification'] = new RegExp(verification, 'i');
    }

    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'price-low': sortOption = { price: 1 }; break;
      case 'price-high': sortOption = { price: -1 }; break;
      case 'popular': sortOption = { totalSold: -1 }; break;
      case 'newest': default: sortOption = { createdAt: -1 }; break;
    }

    const total = await Product.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    const categories = await Category.getTree();

    let queryString = '&sort=' + sort;
    if (minPrice > 0) queryString += '&minPrice=' + minPrice;
    if (maxPrice < Infinity) queryString += '&maxPrice=' + maxPrice;
    if (region) queryString += '&region=' + encodeURIComponent(region);
    if (verification) queryString += '&verification=' + encodeURIComponent(verification);

    res.render('pages/category', {
      layout: 'layouts/main',
      title: category.name,
      category,
      products,
      categories,
      pagination,
      queryString,
      currentSort: sort,
      filters: { minPrice, maxPrice: maxPrice === Infinity ? '' : maxPrice, region, verification },
    });
  } catch (err) {
    next(err);
  }
};
