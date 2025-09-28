-- =====================================================
-- INVESTMENT ADVISOR VISIBILITY DIAGNOSTIC
-- =====================================================
-- This script diagnoses why investment advisors can't see startups in their dashboard

-- Step 1: Check all investment advisors
SELECT '=== INVESTMENT ADVISORS ===' as step;
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
SELECT '=== USERS WITH INVESTMENT ADVISOR CODES ===' as step;
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

-- Step 3: Check startups and their associated users
SELECT '=== STARTUPS WITH USER RELATIONSHIPS ===' as step;
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    s.investment_advisor_code as startup_code,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    u.investment_advisor_code_entered as user_entered_code,
    u.advisor_accepted
FROM startups s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;

-- Step 4: Check investment advisor relationships
SELECT '=== INVESTMENT ADVISOR RELATIONSHIPS ===' as step;
SELECT 
    r.id as relationship_id,
    r.investment_advisor_id,
    r.startup_id,
    r.investor_id,
    r.relationship_type,
    r.created_at,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    CASE 
        WHEN r.relationship_type = 'advisor_startup' THEN s.name
        WHEN r.relationship_type = 'advisor_investor' THEN u.name
    END as entity_name
FROM investment_advisor_relationships r
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users u ON u.id = r.investor_id
ORDER BY r.created_at DESC;

-- Step 5: Check for potential matches (what SHOULD be visible to advisors)
SELECT '=== POTENTIAL ADVISOR-STARTUP MATCHES ===' as step;
SELECT 
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    s.id as startup_id,
    s.name as startup_name,
    u.name as startup_user_name,
    u.email as startup_user_email,
    u.investment_advisor_code_entered as user_entered_code,
    u.advisor_accepted,
    CASE 
        WHEN advisor.investment_advisor_code = u.investment_advisor_code_entered THEN 'SHOULD BE VISIBLE'
        ELSE 'NO MATCH'
    END as visibility_status
FROM users advisor
CROSS JOIN startups s
LEFT JOIN users u ON s.user_id = u.id
WHERE advisor.role = 'Investment Advisor'
  AND u.investment_advisor_code_entered IS NOT NULL
ORDER BY advisor.id, s.id;

-- Step 6: Check for potential advisor-investor matches
SELECT '=== POTENTIAL ADVISOR-INVESTOR MATCHES ===' as step;
SELECT 
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered as user_entered_code,
    u.advisor_accepted,
    CASE 
        WHEN advisor.investment_advisor_code = u.investment_advisor_code_entered THEN 'SHOULD BE VISIBLE'
        ELSE 'NO MATCH'
    END as visibility_status
FROM users advisor
CROSS JOIN users u
WHERE advisor.role = 'Investment Advisor'
  AND u.role = 'Investor'
  AND u.investment_advisor_code_entered IS NOT NULL
ORDER BY advisor.id, u.id;

-- Step 7: Check if advisor_accepted column exists
SELECT '=== CHECKING ADVISOR_ACCEPTED COLUMN ===' as step;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'advisor_accepted';

-- Step 8: Show sample data for debugging
SELECT '=== SAMPLE DATA FOR DEBUGGING ===' as step;
SELECT 
    'Advisor Data' as data_type,
    id,
    name,
    email,
    investment_advisor_code,
    'N/A' as investment_advisor_code_entered,
    'N/A' as advisor_accepted
FROM users 
WHERE role = 'Investment Advisor'
UNION ALL
SELECT 
    'User Data' as data_type,
    id,
    name,
    email,
    'N/A' as investment_advisor_code,
    investment_advisor_code_entered,
    COALESCE(advisor_accepted::text, 'NULL') as advisor_accepted
FROM users 
WHERE investment_advisor_code_entered IS NOT NULL
ORDER BY data_type, name;
