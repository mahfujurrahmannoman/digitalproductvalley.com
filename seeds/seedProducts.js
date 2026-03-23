require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

const products = [
  {
    title: 'Buy USA Facebook Accounts – USA SMS & Email Verified | Email Included | Profile & Cover Photo Added',
    originalPrice: 0.99,
    shortDescription: 'USA-registered Facebook accounts with SMS and email verification, plus profile and cover photos.',
    description: [
      'Registered from clean USA IP addresses',
      'USA SMS verified',
      'Email verified with full email access included',
      'Profile photo added',
      'Cover photo added',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'USA',
      format: 'Facebook Email : Facebook Password : Email Password : Profile Link',
      verification: 'USA SMS & Email Verified',
      features: [
        'USA IP Registered',
        'SMS Verified',
        'Email Verified',
        'Email Included',
        'Profile Photo Added',
        'Cover Photo Added',
      ],
    },
  },
  {
    title: 'Buy USA Facebook Accounts – Marketplace + Professional Mode + 2FA | SMS & Email Verified',
    originalPrice: 1.50,
    shortDescription: 'USA Facebook accounts with Marketplace, Professional Mode, and 2FA enabled.',
    description: [
      'Registered from clean USA IP addresses',
      'Facebook Marketplace enabled',
      'Professional Mode enabled',
      '2FA enabled for enhanced security',
      'SMS & email verified',
      'Email access included',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'USA',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'SMS & Email Verified',
      features: [
        'USA IP Registered',
        'Marketplace Enabled',
        'Professional Mode Enabled',
        '2FA Enabled',
        'SMS Verified',
        'Email Verified',
        'Email Included',
      ],
    },
  },
  {
    title: 'Facebook Accounts | USA | Marketplace + 2FA Enabled | SMS & Email Verified | Male & Female',
    originalPrice: 1.85,
    shortDescription: 'USA Facebook accounts with Marketplace and 2FA, available in male and female profiles.',
    description: [
      'Registered from clean USA IP addresses',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'SMS & email verified',
      'Email access included',
      'Male and female profiles available',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'USA',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'SMS & Email Verified',
      features: [
        'USA IP Registered',
        'Marketplace Enabled',
        '2FA Enabled',
        'SMS Verified',
        'Email Verified',
        'Email Included',
        'Male & Female Profiles',
      ],
    },
  },
  {
    title: 'Facebook Accounts | USA | Marketplace + 2FA Enabled | USA SMS & Email Verified | Cookies Included | Profile & Cover Photo',
    originalPrice: 2.00,
    shortDescription: 'USA Facebook accounts with Marketplace, 2FA, cookies, and profile photos included.',
    description: [
      'Registered from clean USA IP addresses',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'USA SMS & email verified',
      'Cookies included for session management',
      'Profile & cover photo added',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'USA',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'USA SMS & Email Verified',
      features: [
        'USA IP Registered',
        'Marketplace Enabled',
        '2FA Enabled',
        'USA SMS Verified',
        'Email Verified',
        'Cookies Included',
        'Profile Photo Added',
        'Cover Photo Added',
      ],
    },
  },
  {
    title: 'Facebook Accounts | USA | Marketplace Enabled | USA SMS & Email Verified | Email Included',
    originalPrice: 2.85,
    shortDescription: 'USA Facebook accounts with Marketplace enabled and full SMS/email verification.',
    description: [
      'Registered from clean USA IP addresses',
      'Facebook Marketplace enabled',
      'USA SMS & email verified',
      'Email access included',
      'Full account access provided',
      'Ready for instant use',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'USA',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'USA SMS & Email Verified',
      features: [
        'USA IP Registered',
        'Marketplace Enabled',
        'USA SMS Verified',
        'Email Verified',
        'Email Included',
      ],
    },
  },
  {
    title: 'Facebook Accounts | USA | Warmed Up | Marketplace + 2FA Enabled | USA SMS & Email Verified | Avatar Added',
    originalPrice: 2.99,
    shortDescription: 'Warmed-up USA Facebook accounts with Marketplace, 2FA, and avatar for higher trust.',
    description: [
      'Registered from clean USA IP addresses',
      'Warmed up for improved trust score',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'USA SMS & email verified',
      'Email access included',
      'Avatar added for natural appearance',
      'Male and female profiles available',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'USA',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'USA SMS & Email Verified',
      features: [
        'USA IP Registered',
        'Warmed Up',
        'Marketplace Enabled',
        '2FA Enabled',
        'USA SMS Verified',
        'Email Verified',
        'Email Included',
        'Avatar Added',
        'Male & Female Profiles',
      ],
    },
  },
  {
    title: 'Facebook Accounts – Brazil | Marketplace + 2FA Enabled | SMS & Email Verified | Profile & Cover Photo',
    originalPrice: 1.00,
    shortDescription: 'Brazil-registered Facebook accounts with Marketplace, 2FA, and profile photos.',
    description: [
      'Registered from clean Brazil IP addresses',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'SMS & email verified',
      'Email access included',
      'Profile & cover photo added',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'Brazil',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'SMS & Email Verified',
      features: [
        'Brazil IP Registered',
        'Marketplace Enabled',
        '2FA Enabled',
        'SMS Verified',
        'Email Verified',
        'Email Included',
        'Profile Photo Added',
        'Cover Photo Added',
      ],
    },
  },
  {
    title: 'Facebook Accounts – Mexico | Marketplace + 2FA Enabled | SMS & Email Verified | Profile & Cover Photo',
    originalPrice: 1.00,
    shortDescription: 'Mexico-registered Facebook accounts with Marketplace, 2FA, and profile photos.',
    description: [
      'Registered from clean Mexico IP addresses',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'SMS & email verified',
      'Email access included',
      'Profile & cover photo added',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'Mexico',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'SMS & Email Verified',
      features: [
        'Mexico IP Registered',
        'Marketplace Enabled',
        '2FA Enabled',
        'SMS Verified',
        'Email Verified',
        'Email Included',
        'Profile Photo Added',
        'Cover Photo Added',
      ],
    },
  },
  {
    title: 'Facebook Accounts – Argentina | Marketplace + 2FA Enabled | SMS & Email Verified | Profile & Cover Photo',
    originalPrice: 1.00,
    shortDescription: 'Argentina-registered Facebook accounts with Marketplace, 2FA, and profile photos.',
    description: [
      'Registered from clean Argentina IP addresses',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'SMS & email verified',
      'Email access included',
      'Profile & cover photo added',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'Argentina',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'SMS & Email Verified',
      features: [
        'Argentina IP Registered',
        'Marketplace Enabled',
        '2FA Enabled',
        'SMS Verified',
        'Email Verified',
        'Email Included',
        'Profile Photo Added',
        'Cover Photo Added',
      ],
    },
  },
  {
    title: 'Facebook Accounts – Colombia | Marketplace + 2FA Enabled | SMS & Email Verified | Profile & Cover Photo',
    originalPrice: 1.00,
    shortDescription: 'Colombia-registered Facebook accounts with Marketplace, 2FA, and profile photos.',
    description: [
      'Registered from clean Colombia IP addresses',
      'Facebook Marketplace enabled',
      '2FA enabled for security',
      'SMS & email verified',
      'Email access included',
      'Profile & cover photo added',
      'Full account access provided',
    ].map(f => `• ${f}`).join('\n'),
    accountDetails: {
      region: 'Colombia',
      format: 'Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link',
      verification: 'SMS & Email Verified',
      features: [
        'Colombia IP Registered',
        'Marketplace Enabled',
        '2FA Enabled',
        'SMS Verified',
        'Email Verified',
        'Email Included',
        'Profile Photo Added',
        'Cover Photo Added',
      ],
    },
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find or create the Facebook category (child of Social Media)
  let facebookCat = await Category.findOne({ name: 'Facebook' });
  if (!facebookCat) {
    let socialMedia = await Category.findOne({ name: 'Social Media' });
    if (!socialMedia) {
      socialMedia = await Category.create({
        name: 'Social Media',
        icon: 'fab fa-hashtag',
        sortOrder: 1,
      });
      console.log('Created Social Media parent category');
    }
    facebookCat = await Category.create({
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      slug: 'facebook',
      parent: socialMedia._id,
      sortOrder: 1,
    });
    console.log('Created Facebook category');
  } else {
    console.log(`Found existing Facebook category: ${facebookCat._id}`);
  }

  // Delete previously seeded products to avoid duplicates (match by title)
  const titles = products.map(p => p.title);
  const deleted = await Product.deleteMany({ title: { $in: titles } });
  console.log(`Deleted ${deleted.deletedCount} previously seeded products`);

  // Insert all 10 products with 30% price increase
  const created = [];
  for (const p of products) {
    const price = Math.round(p.originalPrice * 1.30 * 100) / 100;
    const doc = await Product.create({
      title: p.title,
      price,
      shortDescription: p.shortDescription,
      description: p.description,
      category: facebookCat._id,
      deliveryType: 'manual',
      stockCount: 50,
      minQuantity: 1,
      maxQuantity: 50,
      isActive: true,
      accountDetails: p.accountDetails,
    });
    console.log(`Created: ${doc.title}  (price: $${price})`);
    created.push(doc);
  }

  // Update the category product count
  await Category.findByIdAndUpdate(facebookCat._id, {
    productCount: await Product.countDocuments({ category: facebookCat._id }),
  });

  console.log(`\nSuccessfully seeded ${created.length} Facebook products`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
