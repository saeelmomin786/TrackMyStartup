-- =====================================================
-- REVERT DASHBOARD RLS POLICIES
-- =====================================================
-- This script reverts the RLS policy changes made by FIX_ALL_DASHBOARD_RLS_POLICIES.sql
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. REVERT due_diligence_requests TABLE
-- =====================================================

-- Drop the policies we created
DROP POLICY IF EXISTS "Users can insert their own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Users can view their own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Users can update their own due diligence requests" ON public.due_diligence_requests;

-- Restore more conservative policies (only allow INSERT, keep SELECT/UPDATE minimal)
-- INSERT policy: Allow authenticated users to create due diligence requests (keep this fix)
CREATE POLICY "Users can insert their own due diligence requests" 
ON public.due_diligence_requests
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- SELECT policy: Only users can view their own requests (remove Investment Advisor access)
CREATE POLICY "Users can view their own due diligence requests" 
ON public.due_diligence_requests
FOR SELECT 
TO authenticated
USING (
    -- Users can view their own requests
    auth.uid() = user_id
    OR
    -- Startups can view requests for their startups
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id
        AND s.user_id = auth.uid()
    )
);

-- UPDATE policy: Only users can update their own requests
CREATE POLICY "Users can update their own due diligence requests" 
ON public.due_diligence_requests
FOR UPDATE 
TO authenticated
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id
        AND s.user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id
        AND s.user_id = auth.uid()
    )
);

-- =====================================================
-- 2. REVERT investor_favorites TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_favorites') THEN
        DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can view their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.investor_favorites;
        
        RAISE NOTICE '✅ Reverted investor_favorites policies';
    END IF;
END $$;

-- =====================================================
-- 3. REVERT investment_offers TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_offers') THEN
        DROP POLICY IF EXISTS "Users can update their own investment offers" ON public.investment_offers;
        
        RAISE NOTICE '✅ Reverted investment_offers policies';
    END IF;
END $$;

-- =====================================================
-- 4. REVERT co_investment_opportunities TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'co_investment_opportunities') THEN
        DROP POLICY IF EXISTS "Investment Advisors can insert co-investment opportunities" ON public.co_investment_opportunities;
        DROP POLICY IF EXISTS "Investment Advisors can update co-investment opportunities" ON public.co_investment_opportunities;
        
        RAISE NOTICE '✅ Reverted co_investment_opportunities policies';
    END IF;
END $$;

-- =====================================================
-- 5. REVERT mentor_profiles TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_profiles') THEN
        DROP POLICY IF EXISTS "Mentors can insert their own profile" ON public.mentor_profiles;
        DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentor_profiles;
        
        RAISE NOTICE '✅ Reverted mentor_profiles policies';
    END IF;
END $$;

-- =====================================================
-- 6. REVERT investor_profiles TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        DROP POLICY IF EXISTS "Investors can insert their own profile" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Investors can update their own profile" ON public.investor_profiles;
        
        RAISE NOTICE '✅ Reverted investor_profiles policies';
    END IF;
END $$;

-- =====================================================
-- 7. REVERT investment_advisor_profiles TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        DROP POLICY IF EXISTS "Investment Advisors can insert their own profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Investment Advisors can update their own profile" ON public.investment_advisor_profiles;
        
        RAISE NOTICE '✅ Reverted investment_advisor_profiles policies';
    END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
    '✅ Policies Reverted' as status,
    'Only kept INSERT fix for due_diligence_requests' as note,
    'Startup dashboard should work normally now' as result;





