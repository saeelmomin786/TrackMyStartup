-- Verification Script for Startup Subscription Plans
-- Run this after executing STARTUP_SUBSCRIPTION_PLANS_SCHEMA.sql

-- =====================================================
-- STEP 1: CHECK IF PLANS EXIST
-- =====================================================

SELECT 
    'Subscription Plans Check' as check_type,
    COUNT(*) as total_plans,
    COUNT(CASE WHEN interval = 'monthly' THEN 1 END) as monthly_plans,
    COUNT(CASE WHEN interval = 'yearly' THEN 1 END) as yearly_plans,
    COUNT(CASE WHEN user_type = 'Startup' THEN 1 END) as startup_plans
FROM subscription_plans 
WHERE is_active = true;

-- =====================================================
-- STEP 2: SHOW ALL STARTUP PLANS
-- =====================================================

SELECT 
    'Startup Subscription Plans' as section,
    name,
    price,
    currency,
    interval,
    country,
    CASE 
        WHEN interval = 'yearly' THEN ROUND(price / 12, 2)
        ELSE price
    END as monthly_equivalent,
    CASE 
        WHEN interval = 'yearly' THEN 'Best Value - Save 2 months!'
        ELSE 'Flexible monthly billing'
    END as benefit
FROM subscription_plans 
WHERE user_type = 'Startup' 
AND is_active = true
ORDER BY interval, price;

-- =====================================================
-- STEP 3: CHECK TRIAL COLUMNS IN USER_SUBSCRIPTIONS
-- =====================================================

SELECT 
    'Trial Columns Check' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN ('is_in_trial', 'trial_start', 'trial_end', 'razorpay_subscription_id')
ORDER BY column_name;

-- =====================================================
-- STEP 4: TEST HELPER FUNCTIONS
-- =====================================================

-- Test get_startup_plans function
SELECT 'Testing get_startup_plans function' as test_name;
SELECT * FROM get_startup_plans('Global');

-- Test has_active_trial function (with dummy UUID)
SELECT 'Testing has_active_trial function' as test_name;
SELECT has_active_trial('00000000-0000-0000-0000-000000000000'::uuid) as has_trial;

-- =====================================================
-- STEP 5: CHECK INDEXES
-- =====================================================

SELECT 
    'Indexes Check' as check_type,
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('subscription_plans', 'user_subscriptions')
AND indexname LIKE '%trial%' OR indexname LIKE '%startup%'
ORDER BY tablename, indexname;

-- =====================================================
-- STEP 6: VERIFY VIEWS
-- =====================================================

-- Check active_startup_plans view
SELECT 'Active Startup Plans View' as view_name;
SELECT * FROM active_startup_plans;

-- Check active_trial_subscriptions view (should be empty initially)
SELECT 'Active Trial Subscriptions View' as view_name;
SELECT COUNT(*) as trial_count FROM active_trial_subscriptions;

-- =====================================================
-- STEP 7: FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
    plan_count INTEGER;
    trial_columns_count INTEGER;
    views_count INTEGER;
BEGIN
    -- Check plans
    SELECT COUNT(*) INTO plan_count 
    FROM subscription_plans 
    WHERE user_type = 'Startup' AND is_active = true;
    
    -- Check trial columns
    SELECT COUNT(*) INTO trial_columns_count
    FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' 
    AND column_name IN ('is_in_trial', 'trial_start', 'trial_end', 'razorpay_subscription_id');
    
    -- Check views
    SELECT COUNT(*) INTO views_count
    FROM information_schema.views 
    WHERE table_name IN ('active_startup_plans', 'active_trial_subscriptions');
    
    -- Report results
    RAISE NOTICE '=== SUBSCRIPTION PLANS SETUP VERIFICATION ===';
    RAISE NOTICE 'Startup Plans Created: %', plan_count;
    RAISE NOTICE 'Trial Columns Added: %', trial_columns_count;
    RAISE NOTICE 'Views Created: %', views_count;
    
    IF plan_count >= 2 AND trial_columns_count = 4 AND views_count >= 2 THEN
        RAISE NOTICE '✅ SUCCESS: All subscription plans and trial features are properly configured!';
    ELSE
        RAISE WARNING '❌ ISSUES FOUND: Some components may not be properly configured.';
        RAISE WARNING 'Expected: 2+ plans, 4 trial columns, 2+ views';
        RAISE WARNING 'Found: % plans, % trial columns, % views', plan_count, trial_columns_count, views_count;
    END IF;
END $$;






