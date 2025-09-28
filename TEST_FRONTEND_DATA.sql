-- Test Frontend Data
-- This script simulates what the frontend should be receiving

-- 1. Check what the getPendingInvestmentAdvisorRelationships function should return
-- This simulates the database query that the frontend uses
SELECT 
    'Simulating getPendingInvestmentAdvisorRelationships' as info,
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
    advisor.email as advisor_email
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
WHERE advisor.id = '094538f8-c615-4379-a81a-846e891010b9'  -- Siddhi's advisor ID
ORDER BY r.created_at DESC;

-- 2. Check what startups should be visible to Siddhi
SELECT 
    'Startups visible to Siddhi' as info,
    s.id,
    s.name,
    s.investment_advisor_code,
    CASE 
        WHEN s.investment_advisor_code = 'IA-162090' THEN 'MATCHES SIDDHI'
        ELSE 'NO MATCH'
    END as match_status
FROM startups s
WHERE s.investment_advisor_code IS NOT NULL;

-- 3. Check if there are any issues with the relationship data
SELECT 
    'Relationship Data Quality Check' as info,
    r.id,
    r.investment_advisor_id,
    r.startup_id,
    r.relationship_type,
    advisor.name as advisor_name,
    s.name as startup_name,
    CASE 
        WHEN r.investment_advisor_id IS NULL THEN 'MISSING ADVISOR ID'
        WHEN r.startup_id IS NULL THEN 'MISSING STARTUP ID'
        WHEN advisor.id IS NULL THEN 'ADVISOR NOT FOUND'
        WHEN s.id IS NULL THEN 'STARTUP NOT FOUND'
        ELSE 'OK'
    END as status
FROM investment_advisor_relationships r
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
LEFT JOIN startups s ON s.id = r.startup_id
ORDER BY r.created_at DESC;
