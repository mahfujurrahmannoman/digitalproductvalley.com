const { BlogPost, BlogCategory } = require('../../models/BlogPost');
const { paginate } = require('../../utils/helpers');
const { ITEMS_PER_PAGE } = require('../../config/constants');

exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || '';

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const total = await BlogPost.countDocuments(filter);
    const pagination = paginate(page, ITEMS_PER_PAGE, total);

    const posts = await BlogPost.find(filter)
      .populate('author', 'username')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean();

    res.render('admin/blog/index', {
      layout: 'layouts/admin',
      title: 'Blog Management',
      posts,
      pagination,
      status,
    });
  } catch (err) {
    next(err);
  }
};

exports.createForm = async (req, res, next) => {
  try {
    const categories = await BlogCategory.find().sort('name').lean();
    res.render('admin/blog/form', {
      layout: 'layouts/admin',
      title: 'Create Blog Post',
      post: null,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, content, excerpt, category, status, metaTitle, metaDescription } = req.body;

    const postData = {
      title,
      content,
      excerpt,
      category: category || undefined,
      author: req.user._id,
      status: status || 'draft',
      metaTitle,
      metaDescription,
    };

    if (req.file) {
      postData.featuredImage = '/uploads/' + req.file.filename;
    }

    await BlogPost.create(postData);
    req.flash('success', 'Blog post created');
    res.redirect('/admin/blog');
  } catch (err) {
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const [post, categories] = await Promise.all([
      BlogPost.findById(req.params.id).lean(),
      BlogCategory.find().sort('name').lean(),
    ]);
    if (!post) {
      req.flash('error', 'Post not found');
      return res.redirect('/admin/blog');
    }
    res.render('admin/blog/form', {
      layout: 'layouts/admin',
      title: 'Edit Blog Post',
      post,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { title, content, excerpt, category, status, metaTitle, metaDescription } = req.body;

    const updateData = {
      title,
      content,
      excerpt,
      category: category || undefined,
      status: status || 'draft',
      metaTitle,
      metaDescription,
    };

    if (req.file) {
      updateData.featuredImage = '/uploads/' + req.file.filename;
    }

    if (status === 'published') {
      const existing = await BlogPost.findById(req.params.id);
      if (existing && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    await BlogPost.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', 'Blog post updated');
    res.redirect('/admin/blog');
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    req.flash('success', 'Blog post deleted');
    res.redirect('/admin/blog');
  } catch (err) {
    next(err);
  }
};
