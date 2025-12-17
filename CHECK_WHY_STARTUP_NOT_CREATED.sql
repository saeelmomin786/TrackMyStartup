-- =====================================================
-- CHECK WHY STARTUP IS NOT BEING CREATED
-- =====================================================
-- This script helps diagnose why startups aren't being created
-- =====================================================

-- =====================================================
-- STEP 1: CHECK RECENT STARTUP PROFILES
-- =====================================================

SELECT '=== RECENT STARTUP PROFILES ===' as info;

SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name,
    up.startup_name,
    up.is_profile_complete,
    up.created_at,
    up.updated_at
FROM user_profiles up
WHERE up.role = 'Startup'
    AND up.email = '7makodas@gmail.com'  -- Replace with your email
ORDER BY up.created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 2: CHECK IF STARTUP EXISTS FOR THIS USER
-- =====================================================

SELECT '=== CHECKING FOR STARTUP RECORDS ===' as info;

SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.compliance_status,
    s.created_at,
    up.email,
    up.name as profile_name,
    up.startup_name as profile_startup_name
FROM startups s
RIGHT JOIN user_profiles up ON s.user_id = up.auth_user_id
WHERE up.role = 'Startup'
    AND up.email = '7makodas@gmail.com'  -- Replace with your email
ORDER BY s.created_at DESC NULLS LAST;

-- =====================================================
-- STEP 3: CHECK FOR STARTUP WITH NAME "NEW TESTING"
-- =====================================================

SELECT '=== CHECKING FOR STARTUP NAMED "NEW TESTING" ===' as info;

SELECT 
    s.id,
    s.name,
    s.user_id,
    s.created_at,
    up.email,
    up.name as profile_name
FROM startups s
LEFT JOIN user_profiles up ON s.user_id = up.auth_user_id
WHERE s.name = 'NEW TESTING'
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 4: CHECK ALL STARTUPS FOR THIS AUTH_USER_ID
-- =====================================================

-- Replace '50e3a3fc-41ee-4067-bd35-21d06eaaaa08' with your auth_user_id
SELECT '=== ALL STARTUPS FOR AUTH_USER_ID ===' as info;

SELECT 
    s.id,
    s.name,
    s.user_id,
    s.created_at,
    up.email,
    up.role,
    up.startup_name
FROM startups s
LEFT JOIN user_profiles up ON s.user_id = up.auth_user_id
WHERE s.user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'  -- Replace with your auth_user_id
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 5: CHECK RLS POLICIES ON STARTUPS TABLE
-- =====================================================

SELECT '=== RLS POLICIES ON STARTUPS ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

-- =====================================================
-- STEP 6: CHECK IF USER CAN INSERT INTO STARTUPS
-- =====================================================

SELECT '=== CHECKING INSERT PERMISSIONS ===' as info;

SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'startups'
    AND privilege_type = 'INSERT'
ORDER BY grantee;

-- =====================================================
-- STEP 7: SUMMARY
-- =====================================================

SELECT '=== SUMMARY ===' as info;

SELECT 
    (SELECT COUNT(*) FROM user_profiles WHERE role = 'Startup' AND email = '7makodas@gmail.com') as startup_profiles_count,
    (SELECT COUNT(*) FROM startups s 
     JOIN user_profiles up ON s.user_id = up.auth_user_id 
     WHERE up.email = '7makodas@gmail.com' AND up.role = 'Startup') as startups_count,
    (SELECT COUNT(*) FROM startups WHERE name = 'NEW TESTING') as startups_named_new_testing,
    (SELECT COUNT(*) FROM startups WHERE user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08') as startups_for_auth_user_id;


