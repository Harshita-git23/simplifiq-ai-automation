const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const SCRAPE_TIMEOUT = 10000;

/**
 * Scrape basic info from company website
 */
async function scrapeWebsite(url) {
  if (!url) return null;

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  logger.info(`Scraping website: ${normalizedUrl}`);

  try {
    const response = await axios.get(normalizedUrl, {
      timeout: SCRAPE_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data);

    // Remove scripts/styles
    $('script, style, nav, footer, noscript').remove();

    const scraped = {
      title: $('title').text().trim() || '',
      metaDescription: $('meta[name="description"]').attr('content') || '',
      metaKeywords: $('meta[name="keywords"]').attr('content') || '',
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogDescription: $('meta[property="og:description"]').attr('content') || '',

      // Extract headings
      h1s: $('h1')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .slice(0, 5),
      h2s: $('h2')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .slice(0, 8),

      // Look for social links
      linkedIn: extractSocialLink($, 'linkedin'),
      twitter: extractSocialLink($, 'twitter'),

      // Look for contact info patterns
      emails: extractEmails(response.data),

      // Body text (first 1000 chars for context)
      bodyText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500),
    };

    logger.debug(`Scraped ${normalizedUrl}: title="${scraped.title}"`);
    return scraped;
  } catch (err) {
    logger.warn(`Scraping failed for ${normalizedUrl}: ${err.message}`);
    return { error: err.message, url: normalizedUrl };
  }
}

function extractSocialLink($, platform) {
  let link = null;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes(platform) && !link) link = href;
  });
  return link;
}

function extractEmails(html) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = html.match(emailRegex) || [];
  // Filter out common non-contact emails
  return [...new Set(matches)]
    .filter((e) => !e.includes('example') && !e.includes('placeholder') && !e.includes('test@'))
    .slice(0, 3);
}

/**
 * Try to fetch LinkedIn company info via public scraping (best-effort)
 */
async function fetchPublicCompanyData(companyName) {
  logger.info(`Fetching public data for: ${companyName}`);

  // Try multiple sources
  const results = { companyName, sources: [] };

  // Clearbit-style domain guessing
  results.likelyDomain = guessCompanyDomain(companyName);

  return results;
}

function guessCompanyDomain(companyName) {
  const cleaned = companyName
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|corp|co|company|technologies|tech|solutions|services|group)\.?$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  return `${cleaned}.com`;
}

/**
 * Enrich lead with all available data
 */
async function enrichLead(leadData) {
  logger.info(`Starting enrichment for: ${leadData.companyName}`);

  const enrichment = {
    websiteData: null,
    publicData: null,
    enrichedAt: new Date().toISOString(),
  };

  // Parallel enrichment attempts
  const [websiteData, publicData] = await Promise.allSettled([
    leadData.website ? scrapeWebsite(leadData.website) : Promise.resolve(null),
    fetchPublicCompanyData(leadData.companyName),
  ]);

  enrichment.websiteData = websiteData.status === 'fulfilled' ? websiteData.value : null;
  enrichment.publicData = publicData.status === 'fulfilled' ? publicData.value : null;

  logger.info(`Enrichment complete for: ${leadData.companyName}`);
  return enrichment;
}

module.exports = { enrichLead, scrapeWebsite };
