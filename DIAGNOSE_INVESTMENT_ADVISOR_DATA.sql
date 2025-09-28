-- Diagnose Investment Advisor Data
-- This script checks what data exists and why relationships aren't being created

-- 1. Check all Investment Advisors and their codes
SELECT 
    'Investment Advisors' as info,
    id,
    name,
    email,
    investment_advisor_code,
    role
FROM users 
WHERE role = 'Investment Advisor'
ORDER BY created_at;

-- 2. Check all users with investment_advisor_code_entered
SELECT 
    'Users with entered codes' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code_entered,
    created_at
FROM users 
WHERE investment_advisor_code_entered IS NOT NULL
ORDER BY created_at;

-- 3. Check all startups with investment_advisor_code
SELECT 
    'Startups with codes' as info,
    id,
    name,
    investment_advisor_code,
    created_at
FROM startups 
WHERE investment_advisor_code IS NOT NULL
ORDER BY created_at;

-- 4. Check for potential matches
SELECT 
    'Potential Investor Matches' as info,
    investor.id as investor_id,
    investor.name as investor_name,
    investor.investment_advisor_code_entered,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code
FROM users investor
LEFT JOIN users advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
WHERE investor.role = 'Investor' 
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND advisor.role = 'Investment Advisor';

-- 5. Check for potential startup matches
SELECT 
    'Potential Startup Matches' as info,
    startup.id as startup_id,
    startup.name as startup_name,
    startup.investment_advisor_code,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code
FROM startups startup
LEFT JOIN users advisor ON advisor.investment_advisor_code = startup.investment_advisor_code
WHERE startup.investment_advisor_code IS NOT NULL
  AND advisor.role = 'Investment Advisor';

-- 6. Check current relationships table
SELECT 
    'Current Relationships' as info,
    id,
    investment_advisor_id,
    investor_id,
    startup_id,
    relationship_type,
    created_at
FROM investment_advisor_relationships
ORDER BY created_at;

-- 7. Check if there are any users with matching codes but no relationships
SELECT 
    'Users with codes but no relationships' as info,
    COUNT(*) as count
FROM users u
WHERE u.role = 'Investor' 
  AND u.investment_advisor_code_entered IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM investment_advisor_relationships r
    WHERE r.investor_id = u.id
  );

-- 8. Check if there are any startups with codes but no relationships
SELECT 
    'Startups with codes but no relationships' as info,
    COUNT(*) as count
FROM startups s
WHERE s.investment_advisor_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM investment_advisor_relationships r
    WHERE r.startup_id = s.id
  );
