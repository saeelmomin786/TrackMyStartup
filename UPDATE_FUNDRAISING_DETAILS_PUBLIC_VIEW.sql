-- UPDATE_FUNDRAISING_DETAILS_PUBLIC_VIEW.sql
-- Update the public view to include all new fields needed for public display
-- This allows unauthenticated users to see all fundraising details including logo, business plan, etc.

-- =====================================================
-- UPDATE PUBLIC VIEW FOR FUNDRAISING_DETAILS
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS public.fundraising_details_public;

-- Create updated view with all necessary fields for public display
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
    logo_url,              -- Company logo URL (NEW)
    business_plan_url,     -- Business plan URL (NEW)
    website_url,           -- Website URL (NEW)
    linkedin_url,          -- LinkedIn URL (NEW)
    one_pager_url,         -- One-pager URL (NEW)
    created_at             -- Needed for ordering (to get latest fundraising details)
    -- NOTE: validation_requested, updated_at, and one-pager text fields are NOT included
    -- These are internal fields not needed for public display
FROM public.fundraising_details;

-- Grant SELECT permission on the view to anon role
GRANT SELECT ON public.fundraising_details_public TO anon;

-- =====================================================
-- ALTERNATIVE: ADD PUBLIC RLS POLICY (If view doesn't work)
-- =====================================================
-- This allows anonymous users to read active fundraising details directly
-- Use this if the view approach doesn't work

-- Drop existing public read policy if it exists
DROP POLICY IF EXISTS "fundraising_details_public_read" ON public.fundraising_details;

-- Create policy that allows anonymous users to read active fundraising details
CREATE POLICY "fundraising_details_public_read" ON public.fundraising_details
    FOR SELECT
    TO anon
    USING (active = true); -- Only show active fundraising rounds to public

-- Also allow authenticated users to read all fundraising details (if not already exists)
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

-- =====================================================
-- VERIFY THE VIEW WAS UPDATED
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
-- VERIFY RLS POLICIES
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

