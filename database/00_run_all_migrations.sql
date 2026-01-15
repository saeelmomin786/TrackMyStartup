-- =====================================================
-- MASTER MIGRATION SCRIPT
-- =====================================================
-- Run this script to set up all database tables and functions
-- for the payment gateway integration
--
-- Execution order:
-- 1. Plan features table
-- 2. Storage usage table
-- 3. Payment transactions table
-- 4. Update subscription tables
-- 5. Create subscription plans (EUR pricing)
--
-- =====================================================

-- Step 1: Create plan features table
\i database/01_create_plan_features_table.sql

-- Step 2: Create storage usage table
\i database/02_create_storage_usage_table.sql

-- Step 3: Create payment transactions table
\i database/03_create_payment_transactions_table.sql

-- Step 4: Update subscription tables
\i database/04_update_subscription_tables.sql

-- Step 5: Create subscription plans with EUR pricing
\i CREATE_SUBSCRIPTION_PLANS_EUR.sql

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'plan_features',
    'user_storage_usage',
    'payment_transactions',
    'subscription_plans',
    'user_subscriptions'
)
ORDER BY table_name;

-- Verify plan features are configured
SELECT 
    plan_tier,
    COUNT(*) as total_features,
    COUNT(*) FILTER (WHERE is_enabled = true) as enabled_features
FROM plan_features
GROUP BY plan_tier
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- Verify subscription plans exist
SELECT 
    name,
    price,
    currency,
    plan_tier,
    storage_limit_mb,
    country,
    is_active
FROM subscription_plans
WHERE user_type = 'Startup'
AND country = 'Global'
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ All database migrations completed successfully!';
    RAISE NOTICE '📊 Tables created: plan_features, user_storage_usage, payment_transactions';
    RAISE NOTICE '🔄 Tables updated: subscription_plans, user_subscriptions';
    RAISE NOTICE '💰 Subscription plans created: Free (€0), Basic (€5), Premium (€20)';
    RAISE NOTICE '🔧 Functions created: get_user_plan_tier, can_user_access_feature, get_user_storage_limit';
END $$;
