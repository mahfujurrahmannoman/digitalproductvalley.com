const Category = require('../../models/Category');

exports.index = async (req, res, next) => {
  try {
    const categories = await Category.find()
      .populate('parent', 'name')
      .sort('sortOrder name')
      .lean();

    // Build tree structure
    const map = {};
    const tree = [];
    categories.forEach(c => { map[c._id.toString()] = { ...c, children: [] }; });
    categories.forEach(c => {
      if (c.parent) {
        const parentId = c.parent._id.toString();
        if (map[parentId]) map[parentId].children.push(map[c._id.toString()]);
        else tree.push(map[c._id.toString()]);
      } else {
        tree.push(map[c._id.toString()]);
      }
    });

    res.render('admin/categories/index', {
      layout: 'layouts/admin',
      title: 'Category Management',
      tree,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.createForm = async (req, res, next) => {
  try {
    const parents = await Category.find({ parent: null }).sort('name').lean();
    res.render('admin/categories/form', {
      layout: 'layouts/admin',
      title: 'Create Category',
      category: null,
      parents,
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, icon, parent, isActive, sortOrder } = req.body;
    await Category.create({
      name,
      description,
      icon,
      parent: parent || null,
      isActive: isActive === 'on' || isActive === 'true',
      sortOrder: parseInt(sortOrder) || 0,
    });
    req.flash('success', 'Category created successfully');
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      req.flash('error', 'Category not found');
      return res.redirect('/admin/categories');
    }
    const parents = await Category.find({ parent: null, _id: { $ne: category._id } }).sort('name').lean();
    res.render('admin/categories/form', {
      layout: 'layouts/admin',
      title: 'Edit Category',
      category,
      parents,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, description, icon, parent, isActive, sortOrder } = req.body;
    await Category.findByIdAndUpdate(req.params.id, {
      name,
      description,
      icon,
      parent: parent || null,
      isActive: isActive === 'on' || isActive === 'true',
      sortOrder: parseInt(sortOrder) || 0,
    });
    req.flash('success', 'Category updated successfully');
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      req.flash('error', 'Category not found');
      return res.redirect('/admin/categories');
    }
    // Check for children
    const childCount = await Category.countDocuments({ parent: category._id });
    if (childCount > 0) {
      req.flash('error', 'Cannot delete category with subcategories. Remove subcategories first.');
      return res.redirect('/admin/categories');
    }
    await Category.findByIdAndDelete(req.params.id);
    req.flash('success', 'Category deleted');
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
};
