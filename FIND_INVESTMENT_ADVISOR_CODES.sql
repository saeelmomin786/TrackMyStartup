-- =====================================================
-- FIND INVESTMENT ADVISOR CODES
-- =====================================================
-- Use this query to find investment advisor codes for domain mapping
-- Replace 'Sarvesh' with the advisor's name, email, or firm name

-- Option 1: Find by advisor name
SELECT 
    id,
    name,
    email,
    firm_name,
    investment_advisor_code,
    registration_date
FROM users
WHERE role = 'Investment Advisor'
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%')
ORDER BY registration_date DESC;

-- Option 2: Find by firm name
SELECT 
    id,
    name,
    email,
    firm_name,
    investment_advisor_code,
    registration_date
FROM users
WHERE role = 'Investment Advisor'
  AND firm_name ILIKE '%firm_name_here%'
ORDER BY registration_date DESC;

-- Option 3: Find by email
SELECT 
    id,
    name,
    email,
    firm_name,
    investment_advisor_code,
    registration_date
FROM users
WHERE role = 'Investment Advisor'
  AND email = 'advisor@example.com';

-- Option 4: List ALL investment advisors with their codes
SELECT 
    id,
    name,
    email,
    firm_name,
    investment_advisor_code,
    registration_date,
    CASE 
        WHEN investment_advisor_code IS NULL THEN '⚠️ NO CODE ASSIGNED'
        ELSE '✅ Code: ' || investment_advisor_code
    END as status
FROM users
WHERE role = 'Investment Advisor'
ORDER BY registration_date DESC;

-- Option 5: Find advisor code for a specific user ID
SELECT 
    id,
    name,
    email,
    firm_name,
    investment_advisor_code
FROM users
WHERE id = 'user-uuid-here'
  AND role = 'Investment Advisor';

-- =====================================================
-- EXAMPLE: Find Sarvesh's advisor code
-- =====================================================
-- Uncomment and modify the query below:

/*
SELECT 
    name,
    email,
    firm_name,
    investment_advisor_code as 'ADVISOR_CODE_FOR_DOMAIN_MAPPING',
    registration_date
FROM users
WHERE role = 'Investment Advisor'
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%')
ORDER BY registration_date DESC;
*/

