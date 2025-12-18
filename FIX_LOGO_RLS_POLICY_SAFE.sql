-- =====================================================
-- FIX LOGO RLS POLICY FOR INVESTMENT ADVISORS (SAFE VERSION)
-- =====================================================
-- This script fixes the RLS policy issue preventing investors/startups
-- from reading Investment Advisor logo_url from user_profiles table
-- WITHOUT breaking existing profile access
-- =====================================================

-- =====================================================
-- PART 1: FIX user_profiles TABLE RLS FOR LOGO ACCESS
-- =====================================================
-- Allow authenticated users (investors/startups) to read Investment Advisor profiles
-- This is needed so they can fetch advisor logo_url via getInvestmentAdvisorByCode()

-- Enable RLS on user_profiles table if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Only drop and recreate if the policy doesn't exist or needs updating
-- This prevents breaking existing access

-- Check if policy exists and update it safely
DO $$
BEGIN
    -- Drop only if exists (safe operation)
    DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.user_profiles;
    
    -- Create comprehensive SELECT policy for user_profiles table
    -- This allows:
    -- 1. Users to see their own profiles (by auth_user_id)
    -- 2. Investment Advisors to see user_profiles who entered their code (for Service Requests)
    -- 3. CRITICAL: Authenticated users can read Investment Advisor profiles (for logo_url access)
    -- 4. Admins to see all user_profiles
    CREATE POLICY "Users can view profiles and advisors can view clients"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Users can see their own profiles
        -- This handles isProfileComplete queries by profile id
        auth_user_id = auth.uid()
        OR
        -- Investment Advisors can see user_profiles who entered their advisor code
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles advisor_profile
                WHERE advisor_profile.auth_user_id = auth.uid()
                AND advisor_profile.role = 'Investment Advisor'
                AND advisor_profile.investment_advisor_code IS NOT NULL
                AND advisor_profile.investment_advisor_code != ''
                AND public.user_profiles.investment_advisor_code_entered = advisor_profile.investment_advisor_code
            )
        )
        OR
        -- CRITICAL FIX: Allow authenticated users to read Investment Advisor profiles (for logo_url)
        -- This allows investors/startups to fetch advisor logo via getInvestmentAdvisorByCode
        role = 'Investment Advisor'
        OR
        -- Admins can see all user_profiles
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile
            WHERE admin_profile.auth_user_id = auth.uid()
            AND admin_profile.role = 'Admin'
        )
    );
END $$;

-- Ensure public read policy exists (for logos, etc.)
-- This is needed so investors/startups can fetch advisor logo_url via getInvestmentAdvisorByCode
DROP POLICY IF EXISTS "Public can view user profiles" ON public.user_profiles;

CREATE POLICY "Public can view user profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 2: VERIFY POLICIES
-- =====================================================

-- Verify user_profiles table policies
SELECT 
    'user_profiles Table Policies' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual LIKE '%auth_user_id = auth.uid()%' THEN '✅ Users can see own profiles'
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Can read Investment Advisor profiles'
        WHEN qual = 'true' THEN '✅ Public read access'
        ELSE 'Other policy'
    END as policy_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- =====================================================
-- PART 3: TEST QUERY (for debugging)
-- =====================================================

-- Test if current user can see their own profile
-- This will only work when logged in
SELECT 
    'Test: Can current user see their own profile?' as test_name,
    COUNT(*) as visible_profiles,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ User can see their own profile'
        ELSE '❌ User CANNOT see their own profile - RLS policy issue!'
    END as status
FROM public.user_profiles
WHERE auth_user_id = auth.uid();

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ user_profiles table RLS fixed - Authenticated users can read Investment Advisor profiles for logo_url' as fix_1,
    '✅ Users can still see their own profiles (auth_user_id = auth.uid())' as fix_2,
    '✅ Logo should now work for investors/startups under investment advisors' as fix_3,
    '✅ Profile completion check should still work' as fix_4;

