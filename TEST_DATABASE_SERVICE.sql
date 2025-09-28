-- Test Database Service
-- This script tests exactly what the database service should return

-- 1. Test the advisor code lookup (first step in the service)
SELECT 
    'Advisor Code Lookup' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code
FROM users 
WHERE id = '094538f8-c615-4379-a81a-846e891010b9'
  AND role = 'Investment Advisor';

-- 2. Test the startup relationships query (main query)
SELECT 
    'Startup Relationships Query' as info,
    r.id,
    r.investment_advisor_id,
    r.startup_id,
    r.relationship_type,
    r.created_at,
    s.id as startup_id_from_join,
    s.name as startup_name,
    s.sector,
    s.total_funding
FROM investment_advisor_relationships r
LEFT JOIN startups s ON s.id = r.startup_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
  AND r.relationship_type = 'advisor_startup'
ORDER BY r.created_at DESC;

-- 3. Test the investor relationships query
SELECT 
    'Investor Relationships Query' as info,
    r.id,
    r.investment_advisor_id,
    r.investor_id,
    r.relationship_type,
    r.created_at,
    u.id as investor_id_from_join,
    u.name as investor_name,
    u.email as investor_email
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
  AND r.relationship_type = 'advisor_investor'
ORDER BY r.created_at DESC;

-- 4. Test the fallback query (if main query fails)
SELECT 
    'Fallback Query - Startups' as info,
    s.id,
    s.name,
    s.investment_advisor_code,
    s.created_at
FROM startups s
WHERE s.investment_advisor_code = 'IA-162090'  -- Siddhi's advisor code
ORDER BY s.created_at DESC;

-- 5. Test the fallback query for investors
SELECT 
    'Fallback Query - Investors' as info,
    u.id,
    u.name,
    u.email,
    u.investment_advisor_code_entered,
    u.created_at
FROM users u
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered = 'IA-162090'
ORDER BY u.created_at DESC;
