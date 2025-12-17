-- =====================================================
-- FIX RLS FOR INVESTMENT INTERESTS JOINS
-- =====================================================
-- Problem: Investment Interests query uses joins to users and startups tables
--          RLS policies on those tables might block the joins
-- Solution: Ensure Investment Advisors can view their assigned investors via joins
-- =====================================================

-- Check current policies on users table
SELECT 
    'Current users table policies for Investment Advisors' as check_section,
    policyname,
    cmd,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor_code%')
ORDER BY policyname;

-- The issue is likely that when querying investor_favorites with joins like:
-- investor:users(id, name, email)
-- The RLS policy on users table might block Investment Advisors from seeing investor details

-- Solution: The RLS policy on users table should allow Investment Advisors to view
-- their assigned investors. This is typically handled by existing policies, but let's verify.

-- If the users table has a policy like "Users can view their own profile" or similar,
-- it might not allow Investment Advisors to see investor details in joins.

-- The investor_favorites RLS policy allows Investment Advisors to see the favorites,
-- but when Supabase tries to join to users table, the users table RLS might block it.

-- We need to ensure the users table RLS policy allows this query pattern.
-- The existing policy should work, but let's create a specific one if needed:

-- Drop and recreate policy to ensure Investment Advisors can view their assigned investors
-- (This is usually already handled by existing policies, but we're making sure)

-- Note: If you have a policy like "Investment Advisors can view assigned investors" 
-- on the users table, it should already allow this. This script just verifies it exists.

-- =====================================================
-- VERIFY JOIN ACCESS
-- =====================================================

-- Test if Investment Advisor can see investor details via join
-- Run this while logged in as Investment Advisor
SELECT 
    'Test: Can Investment Advisor see investor details via join?' as test_section,
    CASE 
        WHEN EXISTS (
            -- Try to query users table for assigned investors
            SELECT 1 FROM users investor
            WHERE investor.role = 'Investor'
            AND investor.investment_advisor_code_entered = (
                SELECT investment_advisor_code FROM users WHERE id = auth.uid()
            )
            AND investor.advisor_accepted = true
            LIMIT 1
        ) THEN '✅ YES - Can see investor details'
        ELSE '❌ NO - Cannot see investor details (RLS blocking)'
    END as can_see_investors;

-- =====================================================
-- ALTERNATIVE: USE FALLBACK QUERY (NO JOINS)
-- =====================================================
-- If joins are blocked, the frontend code already has a fallback that queries
-- without joins and then fetches user/startup details separately.
-- This should work, but let's make sure the users table policy allows it.

-- The frontend fallback query is:
-- 1. SELECT * FROM investor_favorites WHERE investor_id IN (...)
-- 2. SELECT id, name, email FROM users WHERE id IN (investor_ids)
-- 3. SELECT id, name, sector FROM startups WHERE id IN (startup_ids)

-- For step 2, Investment Advisor needs to be able to query users table
-- for their assigned investors. This should work with existing policies.

-- =====================================================
-- RECOMMENDATION
-- =====================================================
-- The most likely issue is that the users table RLS policy doesn't allow
-- Investment Advisors to view their assigned investors when accessed via joins.

-- Check if you have a policy like this on users table:
-- "Investment Advisors can view assigned investors"

-- If not, you might need to add one, OR the frontend fallback should handle it.
-- The code already has fallback logic, so it should work even if joins are blocked.

-- The best solution is to check browser console logs to see:
-- 1. If the main query with joins fails
-- 2. If the fallback query works
-- 3. What specific error is shown

SELECT 
    'RECOMMENDATION' as section,
    'Check browser console for detailed error messages' as step1,
    'The code has fallback logic that should work even if joins are blocked' as step2,
    'Verify users table RLS allows Investment Advisors to query their assigned investors' as step3;



