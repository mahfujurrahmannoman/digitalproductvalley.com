require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');

const products = [
  {
    title: 'Facebook Accounts | USA | USA SMS & Email Verified | Email Included | Profile & Cover Photo',
    description: 'USA-based Facebook accounts registered via clean American IP addresses. Each account includes SMS and email verification, full email access, and pre-added profile and cover photos for authentic appearance. Credentials are provided in the format: Facebook Email : Facebook Password : Email Password : Profile Link. Two-factor authentication codes can be retrieved via an external service. Includes video tutorials for account management and email access procedures. Full account access provided, ready for immediate use.',
    shortDescription: 'USA Facebook accounts with SMS & email verification, email access included, and profile & cover photos already added.',
    originalPrice: 0.99,
    region: 'USA',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:profilelink',
  },
  {
    title: 'Facebook Accounts | USA | Marketplace + Professional Mode + 2FA Enabled | SMS & Email Verified | Email Included | Registered from USA IP',
    description: 'Verified USA-based Facebook accounts featuring marketplace and professional mode capabilities. Accounts registered from authentic USA IP addresses with two-factor authentication enabled for security purposes. SMS and email verification included, along with full email access. Ready to use instantly and can be accessed easily via PC for marketing or business purposes. Account credentials provided in standardized format including Facebook email, password, email password, 2FA code, and profile link. Includes references to external resources for retrieving 2FA codes and conversion tutorials for account access.',
    shortDescription: 'USA Facebook accounts with Marketplace, Professional Mode, and 2FA enabled. SMS & email verified with full email access.',
    originalPrice: 1.50,
    region: 'USA',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | USA | Marketplace + 2FA Enabled | SMS & Email Verified | Email Included | Male & Female | Registered from USA IP',
    description: 'USA-based Facebook accounts registered using authentic USA IP addresses with Marketplace access enabled, SMS and Email verification, and Two-Factor Authentication (2FA) security. Registered with USA IP, Marketplace Enabled, 2FA Enabled, SMS & Email Verified, Email Included, available in both male and female profiles with full access provided after purchase. All necessary login credentials including the attached email access will be provided after purchase, allowing you to take full control of the account. These accounts are ready to use instantly and can be accessed easily via PC. Account format includes: Facebook email, password, email password, 2FA code, and profile link.',
    shortDescription: 'USA Facebook accounts with Marketplace and 2FA enabled, available in male & female profiles. SMS & email verified.',
    originalPrice: 1.85,
    region: 'USA',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | USA | Marketplace + 2FA Enabled | USA SMS & Email Verified | Cookies Included | Profile & Cover Photo | Registered from USA IP',
    description: 'USA-based Facebook accounts with marketplace functionality enabled. Features include 2FA Enabled for Security, USA SMS & Email Verified, and Cookies Included. Each account comes with a profile picture and cover photo already added. Full Account Access Provided after purchase, and login credentials include email access and cookies. Account format specifies delivery as Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link. Includes technical guidance for retrieving 2FA codes and converting cookies from Base64 to JSON format, plus video tutorials for account access procedures.',
    shortDescription: 'USA Facebook accounts with Marketplace, 2FA, cookies included, and profile & cover photos. SMS & email verified.',
    originalPrice: 2.00,
    region: 'USA',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink:cookies',
  },
  {
    title: 'Facebook Accounts | USA | Marketplace Enabled | USA SMS & Email Verified | Email Included | Registered from USA IP',
    description: 'USA-based Facebook accounts registered through clean American IP addresses. These accounts feature enabled marketplace functionality for immediate buying and selling capabilities. Each account includes SMS and email verification from the USA, plus full email access credentials. Features include USA IP Registered Facebook Accounts, marketplace activation, dual verification (SMS and email), included email access, and complete account control upon purchase. Ready for immediate use on desktop for marketing or business applications. Account credentials provided in specific format including email, password, 2FA codes, and profile links. Includes instructional videos for account setup and email access procedures.',
    shortDescription: 'USA Facebook accounts with Marketplace enabled and USA SMS & email verification. Full email access included.',
    originalPrice: 2.85,
    region: 'USA',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | USA | Warmed Up | Marketplace + 2FA Enabled | USA SMS & Email Verified | Email Included | Avatar Added | Registered from USA IP',
    description: 'USA-based Facebook accounts that are warmed up and registered using clean USA IP addresses. Key features include marketplace enablement, two-factor authentication, SMS and email verification, included email access, and avatar profiles available in both male and female options with full access provided. Credentials supplied in format: Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link. These accounts are ready to use instantly and suitable for marketing or promotional purposes. Includes guidance for retrieving 2FA codes and tutorial videos for account management procedures.',
    shortDescription: 'Warmed-up USA Facebook accounts with Marketplace, 2FA, avatar added. SMS & email verified with full access.',
    originalPrice: 2.99,
    region: 'USA',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | Brazil | Marketplace + 2FA Enabled | SMS & Email Verified | Email Included | Profile & Cover Photo | Registered from BR IP',
    description: 'Brazilian Facebook accounts registered via clean BR IP addresses with marketplace functionality enabled. Key features include SMS and email verification, two-factor authentication security, and pre-added profile and cover photos for authentic appearance. Account credentials provided include: Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link. Users can retrieve 2FA codes via an external service. Includes tutorial videos for account setup and email access procedures. Accounts are ready for immediate use on PC for marketing and business purposes.',
    shortDescription: 'Brazil Facebook accounts with Marketplace and 2FA enabled, profile & cover photos added. Registered from BR IP.',
    originalPrice: 1.00,
    region: 'Brazil',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | Mexico | Marketplace + 2FA Enabled | SMS & Email Verified | Email Included | Profile & Cover Photo | Registered from MX IP',
    description: 'Mexican-registered Facebook accounts registered using clean MX IP addresses with marketplace functionality enabled. Each account includes SMS and email verification, two-factor authentication (2FA), and pre-added profile and cover photos. Format provided includes: Facebook Email, Facebook Password, Email Password, 2FA Code, and Profile Link. Additional resources include 2FA code retrieval guidance and tutorials covering Base64 cookie conversion and email access procedures for Outlook accounts.',
    shortDescription: 'Mexico Facebook accounts with Marketplace and 2FA enabled, profile & cover photos added. Registered from MX IP.',
    originalPrice: 1.00,
    region: 'Mexico',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | Argentina | Marketplace + 2FA Enabled | SMS & Email Verified | Email Included | Profile & Cover Photo | Registered from ARG IP',
    description: 'Argentina-based Facebook accounts registered via clean ARG IP addresses with Marketplace functionality enabled. These accounts include SMS and email verification, Two-Factor Authentication security, and pre-added profile and cover photos for immediate usability. Key features: Argentina IP registration, Marketplace access, 2FA security, verified credentials, included email access, and profile customization. Full login credentials provided. Accounts are ready for immediate use across PC platforms for marketing or business purposes. Account delivery format includes Facebook email, password, email password, 2FA code, and profile link. References external resources for 2FA code retrieval and instructional guides for account access procedures.',
    shortDescription: 'Argentina Facebook accounts with Marketplace and 2FA enabled, profile & cover photos added. Registered from ARG IP.',
    originalPrice: 1.00,
    region: 'Argentina',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
  {
    title: 'Facebook Accounts | Colombia | Marketplace + 2FA Enabled | SMS & Email Verified | Email Included | Profile & Cover Photo | Registered from CO IP',
    description: 'Colombian Facebook accounts registered via local IP addresses with marketplace functionality enabled. Key features include two-factor authentication security, SMS and email verification, included email access, and pre-added profile and cover photos for immediate usability. Accounts come formatted with login credentials including: Facebook Email : Facebook Password : Email Password : 2FA Code : Profile Link. Guidance provided on retrieving 2FA codes and tutorial links for account access procedures. These accounts are ready to use instantly for marketing or business purposes, with full account control transferred upon purchase.',
    shortDescription: 'Colombia Facebook accounts with Marketplace and 2FA enabled, profile & cover photos added. Registered from CO IP.',
    originalPrice: 1.00,
    region: 'Colombia',
    verification: 'SMS & Email Verified',
    format: 'email:password:emailpass:2fa:profilelink',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the Facebook category
    const fbCategory = await Category.findOne({ name: /facebook/i });
    if (!fbCategory) {
      console.error('Facebook category not found in database. Please create it first.');
      process.exit(1);
    }
    console.log('Found Facebook category:', fbCategory.name, fbCategory._id);

    const created = [];
    for (const p of products) {
      const price = Math.round(p.originalPrice * 1.3 * 100) / 100;
      const doc = new Product({
        title: p.title,
        description: p.description,
        shortDescription: p.shortDescription,
        category: fbCategory._id,
        price,
        deliveryType: 'manual',
        stockCount: 50,
        minQuantity: 1,
        maxQuantity: 100,
        isActive: true,
        isFeatured: false,
        accountDetails: {
          region: p.region,
          verification: p.verification,
          format: p.format,
        },
      });
      await doc.save();
      created.push(doc);
      console.log(`Created: ${doc.title} | Price: $${doc.price} | Slug: ${doc.slug}`);
    }

    console.log(`\nSuccessfully created ${created.length} products.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
