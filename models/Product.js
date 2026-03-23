const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  description: { type: String, required: true },
  shortDescription: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  price: { type: Number, required: true, min: 0 },
  minQuantity: { type: Number, default: 1 },
  maxQuantity: { type: Number, default: 100 },
  deliveryType: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  accountDetails: {
    accountAge: String,
    region: String,
    verification: String,
    format: String,
    features: [String],
    customFields: [{ label: String, value: String }],
  },
  image: String,
  stockCount: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

productSchema.index({ category: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ isActive: 1, isFeatured: -1 });
productSchema.index({ price: 1 });
productSchema.index({ title: 'text', description: 'text' });

productSchema.pre('save', function () {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
});

module.exports = mongoose.model('Product', productSchema);
