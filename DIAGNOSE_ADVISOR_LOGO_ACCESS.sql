-- =====================================================
-- DIAGNOSE ADVISOR LOGO ACCESS ISSUE
-- =====================================================
-- This script checks:
-- 1. RLS policies for user_profiles and users tables
-- 2. Whether Investment Advisor profiles are accessible
-- 3. Whether logo_url is present in the database
-- =====================================================

-- Check current RLS policies for user_profiles
SELECT 
    'user_profiles RLS Policies' as check_type,
    policyname,
    cmd,
    roles,
    qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check current RLS policies for users
SELECT 
    'users RLS Policies' as check_type,
    policyname,
    cmd,
    roles,
    qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- Check Investment Advisor profiles in user_profiles (should be readable by authenticated users)
SELECT 
    'Investment Advisors in user_profiles' as check_type,
    id,
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

-- Check Investment Advisor profiles in users (old registrations)
SELECT 
    'Investment Advisors in users' as check_type,
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

-- Test: Can we query Investment Advisor profiles by code? (simulating what getInvestmentAdvisorByCode does)
-- Replace 'YOUR_ADVISOR_CODE' with an actual advisor code to test
SELECT 
    'Test: Query advisor by code (user_profiles)' as test_name,
    auth_user_id as id,
    email,
    name,
    role,
    investment_advisor_code,
    logo_url,
    CASE 
        WHEN logo_url IS NULL OR logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
  AND investment_advisor_code != ''
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any advisors with codes but no logos
SELECT 
    'Advisors with codes but no logos (user_profiles)' as check_type,
    COUNT(*) as count,
    STRING_AGG(investment_advisor_code, ', ') as advisor_codes
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
  AND investment_advisor_code != ''
  AND (logo_url IS NULL OR logo_url = '');

-- Check if there are any advisors with codes but no logos (users table)
SELECT 
    'Advisors with codes but no logos (users)' as check_type,
    COUNT(*) as count,
    STRING_AGG(investment_advisor_code, ', ') as advisor_codes
FROM public.users
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
  AND investment_advisor_code != ''
  AND (logo_url IS NULL OR logo_url = '');

-- Summary
SELECT 
    '✅ DIAGNOSTIC COMPLETE' as status,
    'Check the results above to identify the issue:' as instruction_1,
    '1. Verify RLS policies allow authenticated users to read Investment Advisor profiles' as instruction_2,
    '2. Check if advisor codes exist and match between user_profiles and users tables' as instruction_3,
    '3. Verify logo_url is not NULL or empty for advisors' as instruction_4,
    '4. Test with actual advisor code to see if query works' as instruction_5;



