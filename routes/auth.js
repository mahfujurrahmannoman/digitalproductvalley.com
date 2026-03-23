const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middleware/auth');

// Login
router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, authController.loginValidation, authController.postLogin);

// Register
router.get('/register', isGuest, authController.getRegister);
router.post('/register', isGuest, authController.registerValidation, authController.postRegister);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
