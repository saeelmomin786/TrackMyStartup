-- Create relationships based on the actual data we found
-- This will create advisor-startup relationships for the existing advisor codes

-- 1. First, let's see the current advisor codes and their owners
SELECT 
    'Advisor Code Mapping' as info,
    u.id as advisor_id,
    u.name as advisor_name,
    u.email as advisor_email,
    u.investment_advisor_code,
    u.role
FROM users u
WHERE u.investment_advisor_code IN ('IA-162090', 'IA-629552', 'IA-U2QF7R')
ORDER BY u.investment_advisor_code;

-- 2. Create relationships for IA-162090 (Synora, trackmystartupcom)
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code = 'IA-162090'
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 3. Create relationships for IA-629552 (Mulsetu Agrotech, Your Startup Name)
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code = 'IA-629552'
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 4. Create relationships for IA-U2QF7R (your admin account)
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code = 'IA-U2QF7R'
  AND advisor.role = 'Admin'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 5. Show what relationships were created
SELECT 
    'Created Relationships' as info,
    r.id,
    r.investment_advisor_id,
    r.startup_id,
    r.relationship_type,
    advisor.name as advisor_name,
    s.name as startup_name,
    r.created_at
FROM investment_advisor_relationships r
JOIN users advisor ON advisor.id = r.investment_advisor_id
JOIN startups s ON s.id = r.startup_id
ORDER BY r.created_at DESC;

-- 6. Show final counts
SELECT 
    'Final Results' as info,
    'Total Relationships' as type,
    COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
    'Final Results' as info,
    'Advisor-Startup Relationships' as type,
    COUNT(*) as count
FROM investment_advisor_relationships
WHERE relationship_type = 'advisor_startup'

UNION ALL

SELECT 
    'Final Results' as info,
    'Existing Investment Offers' as type,
    COUNT(*) as count
FROM investment_offers;
