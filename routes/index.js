const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');

// GET / - Homepage
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('sortOrder name').lean();

    // Fetch all active products for accszone-style display
    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .lean();

    res.render('pages/home', {
      layout: 'layouts/main',
      title: 'Home',
      currentPage: 'home',
      categories,
      products,
    });
  } catch (err) {
    next(err);
  }
});

// GET /pages/about - About page
router.get('/pages/about', (req, res) => {
  res.render('pages/static/about', {
    layout: 'layouts/main',
    title: 'About Us',
  });
});

// GET /pages/terms - Terms page
router.get('/pages/terms', (req, res) => {
  res.render('pages/static/terms', {
    layout: 'layouts/main',
    title: 'Terms of Service',
  });
});

// GET /pages/privacy - Privacy page
router.get('/pages/privacy', (req, res) => {
  res.render('pages/static/privacy', {
    layout: 'layouts/main',
    title: 'Privacy Policy',
  });
});

// GET /pages/api-docs - API documentation page
router.get('/pages/api-docs', (req, res) => {
  res.render('pages/static/api-docs', {
    layout: 'layouts/main',
    title: 'API Documentation',
  });
});

module.exports = router;
