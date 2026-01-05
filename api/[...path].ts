import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Catch-all API route for crawler detection and pre-rendering
 * 
 * This route intercepts ALL requests and:
 * 1. Detects if the request is from a crawler
 * 2. If crawler → Returns pre-rendered HTML
 * 3. If not crawler → Returns 404 (so Vercel serves the React app normally)
 * 
 * This is more reliable than vercel.json rewrites because:
 * - We have full control over detection logic
 * - Can handle edge cases better
 * - Works for all paths automatically
 */

const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://trackmystartup.com';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/**
 * Check if the request is from a crawler
 */
function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  
  const crawlerPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'sogou',
    'exabot',
    'facebot',
    'ia_archiver',
    'twitterbot',
    'linkedinbot',
    'applebot',
    'facebookexternalhit',
    'rogerbot',
    'semrushbot',
    'ahrefsbot',
    'mj12bot',
    'dotbot',
    'petalbot',
    'megaindex',
    'blexbot',
    'crawler',
    'spider',
    'bot'
  ];
  
  const ua = userAgent.toLowerCase();
  return crawlerPatterns.some(pattern => ua.includes(pattern));
}

/**
 * Generate HTML for a specific page
 */
async function generatePageHTML(pathname: string): Promise<string> {
  // Get page-specific data and meta tags
  let title = 'TrackMyStartup - Comprehensive Startup Tracking Platform';
  let description = 'Track your startup\'s growth journey. Monitor compliance, track investments, manage your startup ecosystem.';
  let ogImage = `${SITE_URL}/Track.png`;
  let structuredData: any = null;

  // Route-specific content generation
  if (pathname === '/' || pathname === '') {
    title = 'TrackMyStartup - Comprehensive Startup Tracking Platform';
    description = 'Track your startup\'s growth journey. Monitor compliance, track investments, manage your startup ecosystem. Connect startups, investors, mentors, and advisors.';
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'TrackMyStartup',
      description: description,
      url: SITE_URL,
      logo: `${SITE_URL}/Track.png`
    };
  } else if (pathname === '/about') {
    title = 'About Us - TrackMyStartup | Our Mission, Vision & Journey';
    description = 'Track My Startup is a comprehensive platform designed to support early-stage startups and mentor first-time founders. We bridge the gap between academia and industry through startup facilitation, research collaboration, student entrepreneurship, and professional training programs.';
  } else if (pathname === '/contact') {
    title = 'Contact Us - TrackMyStartup | Get in Touch';
    description = 'Get in touch with TrackMyStartup. Contact our team for support, partnerships, or inquiries.';
  } else if (pathname === '/unified-mentor-network') {
    title = 'Unified Mentor Network - TrackMyStartup | Connect with Expert Mentors';
    description = 'Browse our unified network of expert mentors. Connect with experienced advisors, industry experts, and startup mentors.';
    
    // Fetch mentors count for better SEO
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { count } = await supabase
          .from('mentors_public_table')
          .select('*', { count: 'exact', head: true });
        if (count && count > 0) {
          description = `Browse our network of ${count}+ expert mentors. Connect with experienced advisors, industry experts, and startup mentors.`;
        }
      } catch (error) {
        console.error('[PRERENDER] Error fetching mentors count:', error);
      }
    }
  } else if (pathname.startsWith('/startup/')) {
    // Dynamic startup profile
    const slug = pathname.replace('/startup/', '');
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await supabase
          .from('startups_public')
          .select('id, name, description, sector, valuation, investment_ask, equity_offered, website, location')
          .eq('slug', slug)
          .single();
        
        if (data) {
          title = `${data.name} - Startup Profile | TrackMyStartup`;
          description = data.description || `View ${data.name}'s startup profile on TrackMyStartup. ${data.sector ? `Sector: ${data.sector}.` : ''}`;
        }
      } catch (error) {
        console.error('[PRERENDER] Error fetching startup:', error);
      }
    }
  } else if (pathname.startsWith('/mentor/')) {
    // Dynamic mentor profile
    const slug = pathname.replace('/mentor/', '');
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await supabase
          .from('mentors_public_table')
          .select('id, name, bio, expertise, location, linkedin')
          .eq('slug', slug)
          .single();
        
        if (data) {
          title = `${data.name} - Mentor Profile | TrackMyStartup`;
          description = data.bio || `View ${data.name}'s mentor profile on TrackMyStartup. ${data.expertise ? `Expertise: ${data.expertise}.` : ''}`;
        }
      } catch (error) {
        console.error('[PRERENDER] Error fetching mentor:', error);
      }
    }
  } else if (pathname.startsWith('/investor/')) {
    // Dynamic investor profile
    const slug = pathname.replace('/investor/', '');
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await supabase
          .from('investors_public_table')
          .select('id, firm_name, description, firm_type, ticket_size, sector_focus, website')
          .eq('slug', slug)
          .single();
        
        if (data) {
          title = `${data.firm_name} - Investor Profile | TrackMyStartup`;
          description = data.description || `View ${data.firm_name}'s investor profile on TrackMyStartup.`;
        }
      } catch (error) {
        console.error('[PRERENDER] Error fetching investor:', error);
      }
    }
  } else if (pathname.startsWith('/advisor/')) {
    // Dynamic advisor profile
    const slug = pathname.replace('/advisor/', '');
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await supabase
          .from('advisors_public_table')
          .select('id, advisor_name, firm_name, description, services, website')
          .eq('slug', slug)
          .single();
        
        if (data) {
          const displayName = data.advisor_name || data.firm_name;
          title = `${displayName} - Investment Advisor Profile | TrackMyStartup`;
          description = data.description || `View ${displayName}'s investment advisor profile on TrackMyStartup.`;
        }
      } catch (error) {
        console.error('[PRERENDER] Error fetching advisor:', error);
      }
    }
  } else if (pathname.startsWith('/blog/')) {
    // Dynamic blog post
    const slug = pathname.replace('/blog/', '');
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await supabase
          .from('blogs')
          .select('id, title, excerpt, author, published_at')
          .eq('slug', slug)
          .single();
        
        if (data) {
          title = `${data.title} | TrackMyStartup Blog`;
          description = data.excerpt || `Read ${data.title} on TrackMyStartup blog.`;
        }
      } catch (error) {
        console.error('[PRERENDER] Error fetching blog:', error);
      }
    }
  } else if (pathname.startsWith('/services/')) {
    // Service pages
    const service = pathname.replace('/services/', '');
    const serviceNames: Record<string, { title: string; description: string }> = {
      'startups': {
        title: 'Startup Services - TrackMyStartup | Comprehensive Startup Solutions',
        description: 'Comprehensive startup services including compliance tracking, investment management, and growth tools.'
      },
      'investors': {
        title: 'Investor Services - TrackMyStartup | Investment Management Platform',
        description: 'Investment management platform for investors. Track portfolio companies, manage deals, and discover opportunities.'
      },
      'mentors': {
        title: 'Mentor Services - TrackMyStartup | Mentor Network Platform',
        description: 'Connect with startups as a mentor. Share expertise, guide founders, and grow your network.'
      },
      'investment-advisors': {
        title: 'Investment Advisor Services - TrackMyStartup | Professional Advisory Platform',
        description: 'Professional investment advisory services. Connect with startups and investors, manage advisory relationships.'
      },
      'incubation-centers': {
        title: 'Incubation Center Services - TrackMyStartup | Startup Incubation Platform',
        description: 'Incubation center services. Manage cohorts, track startup progress, and facilitate growth.'
      }
    };
    
    if (serviceNames[service]) {
      title = serviceNames[service].title;
      description = serviceNames[service].description;
    }
  }

  // Generate structured data if not already set
  if (!structuredData) {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: description,
      url: `${SITE_URL}${pathname === '/' ? '' : pathname}`
    };
  }

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/Track.png" />
  
  <!-- SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index, follow" />
  <meta name="author" content="TrackMyStartup" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${SITE_URL}${pathname === '/' ? '' : pathname}" />
  <meta property="og:image" content="${ogImage}" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${SITE_URL}${pathname === '/' ? '' : pathname}" />
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
  </script>
  
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
</head>
<body>
  <div id="root">
    <div style="padding: 40px 20px; text-align: center; font-family: Inter, system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto;">
      <h1 style="font-size: 2rem; font-weight: bold; color: #1e293b; margin-bottom: 1rem;">${title.split('|')[0].trim()}</h1>
      <p style="font-size: 1.125rem; color: #475569; margin-bottom: 1rem; line-height: 1.6;">${description}</p>
      <p style="font-size: 0.875rem; color: #64748b; margin-top: 2rem;">Please enable JavaScript to view the full interactive content.</p>
    </div>
  </div>
  <!-- Note: Script tag removed for crawlers - they don't need JavaScript -->
</body>
</html>`;

  return html;
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get path from query params (catch-all route)
    // When rewrite routes /about to /api/about, the path becomes ['about']
    const pathArray = req.query.path as string[] || [];
    const pathname = '/' + pathArray.join('/');
    
    // Get user agent
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if crawler
    const isCrawlerRequest = isCrawler(userAgent);
    
    // Log for debugging
    console.log('[CATCH-ALL] Request:', {
      pathname,
      userAgent: userAgent.substring(0, 100),
      isCrawler: isCrawlerRequest,
      method: req.method,
      query: req.query
    });
    
    // If not a crawler, return 404 so Vercel serves the React app normally
    if (!isCrawlerRequest) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'This API route is only for crawlers. Regular users should access the site normally.'
      });
    }
    
    // Generate HTML for crawlers
    const html = await generatePageHTML(pathname);
    
    // Set headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('X-Prerender-Served', 'true');
    
    // Return HTML
    return res.status(200).send(html);
  } catch (error) {
    console.error('[CATCH-ALL ERROR]', error);
    
    // Fallback HTML
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TrackMyStartup</title>
  <meta name="description" content="Track your startup's growth journey. Monitor compliance, track investments, manage your startup ecosystem." />
  <meta name="robots" content="index, follow" />
  <link rel="icon" type="image/png" href="/Track.png" />
</head>
<body>
  <div id="root">
    <div style="padding: 40px; text-align: center; font-family: system-ui, sans-serif;">
      <h1>TrackMyStartup</h1>
      <p>Comprehensive startup tracking platform for investors, founders, and professionals.</p>
      <p>Please enable JavaScript to view this site.</p>
    </div>
  </div>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
}

