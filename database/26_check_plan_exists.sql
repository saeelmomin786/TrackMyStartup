-- =====================================================
-- QUICK CHECK: VERIFY PLANS EXIST IN DATABASE
-- =====================================================
-- Run this to check if plans exist and have plan_tier set

SELECT 
    id,
    name,
    plan_tier,
    user_type,
    interval,
    country,
    price,
    currency,
    is_active,
    CASE 
        WHEN plan_tier IS NULL THEN '❌ Missing plan_tier'
        WHEN is_active = false THEN '⚠️ Inactive'
        ELSE '✅ OK'
    END as status
FROM subscription_plans
WHERE user_type = 'Startup'
ORDER BY plan_tier, interval, country;

-- Check if we can find plans by common names
SELECT 
    'Plan Lookup Test' as test_type,
    COUNT(*) FILTER (WHERE name ILIKE '%basic%' AND plan_tier = 'basic') as basic_plans_found,
    COUNT(*) FILTER (WHERE name ILIKE '%premium%' AND plan_tier = 'premium') as premium_plans_found,
    COUNT(*) FILTER (WHERE plan_tier IS NULL) as plans_missing_tier
FROM subscription_plans
WHERE user_type = 'Startup' AND is_active = true;
