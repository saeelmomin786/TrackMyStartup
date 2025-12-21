-- =====================================================
-- FIX: Update mentor_requests Foreign Key Constraints
-- =====================================================
-- Problem: Foreign key constraints reference auth.users(id)
-- But we're using user_profiles table now
-- 
-- Solution: Keep foreign key to auth.users (correct), but ensure
-- the IDs being passed are valid auth_user_id values
-- =====================================================

-- Step 1: Check current foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'mentor_requests';

-- Step 2: Verify the constraint is correct
-- The constraint SHOULD reference auth.users(id) because:
-- - user_profiles.auth_user_id references auth.users(id)
-- - mentor_requests.requester_id should reference auth.users(id) (the auth ID)
-- - mentor_requests.mentor_id should reference auth.users(id) (the auth ID)
--
-- This is CORRECT - we want to reference auth.users, not user_profiles
-- Because one auth user can have multiple profiles, but the request is tied to the auth user

-- Step 3: Check for orphaned records (IDs that don't exist in auth.users)
-- These would cause foreign key violations
SELECT 
    mr.id,
    mr.requester_id,
    mr.mentor_id,
    mr.status,
    CASE 
        WHEN up_requester.auth_user_id IS NULL THEN 'REQUester NOT IN user_profiles'
        ELSE 'REQUester EXISTS'
    END as requester_status,
    CASE 
        WHEN up_mentor.auth_user_id IS NULL THEN 'MENTOR NOT IN user_profiles'
        ELSE 'MENTOR EXISTS'
    END as mentor_status
FROM mentor_requests mr
LEFT JOIN user_profiles up_requester ON mr.requester_id = up_requester.auth_user_id
LEFT JOIN user_profiles up_mentor ON mr.mentor_id = up_mentor.auth_user_id
WHERE up_requester.auth_user_id IS NULL OR up_mentor.auth_user_id IS NULL;

-- Step 4: Check if IDs are valid UUIDs
SELECT 
    id,
    requester_id,
    mentor_id,
    CASE 
        WHEN requester_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'VALID UUID'
        ELSE 'INVALID UUID'
    END as requester_uuid_status,
    CASE 
        WHEN mentor_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'VALID UUID'
        ELSE 'INVALID UUID'
    END as mentor_uuid_status
FROM mentor_requests
WHERE requester_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR mentor_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 5: Verify IDs match user_profiles.auth_user_id
-- This helps identify if wrong IDs are being used
SELECT 
    'IDs in mentor_requests that match user_profiles' as check_type,
    COUNT(*) as matching_count
FROM mentor_requests mr
INNER JOIN user_profiles up ON mr.requester_id = up.auth_user_id;

SELECT 
    'IDs in mentor_requests that DO NOT match user_profiles' as check_type,
    COUNT(*) as non_matching_count
FROM mentor_requests mr
LEFT JOIN user_profiles up ON mr.requester_id = up.auth_user_id
WHERE up.auth_user_id IS NULL;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. The foreign key constraint SHOULD reference auth.users(id)
--    This is correct because:
--    - user_profiles.auth_user_id references auth.users(id)
--    - mentor_requests should store the auth user ID (not profile ID)
--
-- 2. When passing IDs to mentor_requests:
--    - requester_id should be auth.users.id (or user_profiles.auth_user_id)
--    - mentor_id should be auth.users.id (or user_profiles.auth_user_id)
--
-- 3. If you're passing user_profiles.id instead of auth_user_id:
--    - That's the problem! You need to pass auth_user_id
--    - Check your code where you get the user ID


