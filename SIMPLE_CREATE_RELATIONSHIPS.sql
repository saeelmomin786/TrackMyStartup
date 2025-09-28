-- Simple Create Relationships
-- This script uses a simpler approach to create relationships

-- 1. First, let's see what we're working with
SELECT 'Step 1: Check Investment Advisors' as step;
SELECT id, name, email, investment_advisor_code 
FROM users 
WHERE role = 'Investment Advisor';

-- 2. Check users with entered codes
SELECT 'Step 2: Check Users with Entered Codes' as step;
SELECT id, name, email, role, investment_advisor_code_entered 
FROM users 
WHERE investment_advisor_code_entered IS NOT NULL;

-- 3. Check startups with codes
SELECT 'Step 3: Check Startups with Codes' as step;
SELECT id, name, investment_advisor_code 
FROM startups 
WHERE investment_advisor_code IS NOT NULL;

-- 4. Create relationships for investors (step by step)
SELECT 'Step 4: Creating Investor Relationships' as step;

-- First, let's see what would be created
SELECT 
    'Would create investor relationship' as action,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    investor.id as investor_id,
    investor.name as investor_name,
    investor.investment_advisor_code_entered as investor_entered_code
FROM users advisor
CROSS JOIN users investor
WHERE advisor.role = 'Investment Advisor'
  AND investor.role = 'Investor'
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND advisor.investment_advisor_code = investor.investment_advisor_code_entered;

-- Now actually create the relationships
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.id,
    investor.id,
    'advisor_investor'
FROM users advisor
CROSS JOIN users investor
WHERE advisor.role = 'Investment Advisor'
  AND investor.role = 'Investor'
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND advisor.investment_advisor_code = investor.investment_advisor_code_entered
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 5. Create relationships for startups (step by step)
SELECT 'Step 5: Creating Startup Relationships' as step;

-- First, let's see what would be created
SELECT 
    'Would create startup relationship' as action,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    startup.id as startup_id,
    startup.name as startup_name,
    startup.investment_advisor_code as startup_code
FROM users advisor
CROSS JOIN startups startup
WHERE advisor.role = 'Investment Advisor'
  AND startup.investment_advisor_code IS NOT NULL
  AND advisor.investment_advisor_code = startup.investment_advisor_code;

-- Now actually create the relationships
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id,
    startup.id,
    'advisor_startup'
FROM users advisor
CROSS JOIN startups startup
WHERE advisor.role = 'Investment Advisor'
  AND startup.investment_advisor_code IS NOT NULL
  AND advisor.investment_advisor_code = startup.investment_advisor_code
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 6. Final verification
SELECT 'Step 6: Final Verification' as step;
SELECT 
    'Final Count' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 7. Show the actual relationships created
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
    END as entity_email
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
ORDER BY r.created_at DESC;
