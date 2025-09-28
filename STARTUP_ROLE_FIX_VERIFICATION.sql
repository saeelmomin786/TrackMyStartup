-- =====================================================
-- STARTUP ROLE FIX VERIFICATION
-- =====================================================
-- This script verifies that all startup role issues have been resolved

-- 1. Check user roles distribution
SELECT 
    'User Roles Distribution' as info,
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

-- 2. Check startups with user relationships
SELECT 
    'Startups with User Relationships' as info,
    COUNT(*) as total_startups,
    COUNT(user_id) as startups_with_user_id,
    COUNT(*) - COUNT(user_id) as startups_without_user_id
FROM startups;

-- 3. Check investment advisor codes in startups
SELECT 
    'Investment Advisor Codes in Startups' as info,
    COUNT(*) as total_startups,
    COUNT(investment_advisor_code) as startups_with_codes,
    COUNT(*) - COUNT(investment_advisor_code) as startups_without_codes
FROM startups;

-- 4. Check investment advisor relationships
SELECT 
    'Investment Advisor Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 5. Check for startup name mismatches
SELECT 
    'Startup Name Mismatches' as info,
    COUNT(*) as total_startup_user_pairs,
    COUNT(CASE WHEN s.name = u.startup_name THEN 1 END) as matched_names,
    COUNT(CASE WHEN s.name != u.startup_name THEN 1 END) as mismatched_names
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE u.role = 'Startup';

-- 6. Show sample of fixed data
SELECT 
    'Sample Fixed Data' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    u.name as user_name,
    u.startup_name as user_startup_name,
    s.investment_advisor_code,
    CASE 
        WHEN s.name = u.startup_name THEN 'MATCHED'
        ELSE 'MISMATCH'
    END as name_match_status
FROM startups s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 7. Check investment advisors and their associated startups
SELECT 
    'Investment Advisors and Their Startups' as info,
    advisor.id as advisor_id,
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

-- 8. Check startups with investment advisor codes
SELECT 
    'Startups with Investment Advisor Codes' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    u.name as user_name,
    u.email as user_email
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE s.investment_advisor_code IS NOT NULL
ORDER BY s.created_at DESC;
