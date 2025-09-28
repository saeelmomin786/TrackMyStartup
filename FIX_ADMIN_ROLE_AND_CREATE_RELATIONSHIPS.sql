-- Fix Admin Role and Create Relationships
-- This script fixes the role issue and creates the relationships

-- 1. First, let's see the current state
SELECT 
    'Current Users with Advisor Codes' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code
FROM users 
WHERE investment_advisor_code IS NOT NULL;

-- 2. Update Saeel's role from Admin to Investment Advisor
UPDATE users 
SET role = 'Investment Advisor'
WHERE id = '377a914f-89e2-4215-84c6-d3f00e6c188b'  -- Saeel's ID
  AND investment_advisor_code = 'IA-629552';

-- 3. Verify the role change
SELECT 
    'Updated Users' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code
FROM users 
WHERE investment_advisor_code IS NOT NULL;

-- 4. Now let's see what startups have codes
SELECT 
    'Startups with Codes' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    u.name as user_name
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE s.investment_advisor_code IS NOT NULL;

-- 5. Create the relationships manually (bypassing the trigger)
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

-- 6. Also create relationships for investors
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

-- 7. Final verification
SELECT 
    'Final Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 8. Show the actual relationships
SELECT 
    'Created Relationships' as info,
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
    advisor.name as advisor_name
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
ORDER BY r.created_at DESC;
