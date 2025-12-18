-- =====================================================
-- EMERGENCY REVERT - RESTORE ALL USER ACCESS
-- =====================================================
-- This script makes RLS policies VERY PERMISSIVE to restore access
-- for all users. Run this immediately if all users are seeing registration form.
-- =====================================================

-- =====================================================
-- PART 1: FIX user_profiles TABLE - MAKE VERY PERMISSIVE
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view their clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profiles and Investment Advisor profiles" ON public.user_profiles;

-- Create VERY PERMISSIVE policy - allow all authenticated users to read all profiles
-- This is needed to restore access immediately
CREATE POLICY "Allow all authenticated users to read user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);  -- Allow everything for authenticated users

-- Also allow public read
CREATE POLICY "Allow public to read user_profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 2: FIX users TABLE - MAKE VERY PERMISSIVE
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Public can view user profiles (users table)" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile and Investment Advisor profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create VERY PERMISSIVE policy - allow all authenticated users to read all users
CREATE POLICY "Allow all authenticated users to read users"
ON public.users
FOR SELECT
TO authenticated
USING (true);  -- Allow everything for authenticated users

-- Also allow public read
CREATE POLICY "Allow public to read users"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: VERIFY POLICIES
-- =====================================================

-- Check user_profiles policies
SELECT 
    'user_profiles Policies (EMERGENCY FIX)' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual = 'true' THEN '✅ PERMISSIVE - All access allowed'
        ELSE '⚠️ Check policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check users policies
SELECT 
    'users Policies (EMERGENCY FIX)' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual = 'true' THEN '✅ PERMISSIVE - All access allowed'
        ELSE '⚠️ Check policy'
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
        WHEN COUNT(*) > 0 THEN '✅ FIXED - Users can see their profiles!'
        ELSE '❌ STILL BROKEN - Contact support immediately!'
    END as status
FROM public.user_profiles
WHERE auth_user_id = auth.uid();

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '🚨 EMERGENCY FIX APPLIED' as status,
    '✅ All authenticated users can now read user_profiles' as fix_1,
    '✅ All authenticated users can now read users table' as fix_2,
    '✅ Public read access restored' as fix_3,
    '🔄 PLEASE REFRESH YOUR BROWSER NOW (Ctrl+F5 or Cmd+Shift+R)' as next_step,
    '⚠️ These are very permissive policies - you may want to tighten them later' as note;

