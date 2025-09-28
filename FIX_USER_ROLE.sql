-- Fix user role from Investment Advisor to Admin
-- This will allow the user to access the admin dashboard

UPDATE users 
SET role = 'Admin' 
WHERE email = 'sid737105@gmail.com';

-- Verify the change
SELECT id, email, name, role, created_at 
FROM users 
WHERE email = 'sid737105@gmail.com';
