const mongoose = require('mongoose');
const slugify = require('slugify');

const blogCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
}, { timestamps: true });

blogCategorySchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  content: { type: String, required: true },
  excerpt: String,
  featuredImage: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishedAt: Date,
  viewCount: { type: Number, default: 0 },
  metaTitle: String,
  metaDescription: String,
}, { timestamps: true });

blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ status: 1, publishedAt: -1 });

blogPostSchema.pre('save', function () {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

const BlogCategory = mongoose.model('BlogCategory', blogCategorySchema);
const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = { BlogPost, BlogCategory };
