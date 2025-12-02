-- FIX_PUBLIC_STARTUP_ACCESS.sql
-- Add RLS policies to allow PUBLIC (unauthenticated) users to read startup and fundraising data
-- This is needed for public startup pages that anyone can view without login

-- =====================================================
-- 1. FIX STARTUPS TABLE - Allow public read access
-- =====================================================

-- Check current RLS status
SELECT '=== CHECKING STARTUPS RLS STATUS ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'startups' AND schemaname = 'public';

-- Check existing policies
SELECT '=== CURRENT STARTUPS POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

-- Enable RLS if not already enabled
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policy if it exists (to recreate it properly)
DROP POLICY IF EXISTS "Public can view startups" ON public.startups;
DROP POLICY IF EXISTS "startups_public_read" ON public.startups;
DROP POLICY IF EXISTS "startups_select_all" ON public.startups;

-- Create policy to allow PUBLIC (anon role) to read startups
-- This allows unauthenticated users to view startup data on public pages
CREATE POLICY "startups_public_read" ON public.startups
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant SELECT permission to anon role
GRANT SELECT ON public.startups TO anon;

-- =====================================================
-- 2. FIX FUNDRAISING_DETAILS TABLE - Allow public read access
-- =====================================================

-- Check current RLS status
SELECT '=== CHECKING FUNDRAISING_DETAILS RLS STATUS ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'fundraising_details' AND schemaname = 'public';

-- Check existing policies
SELECT '=== CURRENT FUNDRAISING_DETAILS POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- Enable RLS if not already enabled
ALTER TABLE public.fundraising_details ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policy if it exists
DROP POLICY IF EXISTS "Public can view fundraising details" ON public.fundraising_details;
DROP POLICY IF EXISTS "fundraising_details_public_read" ON public.fundraising_details;

-- Create policy to allow PUBLIC (anon role) to read fundraising_details
-- This allows unauthenticated users to view fundraising data on public pages
CREATE POLICY "fundraising_details_public_read" ON public.fundraising_details
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant SELECT permission to anon role
GRANT SELECT ON public.fundraising_details TO anon;

-- =====================================================
-- 3. VERIFY POLICIES WERE CREATED
-- =====================================================

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
-- 4. TEST QUERIES (These should work for anon role)
-- =====================================================

-- Test that we can read startups
SELECT '=== TEST: Can read startups ===' as info;
SELECT COUNT(*) as startup_count FROM public.startups;

-- Test that we can read fundraising_details
SELECT '=== TEST: Can read fundraising_details ===' as info;
SELECT COUNT(*) as fundraising_count FROM public.fundraising_details;

-- Test join query (what PublicStartupPage uses)
SELECT '=== TEST: Join query ===' as info;
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
    fd.domain,
    fd.pitch_deck_url,
    fd.pitch_video_url
FROM public.startups s
LEFT JOIN public.fundraising_details fd ON s.id = fd.startup_id
WHERE s.id = 181
LIMIT 1;

