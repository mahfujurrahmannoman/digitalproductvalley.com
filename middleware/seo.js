const Product = require('../models/Product');
const Category = require('../models/Category');
const { BlogPost } = require('../models/BlogPost');

function getBaseUrl() {
  return (process.env.BASE_URL || 'https://digitalproductvalley.com').replace(/\/$/, '');
}

/**
 * SEO middleware - adds canonical URL and base URL to all responses
 */
function seoMiddleware(req, res, next) {
  const baseUrl = getBaseUrl();
  res.locals.baseUrl = baseUrl;
  res.locals.canonicalUrl = baseUrl + req.path;

  // Defaults that pages can override
  res.locals.ogType = 'website';
  res.locals.ogImage = baseUrl + '/images/og-default.png';
  res.locals.ogTitle = '';
  res.locals.ogDescription = '';
  res.locals.keywords = '';
  res.locals.structuredData = null;

  next();
}

/**
 * Generate Organization JSON-LD structured data
 */
function getOrganizationSchema(siteSettings, baseUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteSettings.siteName,
    url: baseUrl,
    description: siteSettings.siteDescription,
  };

  if (siteSettings.logo) {
    schema.logo = siteSettings.logo.startsWith('http') ? siteSettings.logo : baseUrl + siteSettings.logo;
  }

  if (siteSettings.contactEmail) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      email: siteSettings.contactEmail,
      contactType: 'customer service',
    };
  }

  const sameAs = [];
  if (siteSettings.socialLinks) {
    if (siteSettings.socialLinks.facebook) sameAs.push(siteSettings.socialLinks.facebook);
    if (siteSettings.socialLinks.twitter) sameAs.push(siteSettings.socialLinks.twitter);
    if (siteSettings.socialLinks.telegram) sameAs.push(siteSettings.socialLinks.telegram);
    if (siteSettings.socialLinks.discord) sameAs.push(siteSettings.socialLinks.discord);
  }
  if (sameAs.length) schema.sameAs = sameAs;

  return schema;
}

/**
 * Generate WebSite JSON-LD with SearchAction
 */
function getWebSiteSchema(siteSettings, baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteSettings.siteName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: baseUrl + '/shop/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate Product JSON-LD
 */
function getProductSchema(product, baseUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription || product.description,
    url: baseUrl + '/product/' + product.slug,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.stockCount > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: baseUrl + '/product/' + product.slug,
    },
  };

  if (product.image) {
    schema.image = product.image.startsWith('http') ? product.image : baseUrl + product.image;
  }

  if (product.category && product.category.name) {
    schema.category = product.category.name;
  }

  if (product.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 1,
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList JSON-LD
 */
function getBreadcrumbSchema(items, baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? baseUrl + item.url : undefined,
    })),
  };
}

/**
 * Generate BlogPosting JSON-LD
 */
function getBlogPostSchema(post, baseUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription || post.excerpt || '',
    url: baseUrl + '/blog/' + post.slug,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
  };

  if (post.featuredImage) {
    schema.image = post.featuredImage.startsWith('http') ? post.featuredImage : baseUrl + post.featuredImage;
  }

  if (post.author && post.author.username) {
    schema.author = {
      '@type': 'Person',
      name: post.author.username,
    };
  }

  return schema;
}

/**
 * Generate dynamic sitemap XML
 */
async function generateSitemap(baseUrl) {
  const urls = [];
  const now = new Date().toISOString();

  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/shop', priority: '0.9', changefreq: 'daily' },
    { loc: '/blog', priority: '0.8', changefreq: 'daily' },
    { loc: '/pages/about', priority: '0.5', changefreq: 'monthly' },
    { loc: '/pages/terms', priority: '0.3', changefreq: 'monthly' },
    { loc: '/pages/privacy', priority: '0.3', changefreq: 'monthly' },
    { loc: '/pages/api-docs', priority: '0.5', changefreq: 'monthly' },
  ];

  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Products
  const products = await Product.find({ isActive: true })
    .select('slug updatedAt')
    .lean();

  for (const p of products) {
    urls.push(`  <url>
    <loc>${baseUrl}/product/${p.slug}</loc>
    <lastmod>${(p.updatedAt || new Date()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Categories
  const categories = await Category.find({ isActive: true })
    .select('slug updatedAt')
    .lean();

  for (const c of categories) {
    urls.push(`  <url>
    <loc>${baseUrl}/shop/category/${c.slug}</loc>
    <lastmod>${(c.updatedAt || new Date()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Blog posts
  const posts = await BlogPost.find({ status: 'published' })
    .select('slug updatedAt publishedAt')
    .lean();

  for (const post of posts) {
    urls.push(`  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${(post.updatedAt || post.publishedAt || new Date()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

module.exports = {
  seoMiddleware,
  getOrganizationSchema,
  getWebSiteSchema,
  getProductSchema,
  getBreadcrumbSchema,
  getBlogPostSchema,
  generateSitemap,
  getBaseUrl,
};
