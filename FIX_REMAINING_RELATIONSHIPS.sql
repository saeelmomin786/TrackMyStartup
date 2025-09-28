-- Fix Remaining Relationships
-- This script creates relationships for startups with codes that don't match any advisor

-- 1. Check current relationships
SELECT 
    'Current Relationships' as info,
    r.id,
    r.relationship_type,
    r.created_at,
    advisor.name as advisor_name,
    s.name as startup_name
FROM investment_advisor_relationships r
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
LEFT JOIN startups s ON s.id = r.startup_id
ORDER BY r.created_at DESC;

-- 2. Check which startups don't have relationships yet
SELECT 
    'Startups without relationships' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    CASE 
        WHEN r.id IS NULL THEN 'NO RELATIONSHIP'
        ELSE 'HAS RELATIONSHIP'
    END as status
FROM startups s
LEFT JOIN investment_advisor_relationships r ON r.startup_id = s.id
WHERE s.investment_advisor_code IS NOT NULL
ORDER BY s.id;

-- 3. Create relationships for startups with codes that don't match any advisor
-- We'll assign them to Siddhi as a workaround
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    '094538f8-c615-4379-a81a-846e891010b9' as investment_advisor_id,  -- Siddhi's ID
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
WHERE s.investment_advisor_code IS NOT NULL
  AND s.id NOT IN (
    SELECT startup_id 
    FROM investment_advisor_relationships 
    WHERE startup_id IS NOT NULL
  )
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 4. Also create relationships for investors with codes that don't match any advisor
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    '094538f8-c615-4379-a81a-846e891010b9' as investment_advisor_id,  -- Siddhi's ID
    u.id as investor_id,
    'advisor_investor' as relationship_type
FROM users u
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND u.id NOT IN (
    SELECT investor_id 
    FROM investment_advisor_relationships 
    WHERE investor_id IS NOT NULL
  )
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 5. Final verification
SELECT 
    'Final Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 6. Show all relationships with details
SELECT 
    'All Relationships with Details' as info,
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
ORDER BY r.created_at DESC;
