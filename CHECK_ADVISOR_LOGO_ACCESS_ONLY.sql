-- =====================================================
-- CHECK ADVISOR LOGO ACCESS - READ ONLY (NO CHANGES)
-- =====================================================
-- This script ONLY checks the current state
-- It does NOT make any changes to your database
-- =====================================================

-- =====================================================
-- PART 1: CHECK CURRENT RLS POLICIES FOR user_profiles
-- =====================================================
SELECT 
    'Current user_profiles RLS Policies' as check_type,
    policyname,
    cmd as command_type,
    roles,
    qual as policy_condition,
    CASE 
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Allows reading Investment Advisor profiles'
        WHEN qual LIKE '%auth_user_id = auth.uid()%' THEN '✅ Allows reading own profile'
        WHEN qual = 'true' THEN '✅ Public access'
        ELSE '⚠️ Check policy condition'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- =====================================================
-- PART 2: CHECK CURRENT RLS POLICIES FOR users
-- =====================================================
SELECT 
    'Current users RLS Policies' as check_type,
    policyname,
    cmd as command_type,
    roles,
    qual as policy_condition,
    CASE 
        WHEN qual LIKE '%role = ''Investment Advisor''%' THEN '✅ Allows reading Investment Advisor profiles'
        WHEN qual LIKE '%id = auth.uid()%' THEN '✅ Allows reading own profile'
        WHEN qual = 'true' THEN '✅ Public access'
        ELSE '⚠️ Check policy condition'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- PART 3: CHECK IF RLS IS ENABLED
-- =====================================================
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS is enabled'
        ELSE '❌ RLS is disabled'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'users')
ORDER BY tablename;

-- =====================================================
-- PART 4: CHECK INVESTMENT ADVISOR PROFILES IN user_profiles
-- =====================================================
SELECT 
    'Investment Advisors in user_profiles' as check_type,
    id as profile_id,
    auth_user_id,
    email,
    name,
    role,
    investment_advisor_code,
    CASE 
        WHEN logo_url IS NULL THEN '❌ NULL'
        WHEN logo_url = '' THEN '❌ EMPTY'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    logo_url
FROM public.user_profiles
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- PART 5: CHECK INVESTMENT ADVISOR PROFILES IN users
-- =====================================================
SELECT 
    'Investment Advisors in users (old registrations)' as check_type,
    id,
    email,
    name,
    role,
    investment_advisor_code,
    CASE 
        WHEN logo_url IS NULL THEN '❌ NULL'
        WHEN logo_url = '' THEN '❌ EMPTY'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    logo_url
FROM public.users
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- PART 6: SUMMARY - COUNT ADVISORS WITH/WITHOUT LOGOS
-- =====================================================
SELECT 
    'Summary: user_profiles table' as summary_type,
    COUNT(*) as total_advisors,
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as advisors_with_logos,
    COUNT(CASE WHEN logo_url IS NULL OR logo_url = '' THEN 1 END) as advisors_without_logos
FROM public.user_profiles
WHERE role = 'Investment Advisor';

SELECT 
    'Summary: users table' as summary_type,
    COUNT(*) as total_advisors,
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as advisors_with_logos,
    COUNT(CASE WHEN logo_url IS NULL OR logo_url = '' THEN 1 END) as advisors_without_logos
FROM public.users
WHERE role = 'Investment Advisor';

-- =====================================================
-- PART 7: CHECK IF REQUIRED POLICIES EXIST
-- =====================================================
SELECT 
    'Policy Check: user_profiles' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'user_profiles' 
            AND policyname = 'Anyone can view Investment Advisor profiles'
        ) THEN '✅ Policy exists'
        ELSE '❌ Policy MISSING'
    END as advisor_policy_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'user_profiles' 
            AND policyname = 'Users can view their own profiles'
        ) THEN '✅ Policy exists'
        ELSE '❌ Policy MISSING'
    END as own_profile_policy_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'user_profiles' 
            AND policyname = 'Public can view user_profiles'
        ) THEN '✅ Policy exists'
        ELSE '❌ Policy MISSING'
    END as public_policy_status;

SELECT 
    'Policy Check: users table' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND policyname = 'Anyone can view Investment Advisor profiles (users table)'
        ) THEN '✅ Policy exists'
        ELSE '❌ Policy MISSING'
    END as advisor_policy_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND policyname = 'Users can view their own profile'
        ) THEN '✅ Policy exists'
        ELSE '❌ Policy MISSING'
    END as own_profile_policy_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND policyname = 'Public can view users'
        ) THEN '✅ Policy exists'
        ELSE '❌ Policy MISSING'
    END as public_policy_status;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
SELECT 
    '📊 CHECK COMPLETE - NO CHANGES MADE' as status,
    'Review the results above to see:' as note_1,
    '1. Current RLS policies and their conditions' as note_2,
    '2. Whether Investment Advisor profiles have logos' as note_3,
    '3. Whether required policies exist' as note_4,
    '4. If policies are missing, run FIX_ADVISOR_LOGO_ACCESS_FOR_CLIENTS.sql' as note_5;

