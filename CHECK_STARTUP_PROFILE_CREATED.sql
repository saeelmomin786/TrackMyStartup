-- =====================================================
-- CHECK IF STARTUP PROFILE WAS CREATED
-- =====================================================
-- This script helps verify if a startup profile was created
-- and checks related data in all relevant tables.
-- =====================================================

-- =====================================================
-- STEP 1: CHECK USER_PROFILES FOR STARTUP ROLE
-- =====================================================

SELECT '=== STARTUP PROFILES IN USER_PROFILES ===' as info;

SELECT 
    id as profile_id,
    auth_user_id,
    email,
    name,
    role,
    startup_name,
    is_profile_complete,
    created_at,
    updated_at
FROM user_profiles
WHERE role = 'Startup'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 2: CHECK STARTUPS TABLE
-- =====================================================

SELECT '=== STARTUPS TABLE ===' as info;

SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.sector,
    s.compliance_status,
    s.created_at,
    up.email,
    up.name as profile_name,
    up.id as profile_id
FROM startups s
LEFT JOIN user_profiles up ON s.user_id = up.auth_user_id AND up.role = 'Startup'
ORDER BY s.created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 3: CHECK STARTUP_SHARES (should be auto-created by trigger)
-- =====================================================

SELECT '=== STARTUP_SHARES TABLE ===' as info;

SELECT 
    ss.startup_id,
    s.name as startup_name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ss.updated_at
FROM startup_shares ss
LEFT JOIN startups s ON ss.startup_id = s.id
ORDER BY ss.updated_at DESC
LIMIT 10;

-- =====================================================
-- STEP 4: CHECK FOR MISSING STARTUP_SHARES
-- =====================================================

SELECT '=== STARTUPS WITHOUT STARTUP_SHARES ===' as info;

SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.created_at
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE ss.startup_id IS NULL
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 5: CHECK SPECIFIC USER (replace email)
-- =====================================================

-- Replace '7makodas@gmail.com' with the email you want to check
SELECT '=== CHECKING SPECIFIC USER: 7makodas@gmail.com ===' as info;

SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name,
    up.role,
    up.startup_name,
    up.is_profile_complete,
    s.id as startup_id,
    s.name as startup_name_in_startups_table,
    ss.startup_id as has_startup_shares
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
WHERE up.email = '7makodas@gmail.com'
    AND up.role = 'Startup'
ORDER BY up.created_at DESC;

-- =====================================================
-- STEP 6: SUMMARY
-- =====================================================

SELECT '=== SUMMARY ===' as info;

SELECT 
    (SELECT COUNT(*) FROM user_profiles WHERE role = 'Startup') as total_startup_profiles,
    (SELECT COUNT(*) FROM startups) as total_startups,
    (SELECT COUNT(*) FROM startup_shares) as total_startup_shares,
    (SELECT COUNT(*) FROM startups s LEFT JOIN startup_shares ss ON s.id = ss.startup_id WHERE ss.startup_id IS NULL) as startups_missing_shares;

