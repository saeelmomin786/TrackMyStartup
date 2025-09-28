-- Check Startup Data
-- This script checks what data is actually stored in your startup record

-- 1. Check all startups and their investment advisor codes
SELECT 
    'All Startups' as info,
    id,
    name,
    investment_advisor_code,
    user_id,
    created_at
FROM startups 
ORDER BY created_at DESC;

-- 2. Check if there are any startups with investment advisor codes
SELECT 
    'Startups with Investment Advisor Codes' as info,
    COUNT(*) as count
FROM startups 
WHERE investment_advisor_code IS NOT NULL;

-- 3. Check the specific startup that should have the code
-- (Replace 'Your Startup Name' with your actual startup name)
SELECT 
    'Your Startup Details' as info,
    id,
    name,
    investment_advisor_code,
    user_id,
    created_at
FROM startups 
WHERE name ILIKE '%your startup name%'  -- Replace with your actual startup name
ORDER BY created_at DESC;

-- 4. Check if the code was saved to a different field
SELECT 
    'Checking for code in other fields' as info,
    id,
    name,
    investment_advisor_code,
    -- Check if code might be in other fields
    CASE WHEN investment_advisor_code IS NULL THEN 'No code in investment_advisor_code field' ELSE 'Code found' END as code_status
FROM startups 
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check the users table for any investment advisor codes
SELECT 
    'Users with Investment Advisor Codes' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    investment_advisor_code_entered
FROM users 
WHERE investment_advisor_code IS NOT NULL 
   OR investment_advisor_code_entered IS NOT NULL
ORDER BY created_at DESC;
