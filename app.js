require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const flash = require('connect-flash');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const SiteSettings = require('./models/SiteSettings');
const notificationService = require('./services/notificationService');
const { formatPrice, formatDate, formatDateTime, truncate } = require('./utils/helpers');

const expressLayouts = require('express-ejs-layouts');

const app = express();

// Connect DB
connectDB();

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Flash messages
app.use(flash());

// Load user and site settings for all requests
app.use(async (req, res, next) => {
  try {
    if (req.session.userId) {
      req.user = await User.findById(req.session.userId).lean();
      if (req.user && req.user.isBanned) {
        req.session.destroy();
        return res.redirect('/auth/login');
      }
    }
    res.locals.user = req.user || null;
    res.locals.flash = {
      success: req.flash('success'),
      error: req.flash('error'),
      info: req.flash('info'),
    };
    res.locals.siteSettings = await SiteSettings.getSettings();
    res.locals.notificationCount = req.user ? await notificationService.getUnreadCount(req.user._id) : 0;
    res.locals.helpers = { formatPrice, formatDate, formatDateTime, truncate };
    res.locals.currentPath = req.path;
    // Load categories for header dropdown on all pages
    const Category = require('./models/Category');
    res.locals.categories = await Category.find({ isActive: true }).sort('sortOrder name').lean();
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/shop', require('./routes/shop'));
app.use('/product', (() => { const r = express.Router(); r.get('/:slug', require('./controllers/shopController').productDetail); return r; })());
app.use('/order', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/supplier', require('./routes/supplier'));
app.use('/support', require('./routes/support'));
app.use('/blog', require('./routes/blog'));
app.use('/api/v1', require('./routes/api/v1'));
app.use('/admin', require('./routes/admin/index'));

// 404
app.use((req, res) => {
  res.status(404).render('pages/static/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  console.error(err.stack);
  res.status(500).render('pages/static/error', { title: 'Error', error: err });
});

// Cron jobs
require('./jobs/cron');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DigitalProductValley running on http://localhost:${PORT}`);
});
