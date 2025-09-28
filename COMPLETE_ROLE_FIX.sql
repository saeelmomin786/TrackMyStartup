-- COMPLETE ROLE FIX FOR ADMIN ACCESS
-- This script will fix the role issue and ensure proper admin access

-- 1. First, let's see the current state of your user
SELECT 
    'Current User Status' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE email = 'sid737105@gmail.com';

-- 2. Update your role to Admin (this is the key fix)
UPDATE users 
SET role = 'Admin' 
WHERE email = 'sid737105@gmail.com';

-- 3. Verify the role change
SELECT 
    'Updated User Status' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE email = 'sid737105@gmail.com';

-- 4. Check if there are any other users with Admin role
SELECT 
    'All Admin Users' as info,
    id,
    name,
    email,
    role,
    created_at
FROM users 
WHERE role = 'Admin'
ORDER BY created_at DESC;

-- 5. Check if there are any Investment Advisor users
SELECT 
    'All Investment Advisor Users' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC;
