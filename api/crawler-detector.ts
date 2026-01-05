import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Crawler Detection API
 * 
 * This endpoint checks if a request is from a crawler
 * Used by middleware or other services to determine if pre-rendering is needed
 */

// List of known crawler user agents
const CRAWLER_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot', // Facebook
  'ia_archiver', // Alexa
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'applebot',
  'facebookexternalhit',
  'rogerbot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'megaindex',
  'blexbot',
  'petalbot',
  'adsbot-google',
  'mediapartners-google',
  'apis-google',
  'feedfetcher-google',
  'google-inspectiontool',
  'google page speed',
  'lighthouse',
  'pingdom',
  'gtmetrix',
  'screaming frog',
  'sitebulb',
  'deepcrawl',
  'siteimprove',
  'sentry',
  'newrelic',
  'datadog',
  'uptimerobot',
  'monitor',
  'crawler',
  'spider',
  'bot',
  'scraper',
  'fetcher',
  'indexer',
  'archiver'
];

/**
 * Check if the request is from a search engine crawler
 */
function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(crawler => ua.includes(crawler));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent'] || '';
  const isCrawlerRequest = isCrawler(userAgent);
  
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    isCrawler: isCrawlerRequest,
    userAgent: userAgent
  });
}

