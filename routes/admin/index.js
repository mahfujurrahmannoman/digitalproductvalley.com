const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

// Apply auth middleware to all admin routes
router.use(isAuthenticated, isAdmin);

// Dashboard
const dashboardController = require('../../controllers/admin/dashboardController');
router.get('/', dashboardController.index);

// Users
const userController = require('../../controllers/admin/userController');
router.get('/users', userController.index);
router.get('/users/:id', userController.detail);
router.post('/users/:id/ban', userController.toggleBan);
router.post('/users/:id/role', userController.changeRole);

// Suppliers
const supplierController = require('../../controllers/admin/supplierController');
router.get('/suppliers', supplierController.index);
router.get('/suppliers/:id', supplierController.detail);
router.post('/suppliers/:id/approve', supplierController.approve);
router.post('/suppliers/:id/reject', supplierController.reject);

// Categories
const categoryController = require('../../controllers/admin/categoryController');
router.get('/categories', categoryController.index);
router.get('/categories/create', categoryController.createForm);
router.post('/categories', categoryController.create);
router.get('/categories/:id/edit', categoryController.editForm);
router.post('/categories/:id', categoryController.update);
router.post('/categories/:id/delete', categoryController.delete);

// Products
const productController = require('../../controllers/admin/productController');
const upload = require('../../config/multer');
router.get('/products', productController.index);
router.get('/products/create', productController.createForm);
router.post('/products', upload.single('image'), productController.create);
router.get('/products/:id/edit', productController.editForm);
router.post('/products/:id', upload.single('image'), productController.update);
router.post('/products/:id/delete', productController.delete);
router.post('/products/:id/stock', productController.addStock);

// Orders
const orderController = require('../../controllers/admin/orderController');
router.get('/orders', orderController.index);
router.get('/orders/:id', orderController.detail);
router.post('/orders/:id/deliver', orderController.manualDeliver);
router.post('/orders/:id/refund', orderController.refund);

// Payments
const paymentController = require('../../controllers/admin/paymentController');
router.get('/payments', paymentController.index);
router.post('/payments/:gateway', paymentController.update);

// Withdrawals
const withdrawalController = require('../../controllers/admin/withdrawalController');
router.get('/withdrawals', withdrawalController.index);
router.post('/withdrawals/:id/approve', withdrawalController.approve);
router.post('/withdrawals/:id/reject', withdrawalController.reject);

// Support
const supportController = require('../../controllers/admin/supportController');
router.get('/support', supportController.index);
router.get('/support/:id', supportController.detail);
router.post('/support/:id/reply', supportController.reply);
router.post('/support/:id/status', supportController.updateStatus);

// Blog
const blogController = require('../../controllers/admin/blogController');
router.get('/blog', blogController.index);
router.get('/blog/create', blogController.createForm);
router.post('/blog', upload.single('featuredImage'), blogController.create);
router.get('/blog/:id/edit', blogController.editForm);
router.post('/blog/:id', upload.single('featuredImage'), blogController.update);
router.post('/blog/:id/delete', blogController.delete);

// API Keys
const apiKeyController = require('../../controllers/admin/apiKeyController');
router.get('/api-keys', apiKeyController.index);
router.post('/api-keys/:id/toggle', apiKeyController.toggle);

// Settings
const settingsController = require('../../controllers/admin/settingsController');
router.get('/settings', settingsController.index);
router.post('/settings', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), settingsController.update);

module.exports = router;
