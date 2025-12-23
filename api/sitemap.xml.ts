import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Dynamic sitemap generator for SEO
 * This endpoint generates a sitemap.xml with all public profile URLs
 * 
 * Access at: https://www.trackmystartup.com/api/sitemap.xml
 */

const SITE_URL = 'https://www.trackmystartup.com';

// Helper function to create slug
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set content type to XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    // Start building sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[SITEMAP ERROR] Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      });
      // Return sitemap with just homepage if config is missing
      sitemap += `
</urlset>`;
      return res.status(200).send(sitemap);
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all startups (try public view first, fallback to startups table)
    try {
      let { data: startups, error: startupError } = await supabase
        .from('startups_public')
        .select('id, name, updated_at')
        .limit(1000);
      
      // Fallback to startups table if public view doesn't exist or fails
      if (startupError) {
        console.warn('[SITEMAP] startups_public failed, trying startups table:', startupError.message);
        const fallback = await supabase
          .from('startups')
          .select('id, name, updated_at')
          .limit(1000);
        startups = fallback.data;
        startupError = fallback.error;
      }

      if (startupError) {
        console.error('[SITEMAP ERROR] Failed to fetch startups:', startupError);
      } else if (startups && startups.length > 0) {
        console.log(`[SITEMAP] Found ${startups.length} startups`);
        for (const startup of startups) {
          if (startup.name) {
            const slug = createSlug(startup.name);
            const lastmod = startup.updated_at 
              ? new Date(startup.updated_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];
            
            sitemap += `
  <url>
    <loc>${SITE_URL}/startup/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          }
        }
      } else {
        console.warn('[SITEMAP] No startups found');
      }
    } catch (err) {
      console.error('[SITEMAP ERROR] Exception fetching startups:', err);
    }

    // Fetch all mentors
    try {
      const { data: mentors, error: mentorError } = await supabase
        .from('mentor_profiles')
        .select('user_id, mentor_name, updated_at')
        .limit(1000);

      if (mentorError) {
        console.error('[SITEMAP ERROR] Failed to fetch mentors:', mentorError);
      } else if (mentors && mentors.length > 0) {
        console.log(`[SITEMAP] Found ${mentors.length} mentors`);
        for (const mentor of mentors) {
          if (mentor.mentor_name) {
            const slug = createSlug(mentor.mentor_name);
            const lastmod = mentor.updated_at 
              ? new Date(mentor.updated_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];
            
            sitemap += `
  <url>
    <loc>${SITE_URL}/mentor/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          }
        }
      } else {
        console.warn('[SITEMAP] No mentors found');
      }
    } catch (err) {
      console.error('[SITEMAP ERROR] Exception fetching mentors:', err);
    }

    // Fetch all investors
    try {
      const { data: investors, error: investorError } = await supabase
        .from('investor_profiles')
        .select('user_id, investor_name, updated_at')
        .limit(1000);

      if (investorError) {
        console.error('[SITEMAP ERROR] Failed to fetch investors:', investorError);
      } else if (investors && investors.length > 0) {
        console.log(`[SITEMAP] Found ${investors.length} investors`);
        for (const investor of investors) {
          if (investor.investor_name) {
            const slug = createSlug(investor.investor_name);
            const lastmod = investor.updated_at 
              ? new Date(investor.updated_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];
            
            sitemap += `
  <url>
    <loc>${SITE_URL}/investor/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          }
        }
      } else {
        console.warn('[SITEMAP] No investors found');
      }
    } catch (err) {
      console.error('[SITEMAP ERROR] Exception fetching investors:', err);
    }

    // Fetch all advisors
    try {
      const { data: advisors, error: advisorError } = await supabase
        .from('investment_advisor_profiles')
        .select('user_id, firm_name, advisor_name, updated_at')
        .limit(1000);

      if (advisorError) {
        console.error('[SITEMAP ERROR] Failed to fetch advisors:', advisorError);
      } else if (advisors && advisors.length > 0) {
        console.log(`[SITEMAP] Found ${advisors.length} advisors`);
        for (const advisor of advisors) {
          // Use firm_name as primary, fallback to advisor_name
          const name = advisor.firm_name || advisor.advisor_name;
          if (name) {
            const slug = createSlug(name);
            const lastmod = advisor.updated_at 
              ? new Date(advisor.updated_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];
            
            sitemap += `
  <url>
    <loc>${SITE_URL}/advisor/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          }
        }
      } else {
        console.warn('[SITEMAP] No advisors found');
      }
    } catch (err) {
      console.error('[SITEMAP ERROR] Exception fetching advisors:', err);
    }

    // Close sitemap
    sitemap += `
</urlset>`;

    console.log('[SITEMAP] Generated successfully');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('[SITEMAP ERROR] Fatal error generating sitemap:', error);
    // Return a basic sitemap even on error
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  }
}

