const express = require('express');
const router = express.Router();
const { BlogPost, BlogCategory } = require('../models/BlogPost');
const { paginate } = require('../utils/helpers');

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const filter = { status: 'published' };
  if (req.query.category) {
    const cat = await BlogCategory.findOne({ slug: req.query.category });
    if (cat) filter.category = cat._id;
  }
  const total = await BlogPost.countDocuments(filter);
  const posts = await BlogPost.find(filter)
    .sort('-publishedAt')
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('category', 'name slug')
    .populate('author', 'username')
    .lean();
  const categories = await BlogCategory.find().lean();
  res.render('pages/blog/index', {
    layout: 'layouts/main',
    title: 'Blog',
    posts,
    categories,
    pagination: paginate(page, limit, total),
    selectedCategory: req.query.category || '',
  });
});

router.get('/:slug', async (req, res) => {
  const post = await BlogPost.findOneAndUpdate(
    { slug: req.params.slug, status: 'published' },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('category', 'name slug').populate('author', 'username');
  if (!post) { req.flash('error', 'Post not found'); return res.redirect('/blog'); }
  const relatedPosts = await BlogPost.find({
    _id: { $ne: post._id },
    status: 'published',
    category: post.category?._id,
  }).limit(3).lean();
  res.render('pages/blog/post', { layout: 'layouts/main', title: post.title, post, relatedPosts });
});

module.exports = router;
