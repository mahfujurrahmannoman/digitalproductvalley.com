const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');

// All order routes require authentication
router.use(isAuthenticated);

// POST /order/create - Create order from product purchase
router.post('/create', orderController.createOrder);

// POST /order/checkout - Process payment (wallet debit)
router.post('/checkout', orderController.processCheckout);

// GET /order/success/:id - Order success page
router.get('/success/:id', orderController.orderSuccess);

module.exports = router;
