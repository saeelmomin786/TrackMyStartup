-- =====================================================
-- TEST RLS POLICY FOR INVESTMENT INTERESTS
-- =====================================================
-- This script helps test if the RLS policy is working correctly
-- Run this while logged in as an Investment Advisor

-- 1. Check current user (should be your auth.uid())
SELECT 
    '1. Current Authenticated User' as test_section,
    auth.uid() as current_auth_uid,
    (SELECT name FROM users WHERE id = auth.uid()) as current_user_name,
    (SELECT role FROM users WHERE id = auth.uid()) as current_user_role,
    (SELECT investment_advisor_code FROM users WHERE id = auth.uid()) as advisor_code;

-- 2. Check what investors you should see (based on your advisor code)
SELECT 
    '2. Investors That Should Be Visible' as test_section,
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    COUNT(if.id) as favorite_count
FROM users u
LEFT JOIN investor_favorites if ON if.investor_id = u.id
WHERE u.role = 'Investor'
AND u.investment_advisor_code_entered = (SELECT investment_advisor_code FROM users WHERE id = auth.uid())
AND u.advisor_accepted = true
GROUP BY u.id, u.name, u.email, u.investment_advisor_code_entered, u.advisor_accepted;

-- 3. Test the actual query that the frontend uses (simulating RLS)
SELECT 
    '3. Investment Interests Query Test (Should match frontend query)' as test_section,
    if.id,
    if.investor_id,
    if.startup_id,
    if.created_at,
    investor.id as investor_user_id,
    investor.name as investor_name,
    investor.email as investor_email,
    startup.id as startup_id,
    startup.name as startup_name,
    startup.sector as startup_sector
FROM investor_favorites if
INNER JOIN users investor ON investor.id = if.investor_id
INNER JOIN startups startup ON startup.id = if.startup_id
WHERE investor.role = 'Investor'
AND investor.investment_advisor_code_entered = (SELECT investment_advisor_code FROM users WHERE id = auth.uid())
AND investor.advisor_accepted = true
ORDER BY if.created_at DESC;

-- 4. Check if RLS policy would allow this query
-- This simulates what the RLS policy checks
SELECT 
    '4. RLS Policy Logic Test' as test_section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'Investment Advisor'
        ) THEN '✅ User is Investment Advisor'
        ELSE '❌ User is NOT Investment Advisor'
    END as is_advisor_check,
    (SELECT investment_advisor_code FROM users WHERE id = auth.uid()) as advisor_code,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM users investor
            WHERE investor.id = investor_favorites.investor_id
            AND investor.investment_advisor_code_entered = (SELECT investment_advisor_code FROM users WHERE id = auth.uid())
            AND investor.advisor_accepted = true
        )
    ) as favorites_that_should_be_visible
FROM investor_favorites;

-- 5. Direct query without RLS (to see all favorites - for comparison)
-- Note: This will only work if you have admin access or RLS is bypassed
SELECT 
    '5. All Favorites (for comparison - may be blocked by RLS)' as test_section,
    COUNT(*) as total_favorites_in_table
FROM investor_favorites;

-- 6. Test the exact query the frontend uses with specific investor IDs
-- First, get the investor IDs that should be queried
WITH advisor_investors AS (
    SELECT u.id as investor_id
    FROM users u
    WHERE u.role = 'Investor'
    AND u.investment_advisor_code_entered = (SELECT investment_advisor_code FROM users WHERE id = auth.uid())
    AND u.advisor_accepted = true
)
SELECT 
    '6. Frontend Query Simulation (with specific investor IDs)' as test_section,
    if.id,
    if.investor_id,
    if.startup_id,
    if.created_at
FROM investor_favorites if
WHERE if.investor_id IN (SELECT investor_id FROM advisor_investors)
ORDER BY if.created_at DESC;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    'SUMMARY' as section,
    'If query 3 and 6 return results but UI shows nothing, check:' as note,
    '1. Browser console for JavaScript errors' as check1,
    '2. Network tab for failed API requests' as check2,
    '3. Verify investor IDs match between myInvestors and favorites table' as check3;


