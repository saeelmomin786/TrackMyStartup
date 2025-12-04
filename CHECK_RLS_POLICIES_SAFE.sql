-- =====================================================
-- SAFE RLS POLICY CHECKER - READ ONLY
-- =====================================================
-- This script is 100% SAFE - it only READS/CHECKS policies
-- It does NOT modify, drop, or create any policies
-- Run this first to see what policies exist before making changes
-- =====================================================

-- Step 1: Check current RLS policies on all main tables
SELECT '=== CURRENT RLS POLICIES ON STARTUPS ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'startups'
AND schemaname = 'public'
ORDER BY policyname;

SELECT '=== CURRENT RLS POLICIES ON USERS ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public'
ORDER BY policyname;

SELECT '=== CURRENT RLS POLICIES ON INVESTMENT_OFFERS ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'investment_offers'
AND schemaname = 'public'
ORDER BY policyname;

-- Step 2: Check if helper functions exist
SELECT '=== CHECKING HELPER FUNCTIONS ===' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_role', 'is_admin', 'is_startup', 'is_investor', 'is_ca_or_cs', 'is_facilitator', 'is_mentor')
ORDER BY routine_name;

-- Step 3: Check if is_mentor function exists (from migration)
SELECT '=== CHECKING IF MENTOR FUNCTION EXISTS ===' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'is_mentor'
        ) THEN '✅ is_mentor() function EXISTS'
        ELSE '❌ is_mentor() function DOES NOT EXIST - Run ADD_MENTOR_ROLE_MIGRATION.sql first'
    END as mentor_function_status;

-- Step 4: Summary - What needs to be done
SELECT '=== SUMMARY: WHAT NEEDS TO BE DONE ===' as info;
SELECT 
    '1. Review the policies above' as step,
    '2. Decide which policies should include Mentor role' as step2,
    '3. Create new policies OR update existing ones manually' as step3,
    '4. Test in development environment first' as step4;

-- =====================================================
-- THIS SCRIPT IS 100% SAFE - NO MODIFICATIONS
-- =====================================================
-- It only reads/checks - does not change anything
-- =====================================================

