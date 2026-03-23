const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const walletService = require('../services/walletService');

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

// GET /auth/login
const getLogin = (req, res) => {
  res.render('auth/login', {
    layout: 'layouts/auth',
    title: 'Login',
    errors: [],
    old: {},
  });
};

// POST /auth/login
const postLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      layout: 'layouts/auth',
      title: 'Login',
      errors: errors.array(),
      old: req.body,
    });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('auth/login', {
        layout: 'layouts/auth',
        title: 'Login',
        errors: [{ msg: 'Invalid email or password' }],
        old: req.body,
      });
    }

    if (user.isBanned) {
      return res.render('auth/login', {
        layout: 'layouts/auth',
        title: 'Login',
        errors: [{ msg: 'Your account has been suspended. Reason: ' + (user.banReason || 'N/A') }],
        old: req.body,
      });
    }

    if (!user.isActive) {
      return res.render('auth/login', {
        layout: 'layouts/auth',
        title: 'Login',
        errors: [{ msg: 'Your account is inactive. Please contact support.' }],
        old: req.body,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        layout: 'layouts/auth',
        title: 'Login',
        errors: [{ msg: 'Invalid email or password' }],
        old: req.body,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set session
    req.session.userId = user._id;

    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'supplier') {
      return res.redirect('/supplier/dashboard');
    }
    res.redirect('/user/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'An error occurred during login');
    res.redirect('/auth/login');
  }
};

// GET /auth/register
const getRegister = (req, res) => {
  res.render('auth/register', {
    layout: 'layouts/auth',
    title: 'Register',
    errors: [],
    old: {},
  });
};

// POST /auth/register
const postRegister = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      layout: 'layouts/auth',
      title: 'Register',
      errors: errors.array(),
      old: req.body,
    });
  }

  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.render('auth/register', {
        layout: 'layouts/auth',
        title: 'Register',
        errors: [{ msg: `An account with this ${field} already exists` }],
        old: req.body,
      });
    }

    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
    });

    // Create wallet for user
    await walletService.getOrCreateWallet(user._id);

    // Set session
    req.session.userId = user._id;

    req.flash('success', 'Account created successfully! Welcome to AccsZone.');
    res.redirect('/user/dashboard');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
};

// GET /auth/logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
};

module.exports = {
  loginValidation,
  registerValidation,
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout,
};
