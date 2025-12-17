-- =====================================================
-- COMPREHENSIVE FIX FOR ALL PROFILE REGISTRATION RLS POLICIES
-- =====================================================
-- This script fixes RLS policies for ALL tables used during profile registration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX user_profiles TABLE (CRITICAL - Main Profile Table)
-- =====================================================

-- Fix UPDATE policy (missing WITH CHECK clause)
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
CREATE POLICY "Users can update their own profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- Verify INSERT policy exists (should already work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public' 
        AND cmd = 'INSERT'
    ) THEN
        CREATE POLICY "Users can insert their own profiles" ON public.user_profiles
            FOR INSERT
            WITH CHECK (auth.uid() = auth_user_id);
        RAISE NOTICE '✅ Created INSERT policy for user_profiles';
    ELSE
        RAISE NOTICE '✅ INSERT policy already exists for user_profiles';
    END IF;
END $$;

-- =====================================================
-- 2. FIX startups TABLE (For Startup Profiles)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'startups') THEN
        -- Fix INSERT policy
        DROP POLICY IF EXISTS "Users can insert their own startups" ON public.startups;
        DROP POLICY IF EXISTS "Startups can insert their own startup" ON public.startups;
        CREATE POLICY "Users can insert their own startups" ON public.startups
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        
        -- Fix UPDATE policy
        DROP POLICY IF EXISTS "Users can update their own startups" ON public.startups;
        DROP POLICY IF EXISTS "Startups can update their own startup" ON public.startups;
        CREATE POLICY "Users can update their own startups" ON public.startups
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE '✅ Fixed startups table RLS policies';
    ELSE
        RAISE NOTICE '⚠️ startups table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 3. FIX founders TABLE (For Startup Profiles)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'founders') THEN
        -- Fix INSERT policy - users can insert founders for their own startups
        DROP POLICY IF EXISTS "Users can insert founders for their startups" ON public.founders;
        DROP POLICY IF EXISTS "Startups can insert their own founders" ON public.founders;
        CREATE POLICY "Users can insert founders for their startups" ON public.founders
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = founders.startup_id 
                    AND startups.user_id = auth.uid()
                )
            );
        
        -- Fix UPDATE policy
        DROP POLICY IF EXISTS "Users can update founders for their startups" ON public.founders;
        CREATE POLICY "Users can update founders for their startups" ON public.founders
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = founders.startup_id 
                    AND startups.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = founders.startup_id 
                    AND startups.user_id = auth.uid()
                )
            );
        
        RAISE NOTICE '✅ Fixed founders table RLS policies';
    ELSE
        RAISE NOTICE '⚠️ founders table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 4. FIX startup_shares TABLE (For Startup Profiles)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'startup_shares') THEN
        -- Fix INSERT policy
        DROP POLICY IF EXISTS "Users can insert startup shares" ON public.startup_shares;
        DROP POLICY IF EXISTS "Startups can insert their own shares" ON public.startup_shares;
        CREATE POLICY "Users can insert startup shares" ON public.startup_shares
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = startup_shares.startup_id 
                    AND startups.user_id = auth.uid()
                )
            );
        
        -- Fix UPDATE policy
        DROP POLICY IF EXISTS "Users can update startup shares" ON public.startup_shares;
        CREATE POLICY "Users can update startup shares" ON public.startup_shares
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = startup_shares.startup_id 
                    AND startups.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = startup_shares.startup_id 
                    AND startups.user_id = auth.uid()
                )
            );
        
        RAISE NOTICE '✅ Fixed startup_shares table RLS policies';
    ELSE
        RAISE NOTICE '⚠️ startup_shares table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 5. FIX subsidiaries TABLE (For Startup Profiles)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subsidiaries') THEN
        -- Fix INSERT policy
        DROP POLICY IF EXISTS "Users can insert subsidiaries" ON public.subsidiaries;
        CREATE POLICY "Users can insert subsidiaries" ON public.subsidiaries
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = subsidiaries.startup_id 
                    AND startups.user_id = auth.uid()
                )
            );
        
        RAISE NOTICE '✅ Fixed subsidiaries table RLS policies';
    ELSE
        RAISE NOTICE '⚠️ subsidiaries table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 6. FIX international_operations TABLE (For Startup Profiles)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'international_operations') THEN
        -- Fix INSERT policy
        DROP POLICY IF EXISTS "Users can insert international operations" ON public.international_operations;
        CREATE POLICY "Users can insert international operations" ON public.international_operations
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups 
                    WHERE startups.id = international_operations.startup_id 
                    AND startups.user_id = auth.uid()
                )
            );
        
        RAISE NOTICE '✅ Fixed international_operations table RLS policies';
    ELSE
        RAISE NOTICE '⚠️ international_operations table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 7. FIX advisor_added_startups TABLE (For Investment Advisor Links)
-- =====================================================
-- NOTE: advisor_added_startups.advisor_id is VARCHAR(255), stores auth.uid() as text
-- We need to cast UUID to text for comparison

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_added_startups') THEN
        -- Fix UPDATE policy - advisors can update their own added startups
        -- advisor_id stores auth_user_id as VARCHAR, so we compare with auth.uid()::text
        DROP POLICY IF EXISTS "Advisors can update their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can update their own added startups" ON public.advisor_added_startups;
        CREATE POLICY "Advisors can update their added startups" ON public.advisor_added_startups
            FOR UPDATE
            USING (advisor_added_startups.advisor_id = auth.uid()::text)
            WITH CHECK (advisor_added_startups.advisor_id = auth.uid()::text);
        
        RAISE NOTICE '✅ Fixed advisor_added_startups table RLS policies';
    ELSE
        RAISE NOTICE '⚠️ advisor_added_startups table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 8. FIX role-specific profile tables (if they exist)
-- =====================================================

-- mentor_profiles
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_profiles') THEN
        DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentor_profiles;
        CREATE POLICY "Mentors can update their own profile" ON public.mentor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE '✅ Fixed mentor_profiles UPDATE policy';
    END IF;
END $$;

-- investor_profiles
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        DROP POLICY IF EXISTS "Users can update their own investor profile" ON public.investor_profiles;
        CREATE POLICY "Users can update their own investor profile" ON public.investor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE '✅ Fixed investor_profiles UPDATE policy';
    END IF;
END $$;

-- investment_advisor_profiles
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        DROP POLICY IF EXISTS "Users can update their own investment advisor profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Investment Advisors can update their own profile" ON public.investment_advisor_profiles;
        CREATE POLICY "Users can update their own investment advisor profile" ON public.investment_advisor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE '✅ Fixed investment_advisor_profiles UPDATE policy';
    END IF;
END $$;

-- =====================================================
-- 9. VERIFY ALL POLICIES
-- =====================================================

SELECT 
    'All UPDATE Policies Status' as info,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK'
        ELSE '❌ Missing WITH CHECK'
    END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'UPDATE'
  AND tablename IN (
      'user_profiles', 
      'startups', 
      'founders', 
      'startup_shares', 
      'subsidiaries', 
      'international_operations',
      'advisor_added_startups',
      'mentor_profiles',
      'investor_profiles',
      'investment_advisor_profiles'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- 10. VERIFY RLS IS ENABLED
-- =====================================================

SELECT 
    'RLS Status' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'user_profiles', 
      'startups', 
      'founders', 
      'startup_shares', 
      'subsidiaries', 
      'international_operations',
      'advisor_added_startups',
      'mentor_profiles',
      'investor_profiles',
      'investment_advisor_profiles'
  )
ORDER BY tablename;

-- =====================================================
-- 11. SUMMARY
-- =====================================================

SELECT 
    '✅ COMPREHENSIVE RLS FIX COMPLETE' as status,
    'All tables used in profile registration now have correct RLS policies' as note,
    'Profile registration should now work for all profile types' as result;

