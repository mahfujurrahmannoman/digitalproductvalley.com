const express = require('express');
const router = express.Router();
const { BlogPost, BlogCategory } = require('../models/BlogPost');
const { paginate } = require('../utils/helpers');
const { getBlogPostSchema, getBreadcrumbSchema, getBaseUrl } = require('../middleware/seo');

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
  const baseUrl = getBaseUrl();
  res.render('pages/blog/index', {
    layout: 'layouts/main',
    title: 'Blog - Tips, Guides & Updates',
    metaDescription: 'Read the latest articles, guides, and tips about verified accounts, digital products, and online marketplace strategies at DigitalProductValley.',
    canonicalUrl: baseUrl + '/blog',
    structuredData: getBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog' },
    ], baseUrl),
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
  const baseUrl = getBaseUrl();
  const postDesc = post.metaDescription || post.excerpt || '';
  const postImage = post.featuredImage ? (post.featuredImage.startsWith('http') ? post.featuredImage : baseUrl + post.featuredImage) : '';

  res.render('pages/blog/post', {
    layout: 'layouts/main',
    title: post.metaTitle || post.title,
    metaDescription: postDesc,
    canonicalUrl: baseUrl + '/blog/' + post.slug,
    ogType: 'article',
    ogTitle: (post.metaTitle || post.title) + ' - ' + res.locals.siteSettings.siteName,
    ogDescription: postDesc,
    ogImage: postImage,
    structuredData: [
      getBlogPostSchema(post, baseUrl),
      getBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: post.title },
      ], baseUrl),
    ],
    post,
    relatedPosts,
  });
});

module.exports = router;
