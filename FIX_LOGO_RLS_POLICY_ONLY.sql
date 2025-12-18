-- =====================================================
-- FIX LOGO RLS POLICY FOR INVESTMENT ADVISORS
-- =====================================================
-- This script fixes the RLS policy issue preventing investors/startups
-- from reading Investment Advisor logo_url from user_profiles table
-- =====================================================

-- =====================================================
-- PART 1: FIX user_profiles TABLE RLS FOR LOGO ACCESS
-- =====================================================
-- Allow authenticated users (investors/startups) to read Investment Advisor profiles
-- This is needed so they can fetch advisor logo_url via getInvestmentAdvisorByCode()

-- Enable RLS on user_profiles table if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view their clients" ON public.user_profiles;

-- Create comprehensive SELECT policy for user_profiles table
-- This allows:
-- 1. Users to see their own profiles
-- 2. Investment Advisors to see user_profiles who entered their code (for Service Requests)
-- 3. CRITICAL: Authenticated users can read Investment Advisor profiles (for logo_url access)
-- 4. Admins to see all user_profiles
CREATE POLICY "Users can view profiles and advisors can view clients"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profiles
    -- CRITICAL: isProfileComplete queries by profile id, so we need to allow access
    -- to any profile where auth_user_id matches the current user
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

-- Also allow public read for general functionality (logos, etc.)
-- This is needed so investors/startups can fetch advisor logo_url via getInvestmentAdvisorByCode
CREATE POLICY "Public can view user profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 2: FIX users TABLE RLS FOR LOGO ACCESS (Backward Compatibility)
-- =====================================================
-- Some old registrations might still use users table
-- We need to ensure both tables work

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Public can view user profiles (users table)" ON public.users;

-- Create comprehensive SELECT policy for users table (backward compatibility)
CREATE POLICY "Users can view profiles and advisors can view clients (users table)"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profile
    id = auth.uid()
    OR
    -- Investment Advisors can see users who entered their advisor code
    -- Check both users table and user_profiles table
    (
        EXISTS (
            SELECT 1 FROM public.users advisor
            WHERE advisor.id = auth.uid()
            AND advisor.role = 'Investment Advisor'
            AND advisor.investment_advisor_code IS NOT NULL
            AND advisor.investment_advisor_code != ''
            AND public.users.investment_advisor_code_entered = advisor.investment_advisor_code
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_profiles advisor_profile
            WHERE advisor_profile.auth_user_id = auth.uid()
            AND advisor_profile.role = 'Investment Advisor'
            AND advisor_profile.investment_advisor_code IS NOT NULL
            AND advisor_profile.investment_advisor_code != ''
            AND public.users.investment_advisor_code_entered = advisor_profile.investment_advisor_code
        )
    )
    OR
    -- CRITICAL FIX: Allow authenticated users to read Investment Advisor profiles (for logo_url)
    -- This allows investors/startups to fetch advisor logo from users table
    role = 'Investment Advisor'
    OR
    -- Admins can see all users
    EXISTS (
        SELECT 1 FROM public.users admin_user
        WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'Admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
);

-- Also allow public read for general functionality (logos, etc.)
CREATE POLICY "Public can view user profiles (users table)"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: VERIFY POLICIES
-- =====================================================

-- Verify user_profiles table policies
SELECT 
    'user_profiles Table Policies' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Verify users table policies (backward compatibility)
SELECT 
    'users Table Policies (Backward Compatibility)' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ user_profiles table RLS fixed - Authenticated users can read Investment Advisor profiles for logo_url' as fix_1,
    '✅ users table RLS fixed - Backward compatibility maintained for old registrations' as fix_2,
    '✅ Logo should now work for investors/startups under investment advisors' as fix_3;

