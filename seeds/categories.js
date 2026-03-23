require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const categories = [
  {
    name: 'Social Media', icon: 'fab fa-hashtag', sortOrder: 1,
    children: [
      { name: 'Facebook', icon: 'fab fa-facebook', sortOrder: 1 },
      { name: 'Instagram', icon: 'fab fa-instagram', sortOrder: 2 },
      { name: 'Twitter / X', icon: 'fab fa-twitter', sortOrder: 3 },
      { name: 'TikTok', icon: 'fab fa-tiktok', sortOrder: 4 },
      { name: 'LinkedIn', icon: 'fab fa-linkedin', sortOrder: 5 },
      { name: 'Pinterest', icon: 'fab fa-pinterest', sortOrder: 6 },
      { name: 'Reddit', icon: 'fab fa-reddit', sortOrder: 7 },
      { name: 'Snapchat', icon: 'fab fa-snapchat', sortOrder: 8 },
      { name: 'Quora', icon: 'fab fa-quora', sortOrder: 9 },
    ],
  },
  {
    name: 'Email Accounts', icon: 'fas fa-envelope', sortOrder: 2,
    children: [
      { name: 'Gmail', icon: 'fab fa-google', sortOrder: 1 },
      { name: 'Outlook / Hotmail', icon: 'fab fa-microsoft', sortOrder: 2 },
      { name: 'Yahoo Mail', icon: 'fab fa-yahoo', sortOrder: 3 },
      { name: 'Protonmail', icon: 'fas fa-shield-alt', sortOrder: 4 },
    ],
  },
  {
    name: 'Messaging', icon: 'fas fa-comment-dots', sortOrder: 3,
    children: [
      { name: 'WhatsApp', icon: 'fab fa-whatsapp', sortOrder: 1 },
      { name: 'Telegram', icon: 'fab fa-telegram', sortOrder: 2 },
      { name: 'Discord', icon: 'fab fa-discord', sortOrder: 3 },
      { name: 'Google Voice', icon: 'fab fa-google', sortOrder: 4 },
    ],
  },
  {
    name: 'Video & Streaming', icon: 'fas fa-video', sortOrder: 4,
    children: [
      { name: 'YouTube', icon: 'fab fa-youtube', sortOrder: 1 },
      { name: 'Netflix', icon: 'fas fa-film', sortOrder: 2 },
      { name: 'Spotify', icon: 'fab fa-spotify', sortOrder: 3 },
    ],
  },
  {
    name: 'Dating', icon: 'fas fa-heart', sortOrder: 5,
    children: [
      { name: 'Tinder', icon: 'fas fa-fire', sortOrder: 1 },
      { name: 'Bumble', icon: 'fas fa-bee', sortOrder: 2 },
      { name: 'Badoo', icon: 'fas fa-heart', sortOrder: 3 },
    ],
  },
  {
    name: 'Commerce & Finance', icon: 'fas fa-shopping-bag', sortOrder: 6,
    children: [
      { name: 'Amazon', icon: 'fab fa-amazon', sortOrder: 1 },
      { name: 'eBay', icon: 'fab fa-ebay', sortOrder: 2 },
      { name: 'Etsy', icon: 'fab fa-etsy', sortOrder: 3 },
      { name: 'CashApp', icon: 'fas fa-dollar-sign', sortOrder: 4 },
    ],
  },
  {
    name: 'VPN & Proxy', icon: 'fas fa-shield-alt', sortOrder: 7,
    children: [
      { name: 'VPN Premium', icon: 'fas fa-lock', sortOrder: 1 },
      { name: 'Proxy Services', icon: 'fas fa-server', sortOrder: 2 },
      { name: 'VPS / RDP', icon: 'fas fa-desktop', sortOrder: 3 },
    ],
  },
  {
    name: 'Gaming', icon: 'fas fa-gamepad', sortOrder: 8,
    children: [
      { name: 'Steam', icon: 'fab fa-steam', sortOrder: 1 },
      { name: 'PlayStation', icon: 'fab fa-playstation', sortOrder: 2 },
      { name: 'Xbox', icon: 'fab fa-xbox', sortOrder: 3 },
    ],
  },
  {
    name: 'Google Ads', icon: 'fab fa-google', sortOrder: 9,
  },
  {
    name: 'Other', icon: 'fas fa-ellipsis-h', sortOrder: 10,
    children: [
      { name: 'Apple ID', icon: 'fab fa-apple', sortOrder: 1 },
      { name: 'Trustpilot', icon: 'fas fa-star', sortOrder: 2 },
      { name: 'Indeed', icon: 'fas fa-briefcase', sortOrder: 3 },
      { name: 'Craigslist', icon: 'fas fa-list', sortOrder: 4 },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log(`${existing} categories already exist. Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  for (const cat of categories) {
    const { children, ...parentData } = cat;
    const parent = await Category.create(parentData);
    console.log(`Created: ${parent.name}`);

    if (children) {
      for (const child of children) {
        await Category.create({ ...child, parent: parent._id });
        console.log(`  Created: ${child.name}`);
      }
    }
  }

  console.log('Categories seeded!');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
