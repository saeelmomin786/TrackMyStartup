-- =====================================================
-- REVERT LOGO RLS FIX - RESTORE ORIGINAL POLICIES
-- =====================================================
-- This script reverts the logo RLS fix and restores permissive policies
-- so users can access their own profiles again
-- =====================================================

-- =====================================================
-- PART 1: RESTORE user_profiles TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop the restrictive policies we added
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view their clients" ON public.user_profiles;

-- Create a simple, permissive policy that allows users to see their own profiles
-- AND allows reading Investment Advisor profiles for logo access
CREATE POLICY "Users can view their own profiles and Investment Advisor profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profiles (by auth_user_id)
    auth_user_id = auth.uid()
    OR
    -- Allow reading Investment Advisor profiles (for logo_url access)
    role = 'Investment Advisor'
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
    -- Admins can see all user_profiles
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
);

-- Also allow public read (for backward compatibility and logo access)
CREATE POLICY "Public can view user profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 2: RESTORE users TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop the restrictive policies we added
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Public can view user profiles (users table)" ON public.users;

-- Create a simple, permissive policy for users table
CREATE POLICY "Users can view their own profile and Investment Advisor profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profile
    id = auth.uid()
    OR
    -- Allow reading Investment Advisor profiles (for logo_url access)
    role = 'Investment Advisor'
    OR
    -- Investment Advisors can see users who entered their advisor code
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

-- Also allow public read (for backward compatibility and logo access)
CREATE POLICY "Public can view user profiles (users table)"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: VERIFY POLICIES ARE RESTORED
-- =====================================================

-- Verify user_profiles table policies
SELECT 
    'user_profiles Table Policies (RESTORED)' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Verify users table policies
SELECT 
    'users Table Policies (RESTORED)' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PART 4: TEST QUERIES
-- =====================================================

-- Test if current user can see their own profile
SELECT 
    'Test: Can current user see their own profile?' as test_name,
    COUNT(*) as visible_profiles,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ User can see their own profile - FIXED!'
        ELSE '❌ User CANNOT see their own profile - Still broken!'
    END as status
FROM public.user_profiles
WHERE auth_user_id = auth.uid();

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ Policies reverted - Users can now see their own profiles again' as fix_1,
    '✅ Logo access still works - Investment Advisor profiles are readable' as fix_2,
    '✅ Public read access restored for backward compatibility' as fix_3,
    '🔄 Please refresh your browser and try again' as next_step;

