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
    // Check both VITE_ and non-VITE_ versions (Vercel serverless functions may not expose VITE_ vars)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    // Debug: Log what we found (without exposing the actual key)
    console.log('[SITEMAP] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlSource: process.env.SUPABASE_URL ? 'SUPABASE_URL' : (process.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'none'),
      keySource: process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : (process.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : 'none'),
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseAnonKey?.length || 0,
      allSupabaseVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
    
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
    
    // Validate the key format (should be a JWT token)
    if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
      console.error('[SITEMAP ERROR] Invalid API key format - should start with "eyJ" (JWT token)');
      console.error('[SITEMAP ERROR] Key preview:', supabaseAnonKey.substring(0, 20) + '...');
      console.error('[SITEMAP ERROR] Key length:', supabaseAnonKey.length);
      // Return sitemap with just homepage if key format is wrong
      sitemap += `
</urlset>`;
      return res.status(200).send(sitemap);
    }
    
    // Validate URL format (should be a Supabase URL)
    if (supabaseUrl && (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co'))) {
      console.error('[SITEMAP ERROR] Invalid Supabase URL format');
      console.error('[SITEMAP ERROR] URL:', supabaseUrl);
      // Return sitemap with just homepage if URL format is wrong
      sitemap += `
</urlset>`;
      return res.status(200).send(sitemap);
    }
    
    // Test the connection before proceeding
    console.log('[SITEMAP] Testing Supabase connection...');
    const testSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try a simple query to verify the key works
    try {
      const { error: testError } = await testSupabase.from('startups_public').select('id').limit(1);
      if (testError && testError.message.includes('Invalid API key')) {
        console.error('[SITEMAP ERROR] API key validation failed:', {
          error: testError.message,
          hint: testError.hint,
          urlLength: supabaseUrl.length,
          keyLength: supabaseAnonKey.length,
          keyStartsWithEyJ: supabaseAnonKey.startsWith('eyJ'),
          urlFormat: supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')
        });
        // Return sitemap with just homepage if key doesn't work
        sitemap += `
</urlset>`;
        return res.status(200).send(sitemap);
      }
      console.log('[SITEMAP] Supabase connection test passed');
    } catch (testErr: any) {
      console.error('[SITEMAP ERROR] Connection test failed:', testErr);
    }
    
    const supabase = testSupabase;

    // Fetch all startups from existing public view (enhanced with updated_at)
    try {
      // Use existing startups_public view (enhanced with updated_at)
      let { data: startups, error: startupError } = await supabase
        .from('startups_public')
        .select('id, name, updated_at')
        .limit(1000);
      
      // If view doesn't have updated_at, try without it
      if (startupError && startupError.message.includes('updated_at')) {
        console.warn('[SITEMAP] startups_public view missing updated_at, trying without it');
        const viewRetry = await supabase
          .from('startups_public')
          .select('id, name')
          .limit(1000);
        startups = viewRetry.data;
        startupError = viewRetry.error;
      }
      
      // Final fallback to main table (if view doesn't exist)
      if (startupError) {
        console.warn('[SITEMAP] startups_public view failed, trying main startups table:', startupError.message);
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
            // Handle missing updated_at gracefully
            const lastmod = (startup as any).updated_at 
              ? new Date((startup as any).updated_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];
            
            sitemap += `
  <url>
    <loc>${SITE_URL}/startup/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          } else {
            console.warn(`[SITEMAP] Skipping startup ${startup.id} - missing name`);
          }
        }
      } else {
        console.warn('[SITEMAP] No startups found - check if startups exist in database and have names');
      }
    } catch (err) {
      console.error('[SITEMAP ERROR] Exception fetching startups:', err);
    }

    // Fetch all mentors from public table (secure and fast)
    try {
      // Try new public table first
      let { data: mentors, error: mentorError } = await supabase
        .from('mentors_public_table')
        .select('user_id, mentor_name, updated_at')
        .limit(1000);
      
      // Fallback to main table if public table doesn't exist yet
      if (mentorError && mentorError.message.includes('does not exist')) {
        console.warn('[SITEMAP] mentors_public_table not found, trying mentor_profiles');
        const fallback = await supabase
          .from('mentor_profiles')
          .select('user_id, mentor_name, updated_at')
          .limit(1000);
        mentors = fallback.data;
        mentorError = fallback.error;
      }

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

    // Fetch all investors from public table (secure and fast)
    try {
      // Try new public table first
      let { data: investors, error: investorError } = await supabase
        .from('investors_public_table')
        .select('user_id, investor_name, updated_at')
        .limit(1000);
      
      // Fallback to main table if public table doesn't exist yet
      if (investorError && investorError.message.includes('does not exist')) {
        console.warn('[SITEMAP] investors_public_table not found, trying investor_profiles');
        const fallback = await supabase
          .from('investor_profiles')
          .select('user_id, investor_name, updated_at')
          .limit(1000);
        investors = fallback.data;
        investorError = fallback.error;
      }

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

    // Fetch all advisors from public table (secure and fast)
    try {
      // Try new public table first
      let { data: advisors, error: advisorError } = await supabase
        .from('advisors_public_table')
        .select('user_id, display_name, updated_at')
        .limit(1000);
      
      // Fallback to main table if public table doesn't exist yet
      if (advisorError && advisorError.message.includes('does not exist')) {
        console.warn('[SITEMAP] advisors_public_table not found, trying investment_advisor_profiles');
        const fallback = await supabase
          .from('investment_advisor_profiles')
          .select('user_id, firm_name, advisor_name, updated_at')
          .limit(1000);
        advisors = fallback.data;
        advisorError = fallback.error;
      }

      if (advisorError) {
        console.error('[SITEMAP ERROR] Failed to fetch advisors:', advisorError);
      } else if (advisors && advisors.length > 0) {
        console.log(`[SITEMAP] Found ${advisors.length} advisors`);
        for (const advisor of advisors) {
          // Use display_name from public table, or fallback to firm_name/advisor_name
          const name = (advisor as any).display_name || (advisor as any).firm_name || (advisor as any).advisor_name;
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

