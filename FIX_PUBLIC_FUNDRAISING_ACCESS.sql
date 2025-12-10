-- FIX_PUBLIC_FUNDRAISING_ACCESS.sql
-- Comprehensive fix for public access to fundraising details
-- This ensures all buttons and information are visible to public users
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. UPDATE PUBLIC VIEW WITH ALL NEW FIELDS
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS public.fundraising_details_public;

-- Create updated view with ALL necessary fields for public display
CREATE VIEW public.fundraising_details_public AS
SELECT 
    id,                    -- Needed for operations
    startup_id,            -- Needed for joins
    active,                -- Active badge
    type,                  -- Round type (Pre-Seed, Seed, etc.)
    value,                 -- Investment ask amount
    equity,                -- Investment ask equity %
    domain,                -- Domain/Industry
    stage,                 -- Stage (MVP, Growth, etc.)
    pitch_deck_url,        -- Pitch deck link
    pitch_video_url,       -- Pitch video URL
    logo_url,              -- Company logo URL
    business_plan_url,     -- Business plan URL
    website_url,           -- Website URL
    linkedin_url,          -- LinkedIn URL
    one_pager_url,         -- One-pager URL
    created_at             -- Needed for ordering (to get latest fundraising details)
FROM public.fundraising_details;

-- Grant SELECT permission on the view to anon role
GRANT SELECT ON public.fundraising_details_public TO anon;

-- =====================================================
-- 2. FIX RLS POLICIES FOR DIRECT TABLE ACCESS
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE public.fundraising_details ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policy if it exists (to recreate it properly)
DROP POLICY IF EXISTS "fundraising_details_public_read" ON public.fundraising_details;
DROP POLICY IF EXISTS "Public can view fundraising details" ON public.fundraising_details;

-- Create policy that allows anonymous users to read ALL fundraising details
-- (Not just active ones - this allows public to see all fundraising info)
CREATE POLICY "fundraising_details_public_read" ON public.fundraising_details
    FOR SELECT
    TO anon
    USING (true); -- Allow public to see all fundraising details

-- Ensure authenticated users can also read all fundraising details
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_authenticated_read'
    ) THEN
        CREATE POLICY "fundraising_details_authenticated_read" ON public.fundraising_details
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Grant SELECT permission to anon role on the table (in addition to view)
GRANT SELECT ON public.fundraising_details TO anon;

-- =====================================================
-- 3. VERIFY THE VIEW WAS UPDATED
-- =====================================================

SELECT '=== VERIFIED UPDATED PUBLIC VIEW ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'fundraising_details_public'
ORDER BY ordinal_position;

-- =====================================================
-- 4. VERIFY RLS POLICIES
-- =====================================================

SELECT '=== VERIFIED RLS POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause
FROM pg_policies 
WHERE tablename = 'fundraising_details'
    AND (policyname LIKE '%public%' OR policyname LIKE '%authenticated%')
ORDER BY policyname;

-- =====================================================
-- 5. VERIFY PERMISSIONS
-- =====================================================

SELECT '=== VERIFIED PERMISSIONS ===' as info;
SELECT 
    has_table_privilege('anon', 'fundraising_details', 'SELECT') as anon_can_select_table,
    has_table_privilege('anon', 'fundraising_details_public', 'SELECT') as anon_can_select_view,
    has_table_privilege('authenticated', 'fundraising_details', 'SELECT') as auth_can_select_table;

-- =====================================================
-- 6. TEST QUERY (Should work for anon role)
-- =====================================================

SELECT '=== TEST: Can read fundraising_details ===' as info;
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN active = true THEN 1 END) as active_records
FROM public.fundraising_details;

-- Show sample data structure
SELECT '=== SAMPLE DATA STRUCTURE ===' as info;
SELECT 
    id,
    startup_id,
    active,
    type,
    value,
    equity,
    domain,
    stage,
    CASE WHEN pitch_deck_url IS NOT NULL THEN 'Has Deck' ELSE 'No Deck' END as deck_status,
    CASE WHEN business_plan_url IS NOT NULL THEN 'Has Plan' ELSE 'No Plan' END as plan_status,
    CASE WHEN one_pager_url IS NOT NULL THEN 'Has One-Pager' ELSE 'No One-Pager' END as onepager_status,
    CASE WHEN logo_url IS NOT NULL THEN 'Has Logo' ELSE 'No Logo' END as logo_status
FROM public.fundraising_details 
WHERE active = true 
LIMIT 5;

