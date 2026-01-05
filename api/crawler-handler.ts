/**
 * Vercel Edge Function for Crawler Pre-rendering
 * 
 * LONG-TERM, PRODUCTION-READY SOLUTION
 * 
 * Why Edge Functions:
 * - ✅ More reliable than vercel.json rewrites
 * - ✅ Runs on Vercel Edge Network (fast, global)
 * - ✅ Scales automatically with traffic
 * - ✅ Doesn't affect regular users
 * - ✅ No loading issues
 * - ✅ Works with high traffic
 * 
 * How it works:
 * 1. Intercepts requests at the edge
 * 2. Detects crawlers
 * 3. Generates pre-rendered HTML
 * 4. Returns HTML to crawlers
 * 5. Regular users get normal React app (no impact)
 */

export const config = {
  runtime: 'edge',
};

const SITE_URL = 'https://trackmystartup.com';

/**
 * Check if the request is from a crawler
 */
function isCrawler(userAgent: string | null): boolean {
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
 * This is a simplified version - you can enhance it with Supabase data
 */
async function generatePageHTML(pathname: string): Promise<string> {
  // Default values
  let title = 'TrackMyStartup - Comprehensive Startup Tracking Platform';
  let description = 'Track your startup\'s growth journey. Monitor compliance, track investments, manage your startup ecosystem.';
  let ogImage = `${SITE_URL}/Track.png`;
  let structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description,
    url: `${SITE_URL}${pathname === '/' ? '' : pathname}`
  };

  // Route-specific content
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
  } else if (pathname.startsWith('/startup/')) {
    const slug = pathname.replace('/startup/', '');
    title = `${slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Startup Profile | TrackMyStartup`;
    description = `View ${slug.split('-').join(' ')}'s startup profile on TrackMyStartup.`;
  } else if (pathname.startsWith('/mentor/')) {
    const slug = pathname.replace('/mentor/', '');
    title = `${slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Mentor Profile | TrackMyStartup`;
    description = `View ${slug.split('-').join(' ')}'s mentor profile on TrackMyStartup.`;
  } else if (pathname.startsWith('/investor/')) {
    const slug = pathname.replace('/investor/', '');
    title = `${slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Investor Profile | TrackMyStartup`;
    description = `View ${slug.split('-').join(' ')}'s investor profile on TrackMyStartup.`;
  } else if (pathname.startsWith('/advisor/')) {
    const slug = pathname.replace('/advisor/', '');
    title = `${slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Investment Advisor Profile | TrackMyStartup`;
    description = `View ${slug.split('-').join(' ')}'s investment advisor profile on TrackMyStartup.`;
  } else if (pathname.startsWith('/blog/')) {
    const slug = pathname.replace('/blog/', '');
    title = `${slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | TrackMyStartup Blog`;
    description = `Read ${slug.split('-').join(' ')} on TrackMyStartup blog.`;
  } else if (pathname.startsWith('/services/')) {
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
 * Main Edge Function handler
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    // Get URL and pathname
    const url = new URL(req.url);
    
    // Extract pathname from URL
    // When rewrite routes /about to /api/crawler-handler?path=/about, we need to get the original path
    // Check if there's a query parameter with the path
    let pathFromQuery = url.searchParams.get('path');
    
    // Ensure path starts with / and handle edge cases
    if (pathFromQuery) {
      // Remove leading slash if present (query param might have it)
      pathFromQuery = pathFromQuery.startsWith('/') ? pathFromQuery : '/' + pathFromQuery;
    }
    
    // Fallback: try to extract from pathname
    let pathname = pathFromQuery || url.pathname.replace('/api/crawler-handler', '') || '/';
    
    // Ensure pathname starts with /
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }
    
    // Get user agent
    const userAgent = req.headers.get('user-agent');
    
    // Check if crawler
    const isCrawlerRequest = isCrawler(userAgent);
    
    // Always log for debugging (helps diagnose issues)
    console.log('[EDGE FUNCTION] Request:', {
      pathname,
      originalPath: url.pathname,
      pathFromQuery,
      fullUrl: req.url,
      userAgent: userAgent?.substring(0, 100),
      isCrawler: isCrawlerRequest,
      allHeaders: Object.fromEntries(req.headers.entries())
    });
    
    // If not a crawler, return 404 so Vercel serves React app normally
    // This ensures regular users are NOT affected
    if (!isCrawlerRequest) {
      console.log('[EDGE FUNCTION] Not a crawler, returning 404');
      return new Response('Not a crawler', { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    console.log('[EDGE FUNCTION] Crawler detected, generating HTML for:', pathname);
    
    // Generate HTML for crawlers
    const html = await generatePageHTML(pathname);
    
    // Return HTML with proper headers
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Robots-Tag': 'index, follow',
        'X-Prerender-Served': 'true'
      }
    });
  } catch (error) {
    console.error('[EDGE FUNCTION ERROR]', error);
    
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
    
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
}

