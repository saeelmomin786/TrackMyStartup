-- =====================================================
-- FIND STARTUP PROFILES MISSING STARTUP RECORDS
-- =====================================================
-- This script identifies startup profiles that don't have
-- corresponding startup records in the startups table.
-- =====================================================

-- =====================================================
-- STEP 1: FIND PROFILES MISSING STARTUP RECORDS
-- =====================================================

SELECT '=== STARTUP PROFILES MISSING STARTUP RECORDS ===' as info;

SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name,
    up.startup_name,
    up.is_profile_complete,
    up.created_at as profile_created_at,
    s.id as startup_id,
    CASE 
        WHEN s.id IS NULL THEN '❌ Missing Startup Record'
        ELSE '✅ Has Startup Record'
    END as status
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id AND s.name = up.startup_name
WHERE up.role = 'Startup'
    AND s.id IS NULL  -- Only show profiles without startup records
ORDER BY up.created_at DESC;

-- =====================================================
-- STEP 2: COUNT BY STATUS
-- =====================================================

SELECT '=== SUMMARY ===' as info;

SELECT 
    COUNT(*) FILTER (WHERE s.id IS NULL) as profiles_missing_startups,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL) as profiles_with_startups,
    COUNT(*) as total_startup_profiles
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id AND s.name = up.startup_name
WHERE up.role = 'Startup';

-- =====================================================
-- STEP 3: DETAILED VIEW (ALL PROFILES)
-- =====================================================

SELECT '=== ALL STARTUP PROFILES WITH STATUS ===' as info;

SELECT 
    up.id as profile_id,
    up.email,
    up.name,
    up.startup_name,
    up.is_profile_complete,
    s.id as startup_id,
    ss.startup_id as has_startup_shares,
    CASE 
        WHEN s.id IS NULL THEN '❌ No Startup'
        WHEN ss.startup_id IS NULL THEN '⚠️ No Startup Shares'
        ELSE '✅ Complete'
    END as status
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id AND s.name = up.startup_name
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
WHERE up.role = 'Startup'
ORDER BY up.created_at DESC
LIMIT 20;


