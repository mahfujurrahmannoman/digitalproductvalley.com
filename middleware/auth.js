const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please login to continue');
  res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.user && req.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied');
  res.redirect('/');
};

const isSupplier = (req, res, next) => {
  if (req.session && req.session.userId && req.user &&
    (req.user.role === 'supplier' || req.user.role === 'admin')) {
    return next();
  }
  req.flash('error', 'Access denied');
  res.redirect('/');
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/user/dashboard');
  }
  next();
};

module.exports = { isAuthenticated, isAdmin, isSupplier, isGuest };
