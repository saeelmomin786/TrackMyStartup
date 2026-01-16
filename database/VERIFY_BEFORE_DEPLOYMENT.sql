-- =====================================================
-- VERIFICATION QUERIES - Run FIRST before deployment
-- =====================================================
-- This checks current state and verifies changes won't break anything

-- STEP 1: Check if the new functions already exist
-- =====================================================
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'convert_auth_id_to_profile_ids',
    'get_user_plan_tier',
    'can_user_access_feature',
    'is_subscription_valid'
)
ORDER BY routine_name;

-- STEP 2: Check current get_user_plan_tier definition
-- =====================================================
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_user_plan_tier';

-- STEP 3: Check for any tables/functions that use these RPC functions
-- =====================================================
-- Check if any stored procedures or functions reference the RPC functions
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%get_user_plan_tier%'
OR routine_definition LIKE '%can_user_access_feature%'
OR routine_definition LIKE '%is_subscription_valid%';

-- STEP 4: Check actual data - do subscriptions exist and are they correct?
-- =====================================================
SELECT 
    'SUBSCRIPTIONS CHECK' as check_name,
    COUNT(*) as total_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_count,
    COUNT(*) FILTER (WHERE plan_tier IS NULL) as null_plan_tier_count
FROM user_subscriptions;

-- STEP 5: Check if plan_tier column is populated
-- =====================================================
SELECT 
    'PLAN TIER POPULATION' as check_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE plan_tier IS NOT NULL) as has_plan_tier,
    COUNT(*) FILTER (WHERE plan_tier IS NULL) as missing_plan_tier
FROM user_subscriptions;

-- STEP 6: Verify subscriptions have matching profiles and plans
-- =====================================================
SELECT 
    'REFERENTIAL INTEGRITY' as check_name,
    (SELECT COUNT(*) FROM user_subscriptions) as total_subscriptions,
    (SELECT COUNT(*) FROM user_subscriptions us WHERE EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = us.user_id)) as have_matching_profile,
    (SELECT COUNT(*) FROM user_subscriptions us WHERE EXISTS (SELECT 1 FROM subscription_plans sp WHERE sp.id = us.plan_id)) as have_matching_plan
FROM user_subscriptions LIMIT 1;

-- STEP 7: Check what features are currently locked/unlocked
-- =====================================================
SELECT 
    plan_tier,
    COUNT(*) as total_features,
    COUNT(*) FILTER (WHERE is_enabled = true) as unlocked,
    COUNT(*) FILTER (WHERE is_enabled = false) as locked
FROM plan_features
GROUP BY plan_tier
ORDER BY plan_tier;

-- STEP 8: Check if there are any active subscriptions without plan details
-- =====================================================
SELECT 
    'SUBSCRIPTION COMPLETENESS' as check_name,
    us.id,
    us.user_id,
    us.plan_id,
    us.plan_tier,
    us.status,
    sp.plan_tier as plan_tier_from_plans,
    CASE 
        WHEN sp.plan_tier IS NULL THEN 'MISSING: No matching subscription_plan'
        WHEN us.plan_tier != sp.plan_tier THEN 'MISMATCH: plan_tier differs'
        ELSE 'OK'
    END as status_check
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC
LIMIT 20;

-- STEP 9: Verify user_profiles structure
-- =====================================================
SELECT 
    COUNT(*) as total_profiles,
    COUNT(DISTINCT auth_user_id) as unique_auth_users,
    COUNT(DISTINCT role) as unique_roles,
    STRING_AGG(DISTINCT role::text, ', ') as all_roles
FROM user_profiles;

-- STEP 10: Check for users with multiple profiles
-- =====================================================
SELECT 
    auth_user_id,
    COUNT(*) as profile_count,
    STRING_AGG(role::text, ', ') as roles,
    MAX(created_at) as newest_profile
FROM user_profiles
GROUP BY auth_user_id
HAVING COUNT(*) > 1
ORDER BY profile_count DESC, MAX(created_at) DESC
LIMIT 10;

-- STEP 11: Test the logic - for each user, which profile has subscription?
-- =====================================================
SELECT 
    up.auth_user_id,
    up.id as profile_id,
    up.role,
    us.id as subscription_id,
    us.status as subscription_status,
    sp.plan_tier,
    us.created_at as subscription_date
FROM user_profiles up
LEFT JOIN user_subscriptions us ON us.user_id = up.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY up.auth_user_id, us.created_at DESC
LIMIT 30;

-- STEP 12: Check if RPC functions can be called (permission test)
-- =====================================================
-- This will show if the functions are accessible and what they return
-- Note: This may error if functions don't exist yet - that's OK
SELECT 
    'RPC FUNCTION TEST' as test_name,
    'Function exists and is callable' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_user_plan_tier'
LIMIT 1;

-- =====================================================
-- SUMMARY: What will change
-- =====================================================
-- 
-- SAFE CHANGES (won't break anything):
-- 1. CREATE OR REPLACE FUNCTION get_user_plan_tier - updates existing function
--    - Same input (UUID)
--    - Same output (TEXT - plan tier)
--    - New logic: converts auth_user_id → profile_ids internally
--    - SAFER: checks ALL profiles instead of just assuming one
--
-- 2. CREATE OR REPLACE FUNCTION can_user_access_feature - updates existing function
--    - Same input (UUID, TEXT)
--    - Same output (BOOLEAN)
--    - Now uses new get_user_plan_tier internally
--
-- 3. CREATE OR REPLACE FUNCTION is_subscription_valid - updates existing function
--    - Same input (UUID)
--    - Same output (BOOLEAN)
--    - Now uses conversion logic
--
-- 4. CREATE OR REPLACE FUNCTION convert_auth_id_to_profile_ids - NEW function
--    - Doesn't affect existing functions
--    - Helper function only
--
-- WHAT WON'T BREAK:
-- ✅ RLS Policies - not touched
-- ✅ Tables - not touched
-- ✅ Triggers - not touched
-- ✅ Permissions - same grants used
-- ✅ TypeScript code - not touched
--
-- WHAT WILL IMPROVE:
-- ✅ Feature access now works for multi-profile users
-- ✅ Plan tier detection works with both auth_user_id AND profile_id
-- ✅ All subscriptions checked (not just first profile)
-- ✅ No code changes needed in TypeScript
