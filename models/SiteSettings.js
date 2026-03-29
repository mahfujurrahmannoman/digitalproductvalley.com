const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  siteName: { type: String, default: 'DigitalProductValley' },
  siteDescription: { type: String, default: 'Premium Digital Products Marketplace' },
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
    title: { type: String, default: 'DigitalProductValley - Buy Verified Accounts & Digital Products Instantly' },
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
  stockSync: {
    enabled: { type: Boolean, default: false },
    intervalMinutes: { type: Number, default: 30 },
    lastSyncAt: Date,
    lastSyncResult: {
      updated: Number,
      failed: Number,
      total: Number,
      matched: Number,
      duration: Number,
    },
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
