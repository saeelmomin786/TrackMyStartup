-- =====================================================
-- CREATE MISSING STARTUP RECORDS FOR PROFILES
-- =====================================================
-- WARNING: This script will create startup records for profiles
-- that don't have them. Only run this AFTER fixing RLS policies!
-- 
-- Prerequisites:
-- 1. Run FIX_STARTUP_SHARES_INSERT_RLS.sql first
-- 2. Review the results from FIND_MISSING_STARTUPS.sql
-- =====================================================

-- =====================================================
-- STEP 1: PREVIEW WHAT WILL BE CREATED
-- =====================================================

SELECT '=== PREVIEW: STARTUPS TO BE CREATED ===' as info;

SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name,
    up.startup_name,
    up.is_profile_complete,
    'Will create startup: ' || COALESCE(up.startup_name, 'Unnamed Startup') as action
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id AND s.name = up.startup_name
WHERE up.role = 'Startup'
    AND up.is_profile_complete = true  -- Only create for completed profiles
    AND s.id IS NULL  -- Only for profiles without startup records
ORDER BY up.created_at DESC;

-- =====================================================
-- STEP 2: CREATE MISSING STARTUP RECORDS
-- =====================================================

-- Insert startups for profiles that don't have them
INSERT INTO startups (
    name,
    user_id,
    sector,
    current_valuation,
    total_funding,
    total_revenue,
    compliance_status,
    registration_date,
    investment_type,
    investment_value,
    equity_allocation
)
SELECT 
    COALESCE(up.startup_name, 'Unnamed Startup') as name,
    up.auth_user_id as user_id,
    'Unknown' as sector,
    0 as current_valuation,
    0 as total_funding,
    0 as total_revenue,
    'Pending'::compliance_status as compliance_status,
    COALESCE(up.registration_date, CURRENT_DATE) as registration_date,
    'Seed' as investment_type,
    0 as investment_value,
    0 as equity_allocation
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id AND s.name = up.startup_name
WHERE up.role = 'Startup'
    AND up.is_profile_complete = true  -- Only create for completed profiles
    AND s.id IS NULL  -- Only for profiles without startup records
ON CONFLICT DO NOTHING;  -- Skip if startup already exists

-- =====================================================
-- STEP 3: VERIFY CREATED STARTUPS
-- =====================================================

SELECT '=== VERIFICATION: NEWLY CREATED STARTUPS ===' as info;

SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.compliance_status,
    s.created_at,
    up.email,
    up.name as profile_name,
    ss.startup_id as has_startup_shares
FROM startups s
INNER JOIN user_profiles up ON s.user_id = up.auth_user_id AND s.name = up.startup_name
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
WHERE up.role = 'Startup'
    AND s.created_at >= NOW() - INTERVAL '1 minute'  -- Recently created
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 4: FINAL SUMMARY
-- =====================================================

SELECT '=== FINAL SUMMARY ===' as info;

SELECT 
    (SELECT COUNT(*) FROM user_profiles WHERE role = 'Startup') as total_startup_profiles,
    (SELECT COUNT(*) FROM startups) as total_startups,
    (SELECT COUNT(*) FROM startup_shares) as total_startup_shares,
    (SELECT COUNT(*) 
     FROM user_profiles up
     LEFT JOIN startups s ON s.user_id = up.auth_user_id AND s.name = up.startup_name
     WHERE up.role = 'Startup' AND s.id IS NULL) as still_missing_startups;


