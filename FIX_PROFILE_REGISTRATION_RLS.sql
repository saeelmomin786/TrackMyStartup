-- =====================================================
-- FIX PROFILE REGISTRATION RLS POLICIES
-- =====================================================
-- This script fixes RLS policies to allow profile updates during registration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX user_profiles UPDATE POLICY
-- =====================================================
-- CRITICAL: UPDATE policies in PostgreSQL/Supabase require BOTH:
-- - USING: checks if user can see/select the existing row
-- - WITH CHECK: checks if user can update the row with new values
-- The existing policy only has USING, which causes UPDATE to fail!

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;

-- Create new policy that explicitly checks both USING and WITH CHECK
-- USING: checks if user can see the row (existing row)
-- WITH CHECK: checks if user can update the row (new row values)
CREATE POLICY "Users can update their own profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- Verify the policy
SELECT 
    'user_profiles UPDATE Policy' as info,
    policyname,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles' 
  AND schemaname = 'public'
  AND cmd = 'UPDATE';

-- =====================================================
-- 2. VERIFY ALL user_profiles POLICIES
-- =====================================================

-- Check all policies on user_profiles
SELECT 
    'All user_profiles Policies' as info,
    policyname,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles' 
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =====================================================
-- 3. FIX mentor_profiles RLS POLICIES (if needed)
-- =====================================================

-- Check if mentor_profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentor_profiles;
        
        -- Create new policy with explicit WITH CHECK
        CREATE POLICY "Mentors can update their own profile" ON public.mentor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        RAISE NOTICE '✅ mentor_profiles UPDATE policy fixed';
    ELSE
        RAISE NOTICE '⚠️ mentor_profiles table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 4. FIX investor_profiles RLS POLICIES (if needed)
-- =====================================================

-- Check if investor_profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can update their own investor profile" ON public.investor_profiles;
        
        -- Create new policy with explicit WITH CHECK
        CREATE POLICY "Users can update their own investor profile" ON public.investor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        RAISE NOTICE '✅ investor_profiles UPDATE policy fixed';
    ELSE
        RAISE NOTICE '⚠️ investor_profiles table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 5. FIX investment_advisor_profiles RLS POLICIES (if needed)
-- =====================================================

-- Check if investment_advisor_profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can update their own investment advisor profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Investment Advisors can update their own profile" ON public.investment_advisor_profiles;
        
        -- Create new policy with explicit WITH CHECK
        CREATE POLICY "Users can update their own investment advisor profile" ON public.investment_advisor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        RAISE NOTICE '✅ investment_advisor_profiles UPDATE policy fixed';
    ELSE
        RAISE NOTICE '⚠️ investment_advisor_profiles table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 6. VERIFY RLS IS ENABLED
-- =====================================================

SELECT 
    'RLS Status' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('user_profiles', 'mentor_profiles', 'investor_profiles', 'investment_advisor_profiles')
  AND schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 7. TEST QUERY (Run this as a logged-in user to verify)
-- =====================================================

-- This query should work if RLS policies are correct
-- Replace 'YOUR_PROFILE_ID' with an actual profile ID
/*
SELECT 
    'Test: Can user see their own profile?' as test,
    id,
    name,
    role,
    auth_user_id,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() = auth_user_id THEN '✅ Access allowed'
        ELSE '❌ Access denied'
    END as access_status
FROM public.user_profiles
WHERE id = 'YOUR_PROFILE_ID';
*/

-- =====================================================
-- 8. SUMMARY
-- =====================================================

SELECT 
    '✅ RLS Policy Fix Complete' as status,
    'All UPDATE policies now have explicit WITH CHECK clauses' as note,
    'Profile registration should now work correctly' as result;

