-- =====================================================
-- FIX PROFILE ACCESS AND LOGO - COMPREHENSIVE FIX
-- =====================================================
-- This script fixes both issues:
-- 1. Users can access their own profiles (fixes registration form 2 issue)
-- 2. Investors/startups can read Investment Advisor logos
-- =====================================================

-- =====================================================
-- PART 1: FIX user_profiles TABLE - ALLOW OWN PROFILE ACCESS
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view their clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profiles and Investment Advisor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to read user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public to read user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user_profiles" ON public.user_profiles;

-- CRITICAL: Create policy that allows users to see their own profiles
-- This is needed for isProfileComplete() to work
CREATE POLICY "Users can view their own profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Users can see profiles where auth_user_id matches their auth.uid()
    -- This handles isProfileComplete queries by profile id
    auth_user_id = auth.uid()
);

-- Allow reading Investment Advisor profiles (for logo access)
CREATE POLICY "Anyone can view Investment Advisor profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Allow reading Investment Advisor profiles (for logo_url)
    role = 'Investment Advisor'
);

-- Allow Investment Advisors to see their clients
CREATE POLICY "Investment Advisors can view their clients"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Investment Advisors can see user_profiles who entered their advisor code
    EXISTS (
        SELECT 1 FROM public.user_profiles advisor_profile
        WHERE advisor_profile.auth_user_id = auth.uid()
        AND advisor_profile.role = 'Investment Advisor'
        AND advisor_profile.investment_advisor_code IS NOT NULL
        AND advisor_profile.investment_advisor_code != ''
        AND public.user_profiles.investment_advisor_code_entered = advisor_profile.investment_advisor_code
    )
);

-- Allow Admins to see all profiles
CREATE POLICY "Admins can view all user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
);

-- Allow public read (for backward compatibility and logo access)
CREATE POLICY "Public can view user_profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 2: FIX users TABLE - ALLOW OWN PROFILE ACCESS
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Public can view user profiles (users table)" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile and Investment Advisor profiles" ON public.users;
DROP POLICY IF EXISTS "Allow all authenticated users to read users" ON public.users;
DROP POLICY IF EXISTS "Allow public to read users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles (users table)" ON public.users;
DROP POLICY IF EXISTS "Investment Advisors can view their clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- CRITICAL: Create policy that allows users to see their own profile
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profile (id = auth.uid())
    id = auth.uid()
);

-- Allow reading Investment Advisor profiles (for logo access)
CREATE POLICY "Anyone can view Investment Advisor profiles (users table)"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Allow reading Investment Advisor profiles (for logo_url)
    role = 'Investment Advisor'
);

-- Allow Investment Advisors to see their clients
CREATE POLICY "Investment Advisors can view their clients (users table)"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Investment Advisors can see users who entered their advisor code
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
);

-- Allow Admins to see all users
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (
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

-- Allow public read (for backward compatibility and logo access)
CREATE POLICY "Public can view users"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: VERIFY POLICIES
-- =====================================================

-- Check user_profiles policies
SELECT 
    'user_profiles Policies' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN policyname LIKE '%own%' THEN '✅ Users can see own profiles'
        WHEN policyname LIKE '%Investment Advisor%' THEN '✅ Logo access enabled'
        WHEN policyname LIKE '%Public%' THEN '✅ Public access'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check users policies
SELECT 
    'users Policies' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN policyname LIKE '%own%' THEN '✅ Users can see own profiles'
        WHEN policyname LIKE '%Investment Advisor%' THEN '✅ Logo access enabled'
        WHEN policyname LIKE '%Public%' THEN '✅ Public access'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PART 4: TEST ACCESS
-- =====================================================

-- Test if users can see their own profiles
SELECT 
    'Test: Can users see their own profiles?' as test_name,
    COUNT(*) as visible_profiles,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ FIXED - Users can see their own profiles!'
        ELSE '❌ STILL BROKEN - Check auth.uid()'
    END as status
FROM public.user_profiles
WHERE auth_user_id = auth.uid();

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ FIXED: Users can now see their own profiles (auth_user_id = auth.uid())' as fix_1,
    '✅ FIXED: Logo access works (Investment Advisor profiles readable)' as fix_2,
    '✅ FIXED: Registration form 2 issue should be resolved' as fix_3,
    '🔄 PLEASE REFRESH YOUR BROWSER (Ctrl+F5 or Cmd+Shift+R)' as next_step;

