-- Convert current Investment Advisor account to Admin
-- This will change your current account (solapurkarsiddhi@gmail.com) to Admin role

-- 1. Show current status
SELECT 
    'Before Update' as status,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE email = 'solapurkarsiddhi@gmail.com';

-- 2. Update the role to Admin
UPDATE users 
SET role = 'Admin' 
WHERE email = 'solapurkarsiddhi@gmail.com';

-- 3. Show updated status
SELECT 
    'After Update' as status,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE email = 'solapurkarsiddhi@gmail.com';

-- 4. Verify the change
SELECT 
    'Verification' as info,
    'Account successfully converted to Admin' as message;
