-- Create advisor relationships and then create offers
-- This will establish the missing relationships first

-- 1. First, let's see what we have
SELECT 
    'Current State Check' as info,
    'Users with advisor codes' as type,
    COUNT(*) as count
FROM users 
WHERE investment_advisor_code IS NOT NULL

UNION ALL

SELECT 
    'Current State Check' as info,
    'Users who entered advisor codes' as type,
    COUNT(*) as count
FROM users 
WHERE investment_advisor_code_entered IS NOT NULL

UNION ALL

SELECT 
    'Current State Check' as info,
    'Existing relationships' as type,
    COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
    'Current State Check' as info,
    'Existing offers' as type,
    COUNT(*) as count
FROM investment_offers;

-- 2. Create relationships for users who entered advisor codes
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM users u
JOIN users advisor ON advisor.investment_advisor_code = u.investment_advisor_code_entered
JOIN startups s ON s.user_id = u.id
WHERE u.investment_advisor_code_entered IS NOT NULL
  AND u.advisor_accepted = true
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 3. Create relationships for investors who entered advisor codes
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    u.id as investor_id,
    'advisor_investor' as relationship_type
FROM users u
JOIN users advisor ON advisor.investment_advisor_code = u.investment_advisor_code_entered
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND u.advisor_accepted = true
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 4. Show what relationships were created
SELECT 
    'Created Relationships' as info,
    id,
    investment_advisor_id,
    startup_id,
    investor_id,
    relationship_type,
    created_at
FROM investment_advisor_relationships
ORDER BY created_at DESC;

-- 5. Show final counts
SELECT 
    'Final Counts' as info,
    'Relationships' as type,
    COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
    'Final Counts' as info,
    'Offers' as type,
    COUNT(*) as count
FROM investment_offers;
