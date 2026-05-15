import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Pre-rendering API for Search Engine Crawlers
 * 
 * This endpoint generates static HTML for crawlers when they visit your React SPA
 * It fetches data from Supabase and generates HTML with meta tags
 */

const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://trackmystartup.com';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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
  if (pathname === '/') {
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
        
        if (count) {
          description = `Browse our network of ${count}+ expert mentors. Connect with experienced advisors, industry experts, and startup mentors.`;
        }
      } catch (err) {
        console.error('Error fetching mentors count:', err);
      }
    }
  } else if (pathname.startsWith('/services/')) {
    const serviceName = pathname.replace('/services/', '').replace(/-/g, ' ');
    title = `For ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} - TrackMyStartup`;
    description = `Comprehensive platform for ${serviceName} to manage and track startup ecosystem activities.`;
  } else if (pathname.startsWith('/mentor/')) {
    const slug = pathname.replace('/mentor/', '');
    // Fetch mentor data
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: mentors } = await supabase
          .from('mentors_public_table')
          .select('mentor_name, location, expertise_areas, years_of_experience')
          .limit(1000);
        
        if (mentors) {
          // Find mentor by slug
          const mentor = mentors.find(m => {
            const mentorSlug = (m.mentor_name || '').toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            return mentorSlug === slug;
          });
          
          if (mentor) {
            title = `${mentor.mentor_name} - Mentor Profile | TrackMyStartup`;
            description = `${mentor.mentor_name}${mentor.location ? ` is a mentor based in ${mentor.location}` : ' is a mentor'}.`;
            if (mentor.expertise_areas && mentor.expertise_areas.length > 0) {
              description += ` Expertise: ${mentor.expertise_areas.join(', ')}.`;
            }
            if (mentor.years_of_experience) {
              description += ` ${mentor.years_of_experience} years of experience.`;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching mentor data:', err);
      }
    }
  } else if (pathname.startsWith('/startup/')) {
    const slug = pathname.replace('/startup/', '');
    // Fetch startup data
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: startups } = await supabase
          .from('startups_public')
          .select('name, sector, description')
          .limit(1000);
        
        if (startups) {
          const startup = startups.find(s => {
            const startupSlug = (s.name || '').toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            return startupSlug === slug;
          });
          
          if (startup) {
            title = `${startup.name} - Startup Profile | TrackMyStartup`;
            description = startup.description || `${startup.name}${startup.sector ? ` is a ${startup.sector} startup` : ' is a startup'}.`;
          }
        }
      } catch (err) {
        console.error('Error fetching startup data:', err);
      }
    }
  } else if (pathname.startsWith('/investor/')) {
    const slug = pathname.replace('/investor/', '');
    // Fetch investor data
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: investors } = await supabase
          .from('investors_public_table')
          .select('firm_name, location, firm_type, ticket_size')
          .limit(1000);
        
        if (investors) {
          const investor = investors.find(i => {
            const investorSlug = (i.firm_name || '').toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            return investorSlug === slug;
          });
          
          if (investor) {
            title = `${investor.firm_name} - Investor Profile | TrackMyStartup`;
            description = `${investor.firm_name}${investor.location ? ` is an investor firm based in ${investor.location}` : ' is an investor firm'}.`;
            if (investor.firm_type) {
              description += ` Type: ${investor.firm_type}.`;
            }
            if (investor.ticket_size) {
              description += ` Ticket size: ${investor.ticket_size}.`;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching investor data:', err);
      }
    }
  } else if (pathname.startsWith('/advisor/')) {
    const slug = pathname.replace('/advisor/', '');
    // Fetch advisor data
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: advisors } = await supabase
          .from('advisors_public_table')
          .select('firm_name, location, firm_type')
          .limit(1000);
        
        if (advisors) {
          const advisor = advisors.find(a => {
            const advisorSlug = (a.firm_name || '').toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            return advisorSlug === slug;
          });
          
          if (advisor) {
            title = `${advisor.firm_name} - Investment Advisor Profile | TrackMyStartup`;
            description = `${advisor.firm_name}${advisor.location ? ` is an investment advisor firm based in ${advisor.location}` : ' is an investment advisor firm'}.`;
            if (advisor.firm_type) {
              description += ` Type: ${advisor.firm_type}.`;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching advisor data:', err);
      }
    }
  } else if (pathname === '/explore') {
    title = 'Explore Profiles - TrackMyStartup | Discover Startups, Mentors, Investors & Advisors';
    description = 'Explore and discover startups, mentors, investors, and investment advisors on TrackMyStartup.';
  } else if (pathname.startsWith('/events/')) {
    const slug = pathname.replace('/events/', '');
    // Fetch event data
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: events } = await supabase
          .from('events')
          .select('title, description, event_date')
          .eq('slug', slug)
          .limit(1);
        
        if (events && events.length > 0) {
          const event = events[0];
          title = `${event.title} - Event | TrackMyStartup`;
          description = event.description || `Join us for ${event.title}.`;
          if (event.event_date) {
            description += ` Event date: ${new Date(event.event_date).toLocaleDateString()}.`;
          }
        }
      } catch (err) {
        console.error('Error fetching event data:', err);
      }
    }
  } else if (pathname === '/blogs') {
    title = 'Blog - TrackMyStartup | Startup Insights, Fundraising Tips & Ecosystem News';
    description = 'Read the latest insights on startups, fundraising, mentorship, compliance, and ecosystem development.';
  } else if (pathname === '/events') {
    title = 'Events - TrackMyStartup | Startup Events, Conferences & Networking';
    description = 'Discover upcoming startup events, conferences, networking opportunities, and ecosystem gatherings.';
  } else if (pathname === '/grant-opportunities') {
    title = 'Grant Opportunities - TrackMyStartup | Startup Grants & Funding';
    description = 'Explore grant opportunities, funding programs, and financial support for startups and entrepreneurs.';
  } else if (pathname === '/tms-virtual-conference') {
    title = 'TMS Virtual Conference - TrackMyStartup | Virtual Startup Conference';
    description = 'Join TrackMyStartup Virtual Conference. Connect with investors, mentors, and startups from around the world.';
  } else if (pathname === '/products') {
    title = 'Products - TrackMyStartup | Our Solutions & Services';
    description = 'Explore TrackMyStartup products and services for startups, investors, mentors, and advisors.';
  } else if (pathname === '/diagnostic') {
    title = 'Diagnostic - TrackMyStartup | Network & System Diagnostics';
    description = 'Diagnostic tools and network testing for TrackMyStartup platform.';
  } else if (pathname === '/privacy-policy') {
    title = 'Privacy Policy - TrackMyStartup | How We Protect Your Data';
    description = 'Read TrackMyStartup privacy policy. Learn how we collect, use, and protect your personal information.';
  } else if (pathname === '/terms-conditions') {
    title = 'Terms & Conditions - TrackMyStartup | Terms of Service';
    description = 'Read TrackMyStartup terms and conditions. Understand our terms of service and user agreements.';
  } else if (pathname === '/cancellation-refunds') {
    title = 'Cancellation & Refund Policy - TrackMyStartup';
    description = 'TrackMyStartup cancellation and refund policy. Learn about our refund process and cancellation terms.';
  } else if (pathname === '/shipping') {
    title = 'Shipping Policy - TrackMyStartup';
    description = 'TrackMyStartup shipping policy and delivery information.';
  } else if (pathname.startsWith('/services/')) {
    const serviceName = pathname.replace('/services/', '').replace(/-/g, ' ');
    if (serviceName === 'startups') {
      title = 'For Startups - TrackMyStartup | Startup Management Platform';
      description = 'Comprehensive platform for startups to manage compliance, track investments, and grow their business.';
    } else if (serviceName === 'investors') {
      title = 'For Investors - TrackMyStartup | Investor Dashboard & Portfolio Management';
      description = 'Powerful tools for investors to manage portfolios, track investments, and discover new opportunities.';
    } else if (serviceName === 'mentors') {
      title = 'For Mentors - TrackMyStartup | Mentor Network & Management';
      description = 'Platform for mentors to connect with startups, manage mentorship relationships, and grow their network.';
    } else if (serviceName === 'investment-advisors') {
      title = 'For Investment Advisors - TrackMyStartup | Advisor Platform';
      description = 'Comprehensive platform for investment advisors to manage clients, track deals, and grow their practice.';
    } else if (serviceName === 'incubation-centers') {
      title = 'For Incubation Centers - TrackMyStartup | Incubator Management';
      description = 'Platform for incubation centers to manage startups, track progress, and support ecosystem growth.';
    } else {
      title = `For ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} - TrackMyStartup`;
      description = `Comprehensive platform for ${serviceName} to manage and track startup ecosystem activities.`;
    }
  } else if (pathname.startsWith('/blogs/')) {
    const slug = pathname.replace('/blogs/', '');
    // Fetch blog data
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: blog } = await supabase
          .from('blogs')
          .select('title, excerpt, content')
          .eq('slug', slug)
          .single();
        
        if (blog) {
          title = `${blog.title} | TrackMyStartup Blog`;
          description = blog.excerpt || (blog.content?.substring(0, 160) || '');
        }
      } catch (err) {
        console.error('Error fetching blog data:', err);
      }
    }
  }

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDescription}" />
  <meta name="robots" content="index, follow" />
  
  <!-- Open Graph Tags -->
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:url" content="${SITE_URL}${pathname}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${ogImage}" />
  
  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  <meta name="twitter:image" content="${ogImage}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${SITE_URL}${pathname}" />
  
  ${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : ''}
  
  <link rel="icon" type="image/png" href="/Track.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .prerender-content {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }
    .prerender-content h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 1rem;
    }
    .prerender-content p {
      font-size: 1.125rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    .prerender-content .loading-note {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="prerender-content">
      <h1>${escapedTitle}</h1>
      <p>${escapedDescription}</p>
      <div style="margin-top: 2rem; padding: 1.5rem; background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #64748b; font-size: 0.875rem;">This page contains comprehensive information about TrackMyStartup, including our mission, vision, values, and journey. The full interactive content is loading...</p>
      </div>
    </div>
  </div>
  <!-- Script tag removed for crawlers - they don't need JavaScript -->
  <!-- Normal users will get the React app from the main index.html -->
  <noscript>
    <div class="prerender-content">
      <h1>TrackMyStartup</h1>
      <p>Please enable JavaScript to view this site.</p>
    </div>
  </noscript>
</body>
</html>`;

  return html;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathname = req.query.path as string || '/';
    const userAgent = req.query.userAgent as string || req.headers['user-agent'] || '';
    
    // Log for debugging
    console.log('[PRERENDER] Request received:', {
      pathname,
      userAgent: userAgent.substring(0, 100), // Log first 100 chars
      method: req.method,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent']?.substring(0, 100)
      }
    });
    
    // Generate HTML for the page
    const html = await generatePageHTML(pathname);
    
    // Set headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('X-Prerender-Served', 'true'); // Debug header
    
    // Return HTML
    return res.status(200).send(html);
  } catch (error) {
    console.error('[PRERENDER ERROR]', error);
    
    // Fallback: Return basic HTML
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
  <!-- Script tag removed for crawlers -->
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
}

