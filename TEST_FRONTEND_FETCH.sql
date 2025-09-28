-- Test Frontend Fetch
-- This script simulates exactly what the frontend should be receiving

-- 1. Simulate the exact query that getPendingInvestmentAdvisorRelationships uses
-- for startup relationships
SELECT 
    'Frontend Startup Query Result' as info,
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
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'  -- Siddhi's ID
  AND r.relationship_type = 'advisor_startup'
ORDER BY r.created_at DESC;

-- 2. Simulate the exact query for investor relationships
SELECT 
    'Frontend Investor Query Result' as info,
    r.id,
    r.investment_advisor_id,
    r.investor_id,
    r.relationship_type,
    r.created_at,
    u.id as investor_id_from_join,
    u.name as investor_name,
    u.email as investor_email,
    u.role
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'  -- Siddhi's ID
  AND r.relationship_type = 'advisor_investor'
ORDER BY r.created_at DESC;

-- 3. Check if there are any issues with the foreign key relationships
SELECT 
    'Foreign Key Check' as info,
    r.id,
    r.investment_advisor_id,
    r.startup_id,
    r.relationship_type,
    CASE 
        WHEN r.investment_advisor_id IS NULL THEN 'MISSING ADVISOR ID'
        WHEN r.startup_id IS NULL THEN 'MISSING STARTUP ID'
        WHEN advisor.id IS NULL THEN 'ADVISOR NOT FOUND'
        WHEN s.id IS NULL THEN 'STARTUP NOT FOUND'
        ELSE 'OK'
    END as status,
    advisor.name as advisor_name,
    s.name as startup_name
FROM investment_advisor_relationships r
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
LEFT JOIN startups s ON s.id = r.startup_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
ORDER BY r.created_at DESC;
