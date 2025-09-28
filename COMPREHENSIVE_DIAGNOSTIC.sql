-- Comprehensive Diagnostic
-- This script checks everything to understand why the dashboard isn't showing the startup

-- 1. Check all Investment Advisors
SELECT 
    'All Investment Advisors' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE role = 'Investment Advisor'
ORDER BY created_at;

-- 2. Check all relationships
SELECT 
    'All Relationships' as info,
    r.id,
    r.investment_advisor_id,
    r.investor_id,
    r.startup_id,
    r.relationship_type,
    r.created_at
FROM investment_advisor_relationships r
ORDER BY r.created_at DESC;

-- 3. Check relationships with details
SELECT 
    'Relationships with Details' as info,
    r.id,
    r.relationship_type,
    r.created_at,
    CASE 
        WHEN r.relationship_type = 'advisor_investor' THEN u.name
        WHEN r.relationship_type = 'advisor_startup' THEN s.name
    END as entity_name,
    CASE 
        WHEN r.relationship_type = 'advisor_investor' THEN u.email
        WHEN r.relationship_type = 'advisor_startup' THEN 'N/A'
    END as entity_email,
    advisor.name as advisor_name,
    advisor.email as advisor_email,
    advisor.investment_advisor_code as advisor_code
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
ORDER BY r.created_at DESC;

-- 4. Check what startups have codes
SELECT 
    'Startups with Codes' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    s.user_id,
    u.name as user_name,
    u.email as user_email
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE s.investment_advisor_code IS NOT NULL
ORDER BY s.id;

-- 5. Check what users have entered codes
SELECT 
    'Users with Entered Codes' as info,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    u.role,
    u.investment_advisor_code_entered
FROM users u
WHERE u.investment_advisor_code_entered IS NOT NULL
ORDER BY u.created_at;

-- 6. Check if there are any mismatches
SELECT 
    'Potential Mismatches' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code as startup_code,
    u.name as user_name,
    u.investment_advisor_code_entered as user_entered_code,
    CASE 
        WHEN s.investment_advisor_code = u.investment_advisor_code_entered THEN 'MATCH'
        ELSE 'MISMATCH'
    END as status
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE s.investment_advisor_code IS NOT NULL
   OR u.investment_advisor_code_entered IS NOT NULL
ORDER BY s.id;

-- 7. Check if the advisor code exists and matches
SELECT 
    'Advisor Code Matching' as info,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code as startup_code,
    CASE 
        WHEN advisor.investment_advisor_code = s.investment_advisor_code THEN 'MATCH'
        ELSE 'NO MATCH'
    END as match_status
FROM users advisor
CROSS JOIN startups s
WHERE advisor.role = 'Investment Advisor'
  AND s.investment_advisor_code IS NOT NULL
ORDER BY advisor.id, s.id;
