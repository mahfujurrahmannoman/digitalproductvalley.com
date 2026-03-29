require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const SiteSettings = require('../models/SiteSettings');
const PaymentSetting = require('../models/PaymentSetting');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create admin user
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    const admin = await User.create({
      username: 'admin',
      email: 'admin@digitalproductvalley.com',
      password: 'admin123',
      role: 'admin',
      firstName: 'Admin',
      isEmailVerified: true,
    });
    await Wallet.create({ user: admin._id });
    console.log('Admin user created: admin@digitalproductvalley.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  // Create site settings
  await SiteSettings.getSettings();
  console.log('Site settings initialized');

  // Create payment settings
  const gateways = ['aamarpay', 'plisio'];
  for (const gw of gateways) {
    const existing = await PaymentSetting.findOne({ gateway: gw });
    if (!existing) {
      await PaymentSetting.create({
        gateway: gw,
        displayName: gw === 'aamarpay' ? 'aamarpay (bKash/Nagad/Card)' : 'Plisio (Crypto)',
        description: gw === 'aamarpay' ? 'Pay with bKash, Nagad, or Card' : 'Pay with Bitcoin, Ethereum, etc.',
      });
      console.log(`${gw} payment setting created`);
    }
  }

  await mongoose.disconnect();
  console.log('Seed complete!');
}

seed().catch(err => { console.error(err); process.exit(1); });
