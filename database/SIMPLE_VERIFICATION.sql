-- =====================================================
-- SIMPLIFIED VERIFICATION - Run these one at a time
-- =====================================================

-- QUERY 1: How many subscriptions exist?
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE plan_tier IS NULL) as missing_plan_tier
FROM user_subscriptions;

-- QUERY 2: Do subscriptions match with profiles and plans?
SELECT 
    'TOTAL_SUBS' as check_name,
    (SELECT COUNT(*) FROM user_subscriptions) as total,
    (SELECT COUNT(*) FROM user_subscriptions us 
     WHERE EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = us.user_id)) as have_profile,
    (SELECT COUNT(*) FROM user_subscriptions us 
     WHERE EXISTS (SELECT 1 FROM subscription_plans sp WHERE sp.id = us.plan_id)) as have_plan;

-- QUERY 3: Feature configuration - are they set up correctly?
SELECT 
    plan_tier,
    COUNT(*) as total_features,
    COUNT(*) FILTER (WHERE is_enabled = true) as unlocked,
    COUNT(*) FILTER (WHERE is_enabled = false) as locked
FROM plan_features
GROUP BY plan_tier
ORDER BY plan_tier;

-- QUERY 4: Show your subscription + profile mapping
SELECT 
    up.auth_user_id,
    up.id as profile_id,
    up.role,
    us.id as subscription_id,
    us.status,
    sp.plan_tier
FROM user_profiles up
LEFT JOIN user_subscriptions us ON us.user_id = up.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY up.auth_user_id DESC
LIMIT 30;

-- QUERY 5: How many users have multiple profiles?
SELECT 
    auth_user_id,
    COUNT(*) as profile_count,
    COUNT(DISTINCT role) as unique_roles
FROM user_profiles
GROUP BY auth_user_id
HAVING COUNT(*) > 1
ORDER BY profile_count DESC
LIMIT 10;
