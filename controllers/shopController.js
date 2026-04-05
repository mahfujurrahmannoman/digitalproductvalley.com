const Product = require('../models/Product');
const Category = require('../models/Category');
const { paginate } = require('../utils/helpers');
const { ITEMS_PER_PAGE } = require('../config/constants');
const { getProductSchema, getBreadcrumbSchema, getBaseUrl } = require('../middleware/seo');

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

    const baseUrl = getBaseUrl();
    res.render('pages/shop', {
      layout: 'layouts/main',
      title: 'Shop - Buy Verified Accounts & Digital Products',
      metaDescription: 'Browse our collection of verified accounts and digital products. Instant delivery, competitive prices, and secure transactions at DigitalProductValley.',
      keywords: 'buy accounts, verified accounts, digital products, social media accounts, instant delivery',
      canonicalUrl: baseUrl + '/shop',
      structuredData: getBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Shop', url: '/shop' },
      ], baseUrl),
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
      metaDescription: query ? 'Search results for "' + query + '" at DigitalProductValley. Find verified accounts and digital products.' : 'Search for verified accounts and digital products at DigitalProductValley.',
      noindex: true,
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

    const baseUrl = getBaseUrl();
    const productDesc = product.shortDescription || product.description || '';
    const metaDesc = productDesc.length > 160 ? productDesc.substring(0, 157) + '...' : productDesc;
    const productImage = product.image ? (product.image.startsWith('http') ? product.image : baseUrl + product.image) : '';

    res.render('pages/product', {
      layout: 'layouts/main',
      title: product.title,
      metaDescription: metaDesc,
      keywords: product.title + ', buy ' + product.title + ', ' + (product.category ? product.category.name : '') + ', verified accounts',
      canonicalUrl: baseUrl + '/product/' + product.slug,
      ogType: 'product',
      ogTitle: product.title + ' - ' + res.locals.siteSettings.siteName,
      ogDescription: metaDesc,
      ogImage: productImage,
      structuredData: [
        getProductSchema(product, baseUrl),
        getBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Shop', url: '/shop' },
          ...(product.category ? [{ name: product.category.name, url: '/shop/category/' + product.category.slug }] : []),
          { name: product.title },
        ], baseUrl),
      ],
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

    const baseUrl = getBaseUrl();
    const catDesc = category.description || 'Browse ' + category.name + ' products at DigitalProductValley. Instant delivery and secure transactions.';

    res.render('pages/category', {
      layout: 'layouts/main',
      title: 'Buy ' + category.name + ' - Verified Accounts',
      metaDescription: catDesc.length > 160 ? catDesc.substring(0, 157) + '...' : catDesc,
      keywords: category.name + ', buy ' + category.name + ', ' + category.name + ' accounts, verified ' + category.name,
      canonicalUrl: baseUrl + '/shop/category/' + category.slug,
      structuredData: getBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Shop', url: '/shop' },
        { name: category.name },
      ], baseUrl),
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
