const axios = require('axios');
const Product = require('../models/Product');
const SyncLog = require('../models/SyncLog');
const SiteSettings = require('../models/SiteSettings');

/**
 * Scrape accszone.com homepage and extract product titles + stock counts
 */
async function scrapeAccsZone() {
  const response = await axios.get('https://accszone.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 20000,
  });

  const html = response.data;
  const products = [];
  const seen = new Set();

  // Extract table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract product title from ad_details link
    const titleMatch = rowHtml.match(/<a[^>]*href="[^"]*\/ad_details\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    if (!title || title === 'Buy' || title.length < 15) continue;

    // Extract stock count (e.g. "124 pcs.")
    const stockMatch = rowHtml.match(/([\d,]+)\s*pcs\./i);
    if (!stockMatch) continue;

    const stock = parseInt(stockMatch[1].replace(/,/g, '')) || 0;

    // Deduplicate by title
    const key = title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    products.push({ title, stock });
  }

  return products;
}

/**
 * Normalize a product title for comparison - strips all separators and extra words
 */
function normalizeTitle(title) {
  return title
    .replace(/^buy\s+/i, '')
    .replace(/\s*[|–—]\s*/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Create a fingerprint from title - extracts key words for fuzzy matching
 */
function titleFingerprint(title) {
  return normalizeTitle(title)
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .sort()
    .join(' ');
}

/**
 * Match scraped products to local database products
 */
function matchProducts(scrapedProducts, localProducts) {
  const matches = [];
  const unmatched = [];

  // Build multiple indexes for matching
  const localByNorm = new Map();
  const localByFingerprint = new Map();
  for (const local of localProducts) {
    const norm = normalizeTitle(local.title);
    const fp = titleFingerprint(local.title);
    localByNorm.set(norm, local);
    localByFingerprint.set(fp, local);
  }

  for (const scraped of scrapedProducts) {
    const normScraped = normalizeTitle(scraped.title);
    const fpScraped = titleFingerprint(scraped.title);
    let matched = null;

    // Pass 1: exact normalized match
    if (localByNorm.has(normScraped)) {
      matched = localByNorm.get(normScraped);
    }

    // Pass 2: fingerprint match (same words in any order)
    if (!matched && localByFingerprint.has(fpScraped)) {
      matched = localByFingerprint.get(fpScraped);
    }

    // Pass 3: substring containment
    if (!matched) {
      for (const [normLocal, local] of localByNorm.entries()) {
        if (normLocal.includes(normScraped) || normScraped.includes(normLocal)) {
          matched = local;
          break;
        }
      }
    }

    // Pass 4: word overlap scoring (>80% shared words = match)
    if (!matched) {
      const scrapedWords = new Set(normScraped.split(/\s+/).filter(w => w.length > 2));
      let bestScore = 0;
      let bestLocal = null;

      for (const [normLocal, local] of localByNorm.entries()) {
        const localWords = new Set(normLocal.split(/\s+/).filter(w => w.length > 2));
        const shared = [...scrapedWords].filter(w => localWords.has(w)).length;
        const score = shared / Math.max(scrapedWords.size, localWords.size);
        if (score > bestScore && score > 0.75) {
          bestScore = score;
          bestLocal = local;
        }
      }
      if (bestLocal) matched = bestLocal;
    }

    if (matched) {
      matches.push({ localProduct: matched, scrapedStock: scraped.stock, scrapedTitle: scraped.title });
    } else {
      unmatched.push(scraped);
    }
  }

  return { matches, unmatched };
}

/**
 * Run a full stock sync from accszone.com
 */
async function runSync(triggeredBy = 'manual') {
  // Check for running sync to prevent overlap
  const running = await SyncLog.findOne({ status: 'running' });
  if (running) {
    // Mark stale running syncs as failed (older than 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (running.startedAt < fiveMinAgo) {
      running.status = 'failed';
      running.completedAt = new Date();
      running.errors.push({ product: 'system', error: 'Sync timed out' });
      await running.save();
    } else {
      return { error: 'A sync is already in progress' };
    }
  }

  const log = await SyncLog.create({ startedAt: new Date(), triggeredBy });
  const startTime = Date.now();

  try {
    // Step 1: Scrape accszone.com
    const scrapedProducts = await scrapeAccsZone();
    log.totalScraped = scrapedProducts.length;

    if (scrapedProducts.length === 0) {
      log.status = 'failed';
      log.completedAt = new Date();
      log.duration = Date.now() - startTime;
      log.syncErrors.push({ product: 'system', error: 'No products scraped from accszone.com - site may be down or HTML changed' });
      await log.save();
      return { error: 'No products scraped', log };
    }

    // Step 2: Get local products
    const localProducts = await Product.find({ isActive: true }).lean();

    // Step 3: Match products
    const { matches, unmatched } = matchProducts(scrapedProducts, localProducts);
    log.totalMatched = matches.length;

    // Step 4: Update stock counts
    let updated = 0;
    let failed = 0;

    for (const match of matches) {
      try {
        await Product.updateOne(
          { _id: match.localProduct._id },
          { stockCount: match.scrapedStock }
        );
        updated++;
      } catch (err) {
        failed++;
        log.syncErrors.push({ product: match.localProduct.title, error: err.message });
      }
    }

    log.totalUpdated = updated;
    log.totalFailed = failed;
    log.status = 'completed';
    log.completedAt = new Date();
    log.duration = Date.now() - startTime;
    await log.save();

    // Update site settings with last sync info
    await SiteSettings.updateOne({ key: 'main' }, {
      'stockSync.lastSyncAt': new Date(),
      'stockSync.lastSyncResult': {
        updated,
        failed,
        total: scrapedProducts.length,
        matched: matches.length,
        duration: log.duration,
      },
    });

    return {
      success: true,
      scraped: scrapedProducts.length,
      matched: matches.length,
      updated,
      failed,
      unmatched: unmatched.length,
      duration: log.duration,
    };
  } catch (err) {
    log.status = 'failed';
    log.completedAt = new Date();
    log.duration = Date.now() - startTime;
    log.syncErrors.push({ product: 'system', error: err.message });
    await log.save();
    return { error: err.message, log };
  }
}

module.exports = { scrapeAccsZone, normalizeTitle, matchProducts, runSync };
