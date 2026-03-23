const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');

// All routes require authentication
router.use(isAuthenticated);

// Dashboard
router.get('/dashboard', userController.getDashboard);

// Orders
router.get('/orders', userController.getOrders);
router.get('/orders/:id', userController.getOrderDetail);

// Wallet
router.get('/wallet', userController.getWallet);

// Profile
router.get('/profile', userController.getProfile);
router.post('/profile', userController.profileValidation, userController.updateProfile);

// Notifications
router.get('/notifications', userController.getNotifications);
router.post('/notifications/read-all', userController.markAllNotificationsRead);

// API Keys
router.post('/api-keys', userController.createApiKey);
router.delete('/api-keys/:id', userController.deleteApiKey);

module.exports = router;
