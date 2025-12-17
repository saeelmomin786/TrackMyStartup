-- ============================================
-- DELETE STARTUP PROFILE FOR TESTING
-- ============================================
-- This script will delete the startup profile and all related data
-- so you can test creating a new profile from scratch
--
-- ⚠️ WARNING: This will DELETE data! Make sure you want to do this.
-- ============================================

-- Step 1: Find your auth_user_id and profile_id
-- Run this first to see what will be deleted
SELECT 
  '=== YOUR DATA ===' as info,
  au.id as auth_user_id,
  au.email,
  up.id as profile_id,
  up.role,
  up.startup_name,
  s.id as startup_id,
  s.name as startup_name
FROM auth.users au
LEFT JOIN user_profiles up ON up.auth_user_id = au.id AND up.role = 'Startup'
LEFT JOIN startups s ON s.user_id = au.id
WHERE au.email = '7makodas@gmail.com';

-- ============================================
-- Step 2: DELETE IN ORDER (to avoid foreign key errors)
-- ============================================

-- 2a. Delete founders (if any) - linked to startup
DELETE FROM founders
WHERE startup_id IN (
  SELECT id FROM startups 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
);

-- 2b. Delete startup_shares (if any) - linked to startup
DELETE FROM startup_shares
WHERE startup_id IN (
  SELECT id FROM startups 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
);

-- 2c. Delete startup record
DELETE FROM startups
WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com');

-- 2d. Delete from user_profile_sessions (if this was the active profile)
UPDATE user_profile_sessions
SET current_profile_id = (
  SELECT id FROM user_profiles 
  WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
  AND role != 'Startup'
  LIMIT 1
)
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
AND current_profile_id = (
  SELECT id FROM user_profiles 
  WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
  AND role = 'Startup'
);

-- If no other profile exists, delete the session
DELETE FROM user_profile_sessions
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
AND NOT EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE auth_user_id = user_profile_sessions.auth_user_id
);

-- 2e. Delete the Startup profile from user_profiles
DELETE FROM user_profiles
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
AND role = 'Startup';

-- ============================================
-- Step 3: VERIFY DELETION
-- ============================================

-- Check if everything is deleted
SELECT 
  '=== VERIFICATION ===' as info,
  (SELECT COUNT(*) FROM user_profiles 
   WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
   AND role = 'Startup') as startup_profiles_remaining,
  (SELECT COUNT(*) FROM startups 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')) as startups_remaining,
  (SELECT COUNT(*) FROM founders 
   WHERE startup_id IN (
     SELECT id FROM startups 
     WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
   )) as founders_remaining;

-- Show remaining profiles (should not include Startup)
SELECT 
  id,
  email,
  role,
  startup_name,
  is_profile_complete
FROM user_profiles
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com');

-- ============================================
-- ALTERNATIVE: Delete ALL profiles for this user
-- (Use only if you want to delete everything)
-- ============================================

/*
-- Uncomment this section if you want to delete ALL profiles (not just Startup)

-- Delete all founders
DELETE FROM founders
WHERE startup_id IN (
  SELECT id FROM startups 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
);

-- Delete all startup_shares
DELETE FROM startup_shares
WHERE startup_id IN (
  SELECT id FROM startups 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com')
);

-- Delete all startups
DELETE FROM startups
WHERE user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com');

-- Delete user_profile_sessions
DELETE FROM user_profile_sessions
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com');

-- Delete ALL profiles
DELETE FROM user_profiles
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '7makodas@gmail.com');
*/

