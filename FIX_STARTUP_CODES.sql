-- Fix Startup Investment Advisor Codes
-- This script updates the startups table with the codes from the users table

-- 1. First, let's see the current state
SELECT 
    'Current State' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code as startup_code,
    u.name as user_name,
    u.investment_advisor_code_entered as user_entered_code
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE u.role = 'Startup'
ORDER BY s.id;

-- 2. Update startups with the codes from their users
UPDATE startups 
SET investment_advisor_code = u.investment_advisor_code_entered
FROM users u
WHERE startups.user_id = u.id 
  AND u.role = 'Startup'
  AND u.investment_advisor_code_entered IS NOT NULL;

-- 3. Verify the updates
SELECT 
    'Updated Startups' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code as startup_code,
    u.name as user_name,
    u.investment_advisor_code_entered as user_entered_code
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE u.role = 'Startup'
  AND s.investment_advisor_code IS NOT NULL
ORDER BY s.id;

-- 4. Now create the relationships
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

-- 5. Also create relationships for investors
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

-- 6. Final verification
SELECT 
    'Final Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 7. Show the actual relationships
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
