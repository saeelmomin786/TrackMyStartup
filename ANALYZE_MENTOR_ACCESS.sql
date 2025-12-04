-- =====================================================
-- ANALYZE MENTOR ACCESS - READ ONLY ANALYSIS
-- =====================================================
-- This script analyzes what access Mentors currently have
-- It does NOT modify anything - 100% safe
-- =====================================================

-- Step 1: Check if Mentors already have access through existing policies
SELECT '=== MENTOR ACCESS ANALYSIS ===' as info;

-- Check if "startups_authenticated_read" gives Mentor access
SELECT 
    'Policy: startups_authenticated_read' as policy_name,
    CASE 
        WHEN qual = 'true' THEN '✅ Mentors ALREADY HAVE READ ACCESS (all authenticated users)'
        ELSE '❌ Mentors may not have access'
    END as mentor_access_status,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'startups'
AND policyname = 'startups_authenticated_read';

-- Step 2: Check what the "Investors with due diligence" policy allows
SELECT 
    'Policy: Investors with due diligence can view startups' as policy_name,
    'This policy allows: Investors/Advisors with due diligence, Investment Advisors, CA/CS/Admin, and own startups' as description,
    'Mentors are NOT explicitly included' as mentor_status;

-- Step 3: Summary of current Mentor access
SELECT '=== CURRENT MENTOR ACCESS SUMMARY ===' as info;
SELECT 
    '✅ Mentors CAN view all startups' as access_type,
    'Through: startups_authenticated_read policy (qual = true)' as via_policy,
    'This means ALL authenticated users (including Mentors) can SELECT from startups table' as explanation;

-- Step 4: Check if Mentors need additional permissions
SELECT '=== RECOMMENDATIONS ===' as info;
SELECT 
    '1. Mentors already have READ access to all startups' as recommendation,
    '2. If you want to restrict Mentors to only assigned startups, create a new policy' as recommendation2,
    '3. If you want Mentors to have UPDATE access, create a new policy' as recommendation3,
    '4. Current setup: Mentors can view all startups (read-only)' as current_setup;

-- =====================================================
-- CONCLUSION
-- =====================================================
-- Based on the "startups_authenticated_read" policy with qual = true,
-- Mentors ALREADY HAVE read access to all startups.
-- 
-- You may want to:
-- 1. Keep current setup (Mentors can view all startups) - NO ACTION NEEDED
-- 2. Restrict to assigned startups only - Create new restrictive policy
-- 3. Add UPDATE access - Create new policy for Mentor updates
-- =====================================================

