-- ============================================
-- DELETE STARTUP PROFILE - EXACT COMMANDS
-- ============================================
-- Based on your data:
-- auth_user_id: 50e3a3fc-41ee-4067-bd35-21d06eaaaa08
-- profile_id: f79c9e9f-e5e4-48ae-ac1f-574719b7b414
-- ============================================

-- Step 1: Check if there's a startup (should be null, but let's check)
SELECT 
  id,
  name,
  user_id
FROM startups
WHERE user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';

-- Step 2: Delete founders (if any exist)
DELETE FROM founders
WHERE startup_id IN (
  SELECT id FROM startups 
  WHERE user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
);

-- Step 3: Delete startup_shares (if any exist)
DELETE FROM startup_shares
WHERE startup_id IN (
  SELECT id FROM startups 
  WHERE user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
);

-- Step 4: Delete startup record (if exists)
DELETE FROM startups
WHERE user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';

-- Step 5: Check if you have other profiles (Mentor, etc.)
SELECT 
  id,
  role,
  name
FROM user_profiles
WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';

-- Step 6: Update user_profile_sessions to switch to another profile (if exists)
-- If you have a Mentor profile, switch to it
UPDATE user_profile_sessions
SET current_profile_id = (
  SELECT id FROM user_profiles 
  WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
  AND role != 'Startup'
  LIMIT 1
)
WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
AND current_profile_id = 'f79c9e9f-e5e4-48ae-ac1f-574719b7b414';

-- If no other profile exists, delete the session
DELETE FROM user_profile_sessions
WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
  AND id != 'f79c9e9f-e5e4-48ae-ac1f-574719b7b414'
);

-- Step 7: DELETE THE STARTUP PROFILE
DELETE FROM user_profiles
WHERE id = 'f79c9e9f-e5e4-48ae-ac1f-574719b7b414';

-- Step 8: VERIFY DELETION
SELECT 
  '=== VERIFICATION ===' as status,
  (SELECT COUNT(*) FROM user_profiles 
   WHERE id = 'f79c9e9f-e5e4-48ae-ac1f-574719b7b414') as startup_profile_deleted,
  (SELECT COUNT(*) FROM startups 
   WHERE user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08') as startups_remaining;

-- Show remaining profiles
SELECT 
  id,
  email,
  role,
  name,
  startup_name
FROM user_profiles
WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';

