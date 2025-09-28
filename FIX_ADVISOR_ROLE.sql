-- Fix the user role to be Investment Advisor instead of Admin
-- This will ensure the Investment Advisor dashboard opens correctly

-- Check current user roles
SELECT id, email, name, role, investment_advisor_code 
FROM users 
WHERE email IN ('solapurkarsiddhi@gmail.com', 'sid737105@gmail.com')
ORDER BY email;

-- Update the user role to Investment Advisor (preserving advisor code)
UPDATE users 
SET role = 'Investment Advisor'
WHERE email = 'solapurkarsiddhi@gmail.com'
  AND role = 'Admin';

-- Verify the change
SELECT id, email, name, role, investment_advisor_code 
FROM users 
WHERE email = 'solapurkarsiddhi@gmail.com';
