const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// GET /shop - Shop page with all products, category filter, search
router.get('/', shopController.shopPage);

// GET /shop/search - Search results
router.get('/search', shopController.searchProducts);

// Redirect old /shop/product/:slug to /product/:slug
router.get('/product/:slug', (req, res) => res.redirect(301, '/product/' + req.params.slug));

// GET /shop/category/:slug - Products by category
router.get('/category/:slug', shopController.categoryPage);

module.exports = router;
