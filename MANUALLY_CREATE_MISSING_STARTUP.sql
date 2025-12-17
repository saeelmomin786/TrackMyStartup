-- =====================================================
-- MANUALLY CREATE MISSING STARTUP FOR PROFILE
-- =====================================================
-- This script creates a startup record for a profile that
-- doesn't have one. Use this if automatic creation failed.
-- =====================================================

-- =====================================================
-- STEP 1: FIND THE PROFILE
-- =====================================================

-- Replace '7makodas@gmail.com' with your email
SELECT '=== FINDING PROFILE ===' as info;

SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name,
    up.startup_name,
    up.is_profile_complete,
    s.id as existing_startup_id
FROM user_profiles up
LEFT JOIN startups s ON s.user_id = up.auth_user_id
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY up.created_at DESC
LIMIT 1;

-- =====================================================
-- STEP 2: CREATE STARTUP MANUALLY
-- =====================================================

-- Replace the values below with your actual data
-- Get auth_user_id from Step 1 above
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
    up.startup_name as name,
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
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
    AND up.is_profile_complete = true
    AND NOT EXISTS (
        SELECT 1 FROM startups s 
        WHERE s.user_id = up.auth_user_id
    )
RETURNING *;

-- =====================================================
-- STEP 3: VERIFY STARTUP WAS CREATED
-- =====================================================

SELECT '=== VERIFICATION ===' as info;

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
INNER JOIN user_profiles up ON s.user_id = up.auth_user_id
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY s.created_at DESC;

-- =====================================================
-- STEP 4: CHECK IF STARTUP_SHARES WAS AUTO-CREATED
-- =====================================================

SELECT '=== CHECKING STARTUP_SHARES ===' as info;

SELECT 
    ss.startup_id,
    s.name as startup_name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ss.updated_at
FROM startup_shares ss
INNER JOIN startups s ON ss.startup_id = s.id
INNER JOIN user_profiles up ON s.user_id = up.auth_user_id
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY ss.updated_at DESC;

-- =====================================================
-- STEP 5: IF STARTUP_SHARES IS MISSING, CREATE IT
-- =====================================================

-- Only run this if startup_shares doesn't exist (prevents duplicate key error)
INSERT INTO startup_shares (
    startup_id,
    total_shares,
    esop_reserved_shares,
    price_per_share,
    updated_at
)
SELECT 
    s.id as startup_id,
    0 as total_shares,
    10000 as esop_reserved_shares,
    0 as price_per_share,
    NOW() as updated_at
FROM startups s
INNER JOIN user_profiles up ON s.user_id = up.auth_user_id
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
    AND NOT EXISTS (
        SELECT 1 FROM startup_shares ss 
        WHERE ss.startup_id = s.id
    )
ON CONFLICT (startup_id) DO NOTHING  -- Prevent duplicate key error
RETURNING *;

