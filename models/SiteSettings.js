const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  siteName: { type: String, default: 'AccsZone' },
  siteDescription: { type: String, default: 'Digital Accounts Marketplace' },
  logo: String,
  favicon: String,
  primaryColor: { type: String, default: '#d8842c' },
  contactEmail: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    telegram: String,
    discord: String,
  },
  announcementBar: {
    text: String,
    isActive: { type: Boolean, default: false },
  },
  minDepositAmount: { type: Number, default: 1 },
  defaultCommissionRate: { type: Number, default: 10 },
  maintenanceMode: { type: Boolean, default: false },
  seoDefaults: {
    title: { type: String, default: 'AccsZone - Digital Accounts Marketplace' },
    description: String,
    keywords: String,
  },
  smtpSettings: {
    host: String,
    port: Number,
    user: String,
    pass: String,
    from: String,
  },
}, { timestamps: true });

siteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'main' });
  if (!settings) {
    settings = await this.create({ key: 'main' });
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
