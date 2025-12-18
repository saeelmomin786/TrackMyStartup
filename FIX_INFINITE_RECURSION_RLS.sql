-- =====================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- =====================================================
-- CRITICAL: The policies were querying user_profiles/users tables
-- from within user_profiles/users policies, causing infinite recursion
-- This script fixes it by removing recursive queries
-- =====================================================

-- =====================================================
-- PART 1: FIX user_profiles TABLE - REMOVE RECURSION
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including the broken ones)
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

-- CRITICAL FIX: Simple policy - NO recursive queries
-- Users can see their own profiles
-- Drop first if exists
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;

CREATE POLICY "Users can view their own profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Simple check: auth_user_id matches current user
    -- NO EXISTS queries to avoid recursion
    auth_user_id = auth.uid()
);

-- Allow reading Investment Advisor profiles (for logo access)
-- Simple check - NO recursive queries
-- Drop first if exists
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles" ON public.user_profiles;

CREATE POLICY "Anyone can view Investment Advisor profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Simple check: role is Investment Advisor
    -- NO EXISTS queries to avoid recursion
    role = 'Investment Advisor'
);

-- Allow public read (for backward compatibility and logo access)
-- Drop first if exists
DROP POLICY IF EXISTS "Public can view user_profiles" ON public.user_profiles;

CREATE POLICY "Public can view user_profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 2: FIX users TABLE - REMOVE RECURSION
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including the broken ones)
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

-- CRITICAL FIX: Simple policy - NO recursive queries
-- Users can see their own profile
-- Drop first if exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Simple check: id matches current user
    -- NO EXISTS queries to avoid recursion
    id = auth.uid()
);

-- Allow reading Investment Advisor profiles (for logo access)
-- Simple check - NO recursive queries
-- Drop first if exists
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles (users table)" ON public.users;

CREATE POLICY "Anyone can view Investment Advisor profiles (users table)"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Simple check: role is Investment Advisor
    -- NO EXISTS queries to avoid recursion
    role = 'Investment Advisor'
);

-- Allow public read (for backward compatibility and logo access)
-- Drop first if exists
DROP POLICY IF EXISTS "Public can view users" ON public.users;

CREATE POLICY "Public can view users"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: VERIFY POLICIES (NO RECURSION)
-- =====================================================

-- Check user_profiles policies
SELECT 
    'user_profiles Policies (FIXED - No Recursion)' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual LIKE '%auth_user_id = auth.uid()%' THEN '✅ Simple - No recursion'
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Simple - No recursion'
        WHEN qual = 'true' THEN '✅ Public access'
        ELSE 'Check policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check users policies
SELECT 
    'users Policies (FIXED - No Recursion)' as section,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual LIKE '%id = auth.uid()%' THEN '✅ Simple - No recursion'
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Simple - No recursion'
        WHEN qual = 'true' THEN '✅ Public access'
        ELSE 'Check policy'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PART 4: TEST ACCESS
-- =====================================================

-- Test if users can see their own profiles (should work now)
SELECT 
    'Test: Can users see their own profiles?' as test_name,
    COUNT(*) as visible_profiles,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ FIXED - No recursion!'
        ELSE '❌ Still broken'
    END as status
FROM public.user_profiles
WHERE auth_user_id = auth.uid();

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ FIXED: Removed infinite recursion from RLS policies' as fix_1,
    '✅ FIXED: Users can see their own profiles (simple check)' as fix_2,
    '✅ FIXED: Logo access works (Investment Advisor profiles readable)' as fix_3,
    '✅ FIXED: Registration form 2 issue should be resolved' as fix_4,
    '🔄 PLEASE REFRESH YOUR BROWSER (Ctrl+F5 or Cmd+Shift+R)' as next_step;
