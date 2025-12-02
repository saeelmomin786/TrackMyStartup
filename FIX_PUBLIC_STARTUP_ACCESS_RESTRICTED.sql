-- FIX_PUBLIC_STARTUP_ACCESS_RESTRICTED.sql
-- Add RLS policies to allow PUBLIC (unauthenticated) users to read ONLY specific fields
-- This restricts public access to only the data needed for the public startup page

-- =====================================================
-- 1. CREATE PUBLIC VIEW FOR STARTUPS (Limited Columns)
-- =====================================================

-- Drop view if exists
DROP VIEW IF EXISTS public.startups_public;

-- Create a view with only public-accessible columns
-- These are the ONLY fields that will be publicly accessible
-- NOTE: pitch_video_url is NOT in startups table, it's in fundraising_details
CREATE VIEW public.startups_public AS
SELECT 
    id,                    -- Needed for joins and operations
    name,                  -- Company name
    sector,                -- Sector/Industry
    current_valuation,     -- Valuation
    currency,              -- Currency for formatting
    compliance_status      -- For Verified badge
    -- NOTE: pitch_video_url is in fundraising_details table, not startups
    -- NOTE: Other columns like description, total_funding, total_revenue, 
    -- registration_date, investment_type, etc. are NOT included
FROM public.startups;

-- Grant SELECT permission on the view to anon role
GRANT SELECT ON public.startups_public TO anon;

-- =====================================================
-- 2. CREATE PUBLIC VIEW FOR FUNDRAISING_DETAILS (Limited Columns)
-- =====================================================

-- Drop view if exists
DROP VIEW IF EXISTS public.fundraising_details_public;

-- Create a view with only public-accessible columns
-- These are the ONLY fields that will be publicly accessible
CREATE VIEW public.fundraising_details_public AS
SELECT 
    id,                    -- Needed for operations
    startup_id,            -- Needed for joins
    active,                -- Active badge
    type,                  -- Round type (Pre-Seed, Seed, etc.)
    value,                 -- Investment ask amount
    equity,                -- Investment ask equity %
    stage,                 -- Stage (MVP, Growth, etc.)
    pitch_deck_url,        -- Pitch deck link
    pitch_video_url,       -- Pitch video URL (if different from startup's)
    created_at             -- Needed for ordering (to get latest fundraising details)
    -- NOTE: Other columns like domain, validation_requested, updated_at, etc. are NOT included
FROM public.fundraising_details;

-- Grant SELECT permission on the view to anon role
GRANT SELECT ON public.fundraising_details_public TO anon;

-- =====================================================
-- 3. UPDATE RLS POLICIES FOR TABLES (Keep Restricted)
-- =====================================================

-- For startups table: Only allow authenticated users to read full data
-- Anonymous users should use the view instead
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- Drop only the conflicting read policies (keep management policies)
DROP POLICY IF EXISTS "startups_public_read" ON public.startups;
DROP POLICY IF EXISTS "startups_select_all" ON public.startups;
DROP POLICY IF EXISTS "Public can view startups" ON public.startups;
DROP POLICY IF EXISTS "startups_authenticated_read" ON public.startups;
DROP POLICY IF EXISTS "startups_read_all" ON public.startups;
-- NOTE: We do NOT drop management policies like:
-- - "Users can view their own startups"
-- - "Users can insert their own startups"
-- - "Users can update their own startups"
-- - "Users can delete their own startups"
-- - "startups_manage_own"
-- These will remain and work alongside the new read policy

-- Create policy that allows authenticated users to read startups
-- (Anonymous users will use the view)
-- This works alongside existing management policies
CREATE POLICY "startups_authenticated_read" ON public.startups
    FOR SELECT
    TO authenticated
    USING (true);

-- For fundraising_details table: Only allow authenticated users to read full data
-- Anonymous users should use the view instead
ALTER TABLE public.fundraising_details ENABLE ROW LEVEL SECURITY;

-- Drop only the conflicting read policies (keep management policies)
DROP POLICY IF EXISTS "fundraising_details_public_read" ON public.fundraising_details;
DROP POLICY IF EXISTS "Public can view fundraising details" ON public.fundraising_details;
DROP POLICY IF EXISTS "fundraising_details_authenticated_read" ON public.fundraising_details;
DROP POLICY IF EXISTS "fundraising_details_read_all" ON public.fundraising_details;
-- NOTE: We do NOT drop management policies like:
-- - "fundraising_details_owner_manage"
-- - "Users can view their own startup's fundraising details"
-- - "Users can insert their own fundraising details"
-- - "Users can update their own fundraising details"
-- - "Users can delete their own fundraising details"
-- These will remain and work alongside the new read policy

-- Create policy that allows authenticated users to read fundraising_details
-- (Anonymous users will use the view)
-- This works alongside existing management policies
CREATE POLICY "fundraising_details_authenticated_read" ON public.fundraising_details
    FOR SELECT
    TO authenticated
    USING (true);

-- =====================================================
-- 4. VERIFY VIEWS AND POLICIES
-- =====================================================

SELECT '=== VERIFIED PUBLIC VIEWS ===' as info;
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('startups_public', 'fundraising_details_public')
ORDER BY table_name;

SELECT '=== VERIFIED STARTUPS POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

SELECT '=== VERIFIED FUNDRAISING_DETAILS POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- =====================================================
-- 5. TEST QUERIES
-- =====================================================

-- Test that we can read from public views (as anon)
SELECT '=== TEST: Can read from startups_public view ===' as info;
SELECT COUNT(*) as startup_count FROM public.startups_public;

-- Test that we can read from fundraising_details_public view (as anon)
SELECT '=== TEST: Can read from fundraising_details_public view ===' as info;
SELECT COUNT(*) as fundraising_count FROM public.fundraising_details_public;

-- Test join query using public views (what PublicStartupPage should use)
SELECT '=== TEST: Join query using public views ===' as info;
SELECT 
    s.id,
    s.name,
    s.sector,
    s.current_valuation,
    s.currency,
    s.compliance_status,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    fd.stage,
    fd.pitch_deck_url,
    fd.pitch_video_url as fundraising_pitch_video_url,
    fd.created_at
FROM public.startups_public s
LEFT JOIN public.fundraising_details_public fd ON s.id = fd.startup_id
WHERE s.id = 181
LIMIT 1;

