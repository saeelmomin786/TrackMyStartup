-- =====================================================
-- FIX INFINITE RECURSION IN USERS AND USER_PROFILES RLS POLICIES
-- =====================================================
-- CRITICAL: The policy in 32_fix_users_table_rls_investment_advisor_code.sql
-- has recursive EXISTS queries that query the users table from within
-- the users table policy, causing infinite recursion (error 42P17)
-- 
-- This script fixes BOTH users and user_profiles tables by removing ALL recursive queries
-- =====================================================

-- =====================================================
-- PART 1: FIX user_profiles TABLE - REMOVE RECURSION
-- =====================================================

-- Drop ALL existing policies on user_profiles table that might have recursion
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

-- Create simple, NON-RECURSIVE policies for user_profiles
-- Users can see their own profiles
CREATE POLICY "Users can view their own profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Simple check: auth_user_id matches current user
    -- NO EXISTS queries to avoid recursion
    auth_user_id = auth.uid()
);

-- Allow reading Investment Advisor profiles (for logo access, etc.)
CREATE POLICY "Anyone can view Investment Advisor profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Simple check: role is Investment Advisor
    -- NO EXISTS queries to avoid recursion
    role = 'Investment Advisor'
);

-- Allow public read (for backward compatibility)
CREATE POLICY "Public can view user_profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- Create SECURITY DEFINER function to get user_profiles by auth_user_id list
-- NOTE: Use text[] input to avoid 400 errors when caller passes non-uuid values.
-- We compare by casting auth_user_id to text, so invalid values simply won't match.
DROP FUNCTION IF EXISTS public.get_user_profiles_by_auth_ids(uuid[]);
DROP FUNCTION IF EXISTS public.get_user_profiles_by_auth_ids(text[]);
CREATE OR REPLACE FUNCTION public.get_user_profiles_by_auth_ids(auth_user_id_list TEXT[])
RETURNS TABLE(
    auth_user_id UUID,
    name TEXT,
    email TEXT,
    investment_advisor_code_entered TEXT,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.auth_user_id,
        up.name,
        up.email,
        up.investment_advisor_code_entered,
        up.role
    FROM public.user_profiles up
    WHERE up.auth_user_id::text = ANY(auth_user_id_list)
    AND up.role = 'Investor';
END;
$$;

-- =====================================================
-- PART 2: FIX users TABLE - REMOVE RECURSION
-- =====================================================

-- 1. Drop ALL existing policies on users table that might have recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Investment Advisors can see their investors" ON public.users;
DROP POLICY IF EXISTS "Investment Advisors can view their clients (users table)" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view Investment Advisor profiles (users table)" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;

-- 2. Create simple, NON-RECURSIVE policies
-- Users can see their own profile (including investment_advisor_code)
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Simple check: id matches current user
    -- NO EXISTS queries to avoid recursion
    id = auth.uid()
);

-- Allow reading Investment Advisor profiles (for logo access, etc.)
-- Simple check - NO recursive queries
CREATE POLICY "Anyone can view Investment Advisor profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Simple check: role is Investment Advisor
    -- NO EXISTS queries to avoid recursion
    role = 'Investment Advisor'
);

-- Allow public read (for backward compatibility)
CREATE POLICY "Public can view users"
ON public.users
FOR SELECT
TO public
USING (true);

-- 3. Create a SECURITY DEFINER function for Investment Advisors to get their clients
-- This bypasses RLS and avoids recursion
CREATE OR REPLACE FUNCTION public.get_advisor_clients(advisor_code TEXT)
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    investment_advisor_code_entered TEXT,
    phone TEXT,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function bypasses RLS, so Investment Advisors can see their clients
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.investment_advisor_code_entered,
        u.phone,
        u.role
    FROM public.users u
    WHERE u.investment_advisor_code_entered = advisor_code
    AND u.role = 'Investor';
END;
$$;

-- 4. Create a SECURITY DEFINER function to get all Investment Advisors
-- This bypasses RLS for listing advisors
CREATE OR REPLACE FUNCTION public.get_investment_advisors()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    investment_advisor_code TEXT,
    phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.investment_advisor_code,
        u.phone
    FROM public.users u
    WHERE u.investment_advisor_code IS NOT NULL
    AND u.investment_advisor_code != '';
END;
$$;

-- 5. Create a SECURITY DEFINER function to get investors by advisor code
CREATE OR REPLACE FUNCTION public.get_investors_by_advisor_code(advisor_code TEXT)
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    investment_advisor_code_entered TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.investment_advisor_code_entered
    FROM public.users u
    WHERE u.investment_advisor_code_entered = advisor_code
    AND u.role = 'Investor';
END;
$$;

-- 6. Create a SECURITY DEFINER function to get users by email list
CREATE OR REPLACE FUNCTION public.get_users_by_emails(email_list TEXT[])
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    investment_advisor_code_entered TEXT,
    phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.investment_advisor_code_entered,
        u.phone
    FROM public.users u
    WHERE u.email = ANY(email_list);
END;
$$;

-- 7. Create a SECURITY DEFINER function to get users by name list
CREATE OR REPLACE FUNCTION public.get_users_by_names(name_list TEXT[])
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name
    FROM public.users u
    WHERE u.name = ANY(name_list);
END;
$$;

-- 8. Verify policies were created correctly (no recursion)
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
        ELSE '⚠️ Check policy'
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
        ELSE '⚠️ Check policy'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ FIXED: Removed infinite recursion from BOTH users and user_profiles tables
-- ✅ FIXED: Users can see their own profile (simple check: id = auth.uid())
-- ✅ FIXED: Users can see their own user_profiles (simple check: auth_user_id = auth.uid())
-- ✅ FIXED: Investment Advisor profiles are readable in both tables
-- ✅ CREATED: SECURITY DEFINER functions for Investment Advisors to get their clients
-- 
-- IMPORTANT: The frontend code needs to be updated to use these functions:
-- 
-- For users table:
-- - get_advisor_clients(advisor_code) - for getting clients
-- - get_investment_advisors() - for getting all advisors
-- - get_investors_by_advisor_code(advisor_code) - for getting investors
-- - get_users_by_emails(email_list) - for getting users by emails
-- - get_users_by_names(name_list) - for getting users by names
-- 
-- For user_profiles table:
-- - get_user_profiles_by_auth_ids(auth_user_id_list) - for getting user_profiles by auth_user_id list
-- 
-- These functions bypass RLS and avoid recursion issues.
-- =====================================================
