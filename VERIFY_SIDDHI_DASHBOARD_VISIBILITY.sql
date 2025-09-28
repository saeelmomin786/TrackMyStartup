-- =====================================================
-- VERIFY SIDDHI DASHBOARD VISIBILITY
-- =====================================================
-- This script verifies that Siddhi can now see startups in his dashboard

-- Step 1: Check Siddhi's relationships
SELECT '=== SIDDHI RELATIONSHIPS ===' as step;
SELECT 
    r.id as relationship_id,
    r.relationship_type,
    r.created_at,
    CASE 
        WHEN r.relationship_type = 'advisor_startup' THEN s.name
        WHEN r.relationship_type = 'advisor_investor' THEN u.name
    END as entity_name,
    CASE 
        WHEN r.relationship_type = 'advisor_startup' THEN 'Startup'
        WHEN r.relationship_type = 'advisor_investor' THEN 'Investor'
    END as entity_type
FROM investment_advisor_relationships r
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users u ON u.id = r.investor_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
ORDER BY r.created_at;

-- Step 2: Check what startups should be visible to Siddhi
SELECT '=== STARTUPS VISIBLE TO SIDDHI ===' as step;
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    u.name as user_name,
    u.email as user_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE u.investment_advisor_code_entered = 'IA-162090'
  AND u.role = 'Startup'
ORDER BY s.created_at;

-- Step 3: Check what investors should be visible to Siddhi
SELECT '=== INVESTORS VISIBLE TO SIDDHI ===' as step;
SELECT 
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM users u
WHERE u.investment_advisor_code_entered = 'IA-162090'
  AND u.role = 'Investor'
ORDER BY u.created_at;

-- Step 4: Test the exact frontend query for pending startup requests
SELECT '=== FRONTEND QUERY: PENDING STARTUP REQUESTS ===' as step;
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    u.name as user_name,
    u.email as user_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    'PENDING' as request_status
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE u.role = 'Startup'
  AND u.investment_advisor_code_entered = 'IA-162090'
  AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL)
ORDER BY s.created_at;

-- Step 5: Test the exact frontend query for pending investor requests
SELECT '=== FRONTEND QUERY: PENDING INVESTOR REQUESTS ===' as step;
SELECT 
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    'PENDING' as request_status
FROM users u
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered = 'IA-162090'
  AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL)
ORDER BY u.created_at;

-- Step 6: Summary of what Siddhi should see
SELECT '=== DASHBOARD SUMMARY FOR SIDDHI ===' as step;
SELECT 
    'Dashboard Summary' as info,
    COUNT(CASE WHEN u.role = 'Startup' AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL) THEN 1 END) as pending_startup_requests,
    COUNT(CASE WHEN u.role = 'Investor' AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL) THEN 1 END) as pending_investor_requests,
    COUNT(CASE WHEN u.role = 'Startup' AND u.advisor_accepted = true THEN 1 END) as accepted_startups,
    COUNT(CASE WHEN u.role = 'Investor' AND u.advisor_accepted = true THEN 1 END) as accepted_investors
FROM users u
WHERE u.investment_advisor_code_entered = 'IA-162090';

SELECT '=== VERIFICATION COMPLETE ===' as step;
