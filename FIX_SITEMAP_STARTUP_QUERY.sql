-- FIX_SITEMAP_STARTUP_QUERY.sql
-- Fix startups_public view to include updated_at column needed for sitemap

-- Drop and recreate the view with updated_at column
DROP VIEW IF EXISTS public.startups_public;

-- Create view with updated_at column (needed for sitemap lastmod)
CREATE VIEW public.startups_public AS
SELECT 
    id,                    -- Needed for joins and operations
    name,                  -- Company name (required for slug generation)
    sector,                -- Sector/Industry
    current_valuation,     -- Valuation
    currency,              -- Currency for formatting
    compliance_status,     -- For Verified badge
    updated_at             -- Last modification date (needed for sitemap)
    -- NOTE: pitch_video_url is in fundraising_details table, not startups
    -- NOTE: Other columns like description, total_funding, total_revenue, 
    -- registration_date, investment_type, etc. are NOT included
FROM public.startups;

-- Grant SELECT permission on the view to anon role
GRANT SELECT ON public.startups_public TO anon;

-- Verify the view is accessible
-- Run this to test: SET ROLE anon; SELECT COUNT(*) FROM startups_public;


