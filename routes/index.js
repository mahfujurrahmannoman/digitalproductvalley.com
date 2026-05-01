const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const { getOrganizationSchema, getWebSiteSchema, getBaseUrl } = require('../middleware/seo');

// GET / - Homepage
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('sortOrder name').lean();

    // Fetch limited active products for landing page display (max 50 for performance)
    const products = await Product.find({ isActive: true, stockCount: { $gt: 0 } })
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const baseUrl = getBaseUrl();
    const siteSettings = res.locals.siteSettings;

    res.render('pages/home', {
      layout: 'layouts/main',
      title: 'Buy Verified Accounts & Digital Products Instantly',
      metaDescription: siteSettings.seoDefaults.description || 'DigitalProductValley is a trusted marketplace to buy verified accounts and digital products. Instant delivery, secure transactions, and 24/7 support.',
      keywords: 'buy verified accounts, digital products, instant delivery, verified social media accounts, bulk accounts, digital marketplace',
      canonicalUrl: baseUrl + '/',
      structuredData: [
        getOrganizationSchema(siteSettings, baseUrl),
        getWebSiteSchema(siteSettings, baseUrl),
      ],
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
    metaDescription: 'Learn about DigitalProductValley - a trusted marketplace for verified accounts and digital products with instant delivery and secure transactions.',
  });
});

// GET /pages/terms - Terms page
router.get('/pages/terms', (req, res) => {
  res.render('pages/static/terms', {
    layout: 'layouts/main',
    title: 'Terms of Service',
    metaDescription: 'Read the Terms of Service for DigitalProductValley. Understand our policies on purchases, refunds, account usage, and marketplace rules.',
  });
});

// GET /pages/privacy - Privacy page
router.get('/pages/privacy', (req, res) => {
  res.render('pages/static/privacy', {
    layout: 'layouts/main',
    title: 'Privacy Policy',
    metaDescription: 'DigitalProductValley Privacy Policy. Learn how we collect, use, and protect your personal information and data.',
  });
});

// GET /pages/api-docs - API documentation page
router.get('/pages/api-docs', (req, res) => {
  res.render('pages/static/api-docs', {
    layout: 'layouts/main',
    title: 'API Documentation',
    metaDescription: 'DigitalProductValley API documentation for resellers. Integrate our products into your platform with our RESTful API.',
  });
});

// GET /pages/sitemap - HTML sitemap for users and crawlers
router.get('/pages/sitemap', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('sortOrder name').lean();
    const products = await Product.find({ isActive: true })
      .select('title slug updatedAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const { BlogPost } = require('../models/BlogPost');
    const posts = await BlogPost.find({ status: 'published' })
      .select('title slug publishedAt')
      .sort('-publishedAt')
      .limit(50)
      .lean();

    res.render('pages/static/sitemap', {
      layout: 'layouts/main',
      title: 'Sitemap - All Pages',
      metaDescription: 'Browse all pages on DigitalProductValley. Find products, categories, blog posts, and more.',
      noindex: false,
      categories,
      products,
      posts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
