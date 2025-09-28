-- Disable Triggers and Fix Relationships
-- This script disables the problematic triggers and creates relationships manually

-- 1. First, disable the problematic triggers
DROP TRIGGER IF EXISTS trigger_update_investment_advisor_relationship ON users;
DROP TRIGGER IF EXISTS trigger_update_startup_investment_advisor_relationship ON startups;

-- 2. Check what startups actually have in their investment_advisor_code field
SELECT 
    'Startups Table - investment_advisor_code field' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    s.user_id
FROM startups s
ORDER BY s.id;

-- 3. Check what users have in their investment_advisor_code_entered field
SELECT 
    'Users Table - investment_advisor_code_entered field' as info,
    u.id as user_id,
    u.name as user_name,
    u.role,
    u.investment_advisor_code_entered
FROM users u
WHERE u.investment_advisor_code_entered IS NOT NULL;

-- 4. Check what Investment Advisors exist
SELECT 
    'Investment Advisors' as info,
    u.id as advisor_id,
    u.name as advisor_name,
    u.investment_advisor_code
FROM users u
WHERE u.role = 'Investment Advisor';

-- 5. Copy the codes from users to startups
UPDATE startups 
SET investment_advisor_code = u.investment_advisor_code_entered
FROM users u
WHERE startups.user_id = u.id 
  AND u.role = 'Startup'
  AND u.investment_advisor_code_entered IS NOT NULL;

-- 6. Verify the update worked
SELECT 
    'Updated Startups' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    u.name as user_name,
    u.investment_advisor_code_entered
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE s.investment_advisor_code IS NOT NULL;

-- 7. Now create the relationships manually (no triggers interfering)
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

-- 8. Also create relationships for investors
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

-- 9. Final verification
SELECT 
    'Final Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 10. Show the actual relationships
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
    advisor.name as advisor_name,
    advisor.email as advisor_email
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
ORDER BY r.created_at DESC;
