const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  description: String,
  icon: String,
  image: String,
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

categorySchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

categorySchema.statics.getTree = async function () {
  const categories = await this.find({ isActive: true }).sort('sortOrder name').lean();
  const map = {};
  const tree = [];
  categories.forEach(c => { map[c._id.toString()] = { ...c, children: [] }; });
  categories.forEach(c => {
    if (c.parent) {
      const parentId = c.parent.toString();
      if (map[parentId]) map[parentId].children.push(map[c._id.toString()]);
    } else {
      tree.push(map[c._id.toString()]);
    }
  });
  return tree;
};

module.exports = mongoose.model('Category', categorySchema);
