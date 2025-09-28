-- =====================================================
-- FIX ALL INVESTMENT ADVISORS VISIBILITY
-- =====================================================
-- This script fixes visibility issues for ALL investment advisors, not just Siddhi

-- Step 1: Check all investment advisors
SELECT '=== ALL INVESTMENT ADVISORS ===' as step;
SELECT 
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE role = 'Investment Advisor'
ORDER BY created_at;

-- Step 2: Check all users who entered investment advisor codes
SELECT '=== ALL USERS WITH INVESTMENT ADVISOR CODES ===' as step;
SELECT 
    id,
    name,
    email,
    role,
    investment_advisor_code_entered,
    advisor_accepted,
    created_at
FROM users 
WHERE investment_advisor_code_entered IS NOT NULL
ORDER BY role, created_at;

-- Step 3: Ensure all startups have proper investment advisor codes
SELECT '=== SYNCING ALL STARTUP CODES ===' as step;

-- Update all startups with their users' investment advisor codes
UPDATE startups 
SET investment_advisor_code = u.investment_advisor_code_entered
FROM users u
WHERE startups.user_id = u.id 
  AND u.role = 'Startup'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND startups.investment_advisor_code IS NULL;

-- Step 4: Create relationships for ALL investment advisors
SELECT '=== CREATING RELATIONSHIPS FOR ALL ADVISORS ===' as step;

-- Create advisor-startup relationships for all advisors
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code IS NOT NULL
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- Create advisor-investor relationships for all advisors
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    u.id as investor_id,
    'advisor_investor' as relationship_type
FROM users u
JOIN users advisor ON advisor.investment_advisor_code = u.investment_advisor_code_entered
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- Step 5: Verify the fix for ALL advisors
SELECT '=== VERIFICATION FOR ALL ADVISORS ===' as step;

-- Check all advisor relationships
SELECT 
    'All Advisor Relationships' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    COUNT(r.id) as total_relationships,
    COUNT(CASE WHEN r.relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships,
    COUNT(CASE WHEN r.relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships
FROM users advisor
LEFT JOIN investment_advisor_relationships r ON advisor.id = r.investment_advisor_id
WHERE advisor.role = 'Investment Advisor'
GROUP BY advisor.id, advisor.name, advisor.investment_advisor_code
ORDER BY advisor.created_at;

-- Step 6: Show what each advisor should see
SELECT '=== WHAT EACH ADVISOR SHOULD SEE ===' as step;

-- Startups visible to each advisor
SELECT 
    'Startups Visible to Advisors' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    s.name as startup_name,
    u.name as startup_user_name,
    u.email as startup_user_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM users advisor
JOIN startups s ON s.investment_advisor_code = advisor.investment_advisor_code
JOIN users u ON s.user_id = u.id
WHERE advisor.role = 'Investment Advisor'
ORDER BY advisor.name, s.name;

-- Investors visible to each advisor
SELECT 
    'Investors Visible to Advisors' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM users advisor
JOIN users u ON u.investment_advisor_code_entered = advisor.investment_advisor_code
WHERE advisor.role = 'Investment Advisor'
  AND u.role = 'Investor'
ORDER BY advisor.name, u.name;

-- Step 7: Test frontend queries for each advisor
SELECT '=== FRONTEND QUERY TEST FOR ALL ADVISORS ===' as step;

-- Pending startup requests for each advisor
SELECT 
    'Pending Startup Requests' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    s.id as startup_id,
    s.name as startup_name,
    u.name as user_name,
    u.email as user_email,
    u.advisor_accepted,
    'PENDING' as request_status
FROM users advisor
JOIN startups s ON s.investment_advisor_code = advisor.investment_advisor_code
JOIN users u ON s.user_id = u.id
WHERE advisor.role = 'Investment Advisor'
  AND u.role = 'Startup'
  AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL)
ORDER BY advisor.name, s.created_at;

-- Pending investor requests for each advisor
SELECT 
    'Pending Investor Requests' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.advisor_accepted,
    'PENDING' as request_status
FROM users advisor
JOIN users u ON u.investment_advisor_code_entered = advisor.investment_advisor_code
WHERE advisor.role = 'Investment Advisor'
  AND u.role = 'Investor'
  AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL)
ORDER BY advisor.name, u.created_at;

-- Step 8: Summary for all advisors
SELECT '=== DASHBOARD SUMMARY FOR ALL ADVISORS ===' as step;
SELECT 
    'Dashboard Summary' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    COUNT(CASE WHEN u.role = 'Startup' AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL) THEN 1 END) as pending_startup_requests,
    COUNT(CASE WHEN u.role = 'Investor' AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL) THEN 1 END) as pending_investor_requests,
    COUNT(CASE WHEN u.role = 'Startup' AND u.advisor_accepted = true THEN 1 END) as accepted_startups,
    COUNT(CASE WHEN u.role = 'Investor' AND u.advisor_accepted = true THEN 1 END) as accepted_investors
FROM users advisor
LEFT JOIN users u ON u.investment_advisor_code_entered = advisor.investment_advisor_code
WHERE advisor.role = 'Investment Advisor'
GROUP BY advisor.id, advisor.name, advisor.investment_advisor_code
ORDER BY advisor.created_at;

SELECT '=== FIX COMPLETE FOR ALL ADVISORS ===' as step;
