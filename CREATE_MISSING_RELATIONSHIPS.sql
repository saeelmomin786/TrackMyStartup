-- Create Missing Investment Advisor Relationships
-- This script manually creates relationships for existing data

-- 1. Check current status
SELECT 
    'Current Status' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 2. Check users with investment advisor codes
SELECT 
    'Users with codes' as info,
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN investment_advisor_code_entered IS NOT NULL THEN 1 END) as with_entered_codes,
    COUNT(CASE WHEN investment_advisor_code IS NOT NULL THEN 1 END) as with_own_codes
FROM users 
WHERE role IN ('Investor', 'Investment Advisor', 'Startup')
GROUP BY role;

-- 3. Check startups with investment advisor codes
SELECT 
    'Startups with codes' as info,
    COUNT(*) as total_startups,
    COUNT(CASE WHEN investment_advisor_code IS NOT NULL THEN 1 END) as with_codes
FROM startups;

-- 4. Create relationships for investors
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    investor.id as investor_id,
    'advisor_investor' as relationship_type
FROM users investor
JOIN users advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
WHERE investor.role = 'Investor' 
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND advisor.role = 'Investment Advisor'
  AND NOT EXISTS (
    SELECT 1 FROM investment_advisor_relationships 
    WHERE investment_advisor_id = advisor.id 
      AND investor_id = investor.id 
      AND relationship_type = 'advisor_investor'
  )
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 5. Create relationships for startups
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    startup.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups startup
JOIN users advisor ON advisor.investment_advisor_code = startup.investment_advisor_code
WHERE startup.investment_advisor_code IS NOT NULL
  AND advisor.role = 'Investment Advisor'
  AND NOT EXISTS (
    SELECT 1 FROM investment_advisor_relationships 
    WHERE investment_advisor_id = advisor.id 
      AND startup_id = startup.id 
      AND relationship_type = 'advisor_startup'
  )
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 6. Verify the relationships were created
SELECT 
    'Final Status' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 7. Show detailed relationships
SELECT 
    'Detailed Relationships' as info,
    r.relationship_type,
    r.created_at,
    CASE 
        WHEN r.relationship_type = 'advisor_investor' THEN u.name
        WHEN r.relationship_type = 'advisor_startup' THEN s.name
    END as entity_name,
    CASE 
        WHEN r.relationship_type = 'advisor_investor' THEN u.email
        WHEN r.relationship_type = 'advisor_startup' THEN 'N/A'
    END as entity_email
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
ORDER BY r.created_at DESC;

