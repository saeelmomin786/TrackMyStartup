-- Check both user accounts to understand the situation

-- 1. Check the Investment Advisor account
SELECT 
    'Investment Advisor Account' as account_type,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE email = 'solapurkarsiddhi@gmail.com';

-- 2. Check the Admin account
SELECT 
    'Admin Account' as account_type,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE email = 'sid737105@gmail.com';

-- 3. Check all users with name 'Siddhi'
SELECT 
    'All Siddhi Accounts' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE name = 'Siddhi'
ORDER BY created_at DESC;

-- 4. Check all Admin users
SELECT 
    'All Admin Users' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE role = 'Admin'
ORDER BY created_at DESC;
