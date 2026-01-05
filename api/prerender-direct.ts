import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Direct Pre-rendering API - Works without rewrites
 * 
 * This endpoint can be called directly or via rewrites
 * It handles crawler detection and generates HTML
 * 
 * SIMPLER than catch-all route - easier to debug
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
 * (Full version with all pages)
 */
async function generatePageHTML(pathname: string): Promise<string> {
  let title = 'TrackMyStartup - Comprehensive Startup Tracking Platform';
  let description = 'Track your startup\'s growth journey. Monitor compliance, track investments, manage your startup ecosystem.';
  let ogImage = `${SITE_URL}/Track.png`;
  let structuredData: any = null;

  // Route-specific content generation (same as catch-all route)
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
  } else if (pathname === '/products') {
    title = 'Products - TrackMyStartup | Startup Management Solutions';
    description = 'Explore TrackMyStartup products and solutions for startup management, compliance tracking, and growth tools.';
  } else if (pathname === '/diagnostic') {
    title = 'Startup Diagnostic - TrackMyStartup | Assess Your Startup Health';
    description = 'Use our startup diagnostic tool to assess your startup\'s health, compliance status, and growth potential.';
  } else if (pathname === '/grant-opportunities') {
    title = 'Grant Opportunities - TrackMyStartup | Funding & Grants for Startups';
    description = 'Discover grant opportunities and funding programs for startups. Find grants, incubator programs, and investment opportunities.';
  } else if (pathname === '/blogs') {
    title = 'Blog - TrackMyStartup | Startup Insights & Resources';
    description = 'Read the latest startup insights, resources, and articles from TrackMyStartup. Learn about startup growth, funding, and best practices.';
  } else if (pathname === '/events') {
    title = 'Events - TrackMyStartup | Startup Events & Conferences';
    description = 'Discover startup events, conferences, and networking opportunities. Join TrackMyStartup events and connect with the startup community.';
  } else if (pathname === '/tms-virtual-conference' || pathname === '/events/tms-virtual-conference') {
    title = 'TMS Virtual Conference - TrackMyStartup | Startup Conference';
    description = 'Join the TrackMyStartup Virtual Conference. Connect with startups, investors, mentors, and industry experts.';
  } else if (pathname === '/privacy-policy') {
    title = 'Privacy Policy - TrackMyStartup | Data Protection & Privacy';
    description = 'Read TrackMyStartup\'s privacy policy. Learn how we protect your data and respect your privacy.';
  } else if (pathname === '/cancellation-refunds') {
    title = 'Cancellation & Refund Policy - TrackMyStartup';
    description = 'TrackMyStartup cancellation and refund policy. Learn about our refund process and cancellation terms.';
  } else if (pathname === '/shipping') {
    title = 'Shipping Policy - TrackMyStartup';
    description = 'TrackMyStartup shipping policy. Learn about our shipping terms and delivery information.';
  } else if (pathname === '/terms-conditions') {
    title = 'Terms & Conditions - TrackMyStartup | Terms of Service';
    description = 'Read TrackMyStartup\'s terms and conditions. Understand our terms of service and usage policies.';
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
        console.error('[PRERENDER-DIRECT] Error fetching mentors count:', error);
      }
    }
  } else if (pathname.startsWith('/startup/')) {
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
        console.error('[PRERENDER-DIRECT] Error fetching startup:', error);
      }
    }
  } else if (pathname.startsWith('/mentor/')) {
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
        console.error('[PRERENDER-DIRECT] Error fetching mentor:', error);
      }
    }
  } else if (pathname.startsWith('/investor/')) {
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
        console.error('[PRERENDER-DIRECT] Error fetching investor:', error);
      }
    }
  } else if (pathname.startsWith('/advisor/')) {
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
        console.error('[PRERENDER-DIRECT] Error fetching advisor:', error);
      }
    }
  } else if (pathname.startsWith('/blog/')) {
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
        console.error('[PRERENDER-DIRECT] Error fetching blog:', error);
      }
    }
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
      },
      'ca': {
        title: 'CA Services - TrackMyStartup | Chartered Accountant Services',
        description: 'Chartered Accountant services for startups. Get expert financial advice, tax planning, and compliance support.'
      },
      'cs': {
        title: 'CS Services - TrackMyStartup | Company Secretary Services',
        description: 'Company Secretary services for startups. Get expert corporate governance, compliance, and legal support.'
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get path from query param
    const pathname = (req.query.path as string) || '/';
    
    // Get user agent
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if crawler
    const isCrawlerRequest = isCrawler(userAgent);
    
    // Always log
    console.log('[PRERENDER-DIRECT] Request:', {
      pathname,
      userAgent: userAgent.substring(0, 100),
      isCrawler: isCrawlerRequest,
      method: req.method,
      url: req.url,
      query: req.query
    });
    
    // Generate HTML
    const html = await generatePageHTML(pathname);
    
    // Return HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'index, follow');
    
    return res.status(200).send(html);
  } catch (error) {
    console.error('[PRERENDER-DIRECT ERROR]', error);
    return res.status(500).send('Error generating page');
  }
}

