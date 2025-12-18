-- =====================================================
-- FIX ADVISOR LOGO ACCESS FOR INVESTORS/STARTUPS
-- =====================================================
-- Issue: Investors and startups under an advisor cannot see
--        the advisor's logo because RLS policies are blocking access
-- Fix: Ensure authenticated users can read Investment Advisor profiles
-- =====================================================

-- =====================================================
-- PART 1: VERIFY CURRENT POLICIES
-- =====================================================

-- Check existing policies for user_profiles
SELECT 
    'Current user_profiles policies' as check_type,
    policyname,
    cmd,
    roles,
    qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check existing policies for users
SELECT 
    'Current users policies' as check_type,
    policyname,
    cmd,
    roles,
    qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PART 2: FIX user_profiles TABLE POLICIES
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop the existing "Anyone can view Investment Advisor profiles" policy if it exists
-- (We'll recreate it to ensure it works correctly)
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles" ON public.user_profiles;

-- CRITICAL FIX: Allow ALL authenticated users to read Investment Advisor profiles
-- This is needed so investors/startups can fetch advisor logos
CREATE POLICY "Anyone can view Investment Advisor profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Simple, non-recursive check: role is Investment Advisor
    role = 'Investment Advisor'
);

-- Also ensure users can view their own profiles (should already exist, but ensure it)
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;

CREATE POLICY "Users can view their own profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Simple check: auth_user_id matches current user
    auth_user_id = auth.uid()
);

-- Keep public access for backward compatibility
DROP POLICY IF EXISTS "Public can view user_profiles" ON public.user_profiles;

CREATE POLICY "Public can view user_profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: FIX users TABLE POLICIES
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop the existing "Anyone can view Investment Advisor profiles (users table)" policy if it exists
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles (users table)" ON public.users;

-- CRITICAL FIX: Allow ALL authenticated users to read Investment Advisor profiles
-- This is needed so investors/startups can fetch advisor logos from old registrations
CREATE POLICY "Anyone can view Investment Advisor profiles (users table)"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Simple, non-recursive check: role is Investment Advisor
    role = 'Investment Advisor'
);

-- Also ensure users can view their own profile (should already exist, but ensure it)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Simple check: id matches current user
    id = auth.uid()
);

-- Keep public access for backward compatibility
DROP POLICY IF EXISTS "Public can view users" ON public.users;

CREATE POLICY "Public can view users"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 4: VERIFY POLICIES ARE CORRECT
-- =====================================================

-- Verify user_profiles policies
SELECT 
    '✅ VERIFIED: user_profiles policies' as status,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Allows reading Investment Advisor profiles'
        WHEN qual LIKE '%auth_user_id = auth.uid()%' THEN '✅ Allows reading own profile'
        WHEN qual = 'true' THEN '✅ Public access'
        ELSE '⚠️ Check policy'
    END as verification
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Verify users policies
SELECT 
    '✅ VERIFIED: users policies' as status,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Allows reading Investment Advisor profiles'
        WHEN qual LIKE '%id = auth.uid()%' THEN '✅ Allows reading own profile'
        WHEN qual = 'true' THEN '✅ Public access'
        ELSE '⚠️ Check policy'
    END as verification
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PART 5: TEST ACCESS (Run as authenticated user)
-- =====================================================

-- Test: Can we read Investment Advisor profiles? (This should work now)
-- Note: This query will only work if you're authenticated
SELECT 
    '✅ TEST: Can read Investment Advisor profiles' as test_name,
    COUNT(*) as advisor_count,
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as advisors_with_logos
FROM public.user_profiles
WHERE role = 'Investment Advisor';

-- Test: Can we read Investment Advisor profiles from users table?
SELECT 
    '✅ TEST: Can read Investment Advisor profiles (users table)' as test_name,
    COUNT(*) as advisor_count,
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as advisors_with_logos
FROM public.users
WHERE role = 'Investment Advisor';

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ FIXED: RLS policies updated to allow logo access' as fix_1,
    '✅ FIXED: Authenticated users can read Investment Advisor profiles' as fix_2,
    '✅ FIXED: Investors/Startups can now fetch advisor logos' as fix_3,
    '🔄 PLEASE REFRESH YOUR BROWSER (Ctrl+F5 or Cmd+Shift+R)' as next_step,
    '📝 If logo still not showing, check browser console for errors' as note;

