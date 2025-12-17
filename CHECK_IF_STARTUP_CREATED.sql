-- =====================================================
-- COMPREHENSIVE CHECK: IS STARTUP CREATED IN SUPABASE?
-- =====================================================
-- This script checks everything to see if your startup was created
-- Replace '7makodas@gmail.com' with your email
-- =====================================================

-- =====================================================
-- STEP 1: CHECK USER_PROFILES TABLE
-- =====================================================

SELECT '=== STEP 1: CHECKING USER_PROFILES ===' as info;

SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name as profile_name,
    up.role,
    up.startup_name,
    up.is_profile_complete,
    up.created_at as profile_created_at,
    up.updated_at as profile_updated_at
FROM user_profiles up
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY up.created_at DESC;

-- =====================================================
-- STEP 2: CHECK AUTH.USERS TABLE
-- =====================================================

SELECT '=== STEP 2: CHECKING AUTH.USERS ===' as info;

SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at
FROM auth.users au
WHERE au.email = '7makodas@gmail.com';  -- Replace with your email

-- =====================================================
-- STEP 3: CHECK STARTUPS TABLE
-- =====================================================

SELECT '=== STEP 3: CHECKING STARTUPS TABLE ===' as info;

-- Check by user_id (auth_user_id)
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.sector,
    s.compliance_status,
    s.created_at as startup_created_at,
    s.updated_at as startup_updated_at,
    'Found by user_id' as found_by
FROM startups s
WHERE s.user_id IN (
    SELECT id FROM auth.users WHERE email = '7makodas@gmail.com'
)
ORDER BY s.created_at DESC;

-- Check by name
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.sector,
    s.compliance_status,
    s.created_at as startup_created_at,
    'Found by name' as found_by
FROM startups s
WHERE s.name = 'NEW TESTING'
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 4: COMPLETE RELATIONSHIP CHECK
-- =====================================================

SELECT '=== STEP 4: COMPLETE RELATIONSHIP CHECK ===' as info;

SELECT 
    up.id as profile_id,
    up.email,
    up.name as profile_name,
    up.startup_name as profile_startup_name,
    up.is_profile_complete,
    au.id as auth_user_id,
    s.id as startup_id,
    s.name as startup_name_in_table,
    CASE 
        WHEN s.id IS NULL THEN '❌ NO STARTUP FOUND'
        WHEN s.user_id != au.id THEN '⚠️ STARTUP USER_ID MISMATCH'
        WHEN s.name != up.startup_name THEN '⚠️ STARTUP NAME MISMATCH'
        ELSE '✅ STARTUP EXISTS AND MATCHES'
    END as status
FROM user_profiles up
INNER JOIN auth.users au ON up.auth_user_id = au.id
LEFT JOIN startups s ON s.user_id = au.id
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY up.created_at DESC;

-- =====================================================
-- STEP 5: CHECK STARTUP_SHARES
-- =====================================================

SELECT '=== STEP 5: CHECKING STARTUP_SHARES ===' as info;

SELECT 
    ss.startup_id,
    s.name as startup_name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ss.updated_at,
    CASE 
        WHEN ss.startup_id IS NULL THEN '❌ NO STARTUP_SHARES'
        ELSE '✅ STARTUP_SHARES EXISTS'
    END as status
FROM startups s
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
WHERE s.user_id IN (
    SELECT id FROM auth.users WHERE email = '7makodas@gmail.com'
)
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 6: CHECK ALL STARTUPS FOR THIS AUTH_USER_ID
-- =====================================================

SELECT '=== STEP 6: ALL STARTUPS FOR YOUR AUTH_USER_ID ===' as info;

-- First, get your auth_user_id
SELECT 
    au.id as auth_user_id,
    au.email,
    COUNT(s.id) as total_startups,
    STRING_AGG(s.name, ', ') as startup_names
FROM auth.users au
LEFT JOIN startups s ON s.user_id = au.id
WHERE au.email = '7makodas@gmail.com'  -- Replace with your email
GROUP BY au.id, au.email;

-- =====================================================
-- STEP 7: CHECK FOR RECENT STARTUP CREATIONS
-- =====================================================

SELECT '=== STEP 7: RECENT STARTUP CREATIONS (LAST 24 HOURS) ===' as info;

SELECT 
    s.id,
    s.name,
    s.user_id,
    s.created_at,
    au.email,
    up.startup_name as profile_startup_name
FROM startups s
LEFT JOIN auth.users au ON s.user_id = au.id
LEFT JOIN user_profiles up ON up.auth_user_id = au.id AND up.role = 'Startup'
WHERE s.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 8: SUMMARY
-- =====================================================

SELECT '=== SUMMARY ===' as info;

SELECT 
    (SELECT COUNT(*) FROM user_profiles WHERE email = '7makodas@gmail.com' AND role = 'Startup') as startup_profiles_count,
    (SELECT COUNT(*) FROM startups s 
     INNER JOIN auth.users au ON s.user_id = au.id 
     WHERE au.email = '7makodas@gmail.com') as startups_count,
    (SELECT COUNT(*) FROM startups WHERE name = 'NEW TESTING') as startups_named_new_testing,
    (SELECT COUNT(*) FROM user_profiles 
     WHERE email = '7makodas@gmail.com' 
     AND role = 'Startup' 
     AND is_profile_complete = true) as completed_profiles_count,
    (SELECT COUNT(*) FROM startups s
     INNER JOIN auth.users au ON s.user_id = au.id
     INNER JOIN startup_shares ss ON ss.startup_id = s.id
     WHERE au.email = '7makodas@gmail.com') as startups_with_shares_count;

-- =====================================================
-- STEP 9: IF STARTUP IS MISSING, SHOW WHAT TO DO
-- =====================================================

SELECT '=== DIAGNOSIS ===' as info;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM user_profiles WHERE email = '7makodas@gmail.com' AND role = 'Startup') = 0 
            THEN '❌ NO STARTUP PROFILE FOUND - Profile was not created'
        WHEN (SELECT COUNT(*) FROM user_profiles WHERE email = '7makodas@gmail.com' AND role = 'Startup' AND is_profile_complete = false) > 0
            THEN '⚠️ PROFILE EXISTS BUT NOT COMPLETE - Form 2 may not have been submitted properly'
        WHEN (SELECT COUNT(*) FROM startups s INNER JOIN auth.users au ON s.user_id = au.id WHERE au.email = '7makodas@gmail.com') = 0
            THEN '❌ STARTUP NOT CREATED - Run MANUALLY_CREATE_MISSING_STARTUP.sql to create it'
        WHEN (SELECT COUNT(*) FROM startups s INNER JOIN auth.users au ON s.user_id = au.id WHERE au.email = '7makodas@gmail.com') > 0
            THEN '✅ STARTUP EXISTS - Check RLS policies or query logic'
        ELSE '❓ UNKNOWN ISSUE - Check all steps above'
    END as diagnosis;


