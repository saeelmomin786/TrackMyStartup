-- Test script to verify startup user data fetching
-- This will help us understand if the startup user data is available

-- Check if there's a user with startup_name = 'MULSETU AGROTECH PRIVATE LIMITED'
SELECT 
    'Users with MULSETU startup name:' as info,
    id,
    email,
    name,
    startup_name,
    role
FROM users 
WHERE startup_name = 'MULSETU AGROTECH PRIVATE LIMITED'
OR startup_name ILIKE '%MULSETU%';

-- Check all startup users
SELECT 
    'All startup users:' as info,
    id,
    email,
    name,
    startup_name,
    role
FROM users 
WHERE role = 'Startup'
ORDER BY created_at DESC;

-- Check the specific startup
SELECT 
    'MULSETU startup details:' as info,
    id,
    name,
    user_id,
    sector
FROM startups 
WHERE name ILIKE '%MULSETU%';

-- Check if there's a relationship between startup and user
SELECT 
    'Startup-User relationship:' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    u.id as user_id_from_users,
    u.email,
    u.name,
    u.startup_name
FROM startups s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.name ILIKE '%MULSETU%';








