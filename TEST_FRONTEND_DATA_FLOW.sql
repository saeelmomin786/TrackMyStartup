-- Test Frontend Data Flow
-- This script tests the exact data flow that the frontend should receive

-- 1. Test the exact query that the frontend uses
SELECT 
    'Frontend Query Test' as info,
    r.id,
    r.relationship_type,
    r.created_at,
    s.id as startup_id,
    s.name as startup_name,
    s.sector,
    s.total_funding,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.email as advisor_email
FROM investment_advisor_relationships r
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
  AND r.relationship_type = 'advisor_startup'
ORDER BY r.created_at DESC;

-- 2. Test the fallback query (in case the main query fails)
SELECT 
    'Fallback Query Test' as info,
    s.id,
    s.name,
    s.investment_advisor_code,
    s.created_at
FROM startups s
WHERE s.investment_advisor_code = 'IA-162090'  -- Siddhi's advisor code
ORDER BY s.created_at DESC;

-- 3. Check if there are any issues with the data format
SELECT 
    'Data Format Check' as info,
    r.id,
    r.relationship_type,
    r.created_at,
    CASE 
        WHEN r.startup_id IS NULL THEN 'MISSING STARTUP ID'
        WHEN s.id IS NULL THEN 'STARTUP NOT FOUND'
        WHEN advisor.id IS NULL THEN 'ADVISOR NOT FOUND'
        ELSE 'OK'
    END as status,
    s.name as startup_name,
    advisor.name as advisor_name
FROM investment_advisor_relationships r
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
ORDER BY r.created_at DESC;
