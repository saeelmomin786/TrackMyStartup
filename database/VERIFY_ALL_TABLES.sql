-- =====================================================
-- COMPLETE VERIFICATION - ALL PAYMENT TABLES
-- =====================================================
-- Run this to verify all tables and columns were created

-- =====================================================
-- 1. CHECK ALL TABLES EXIST
-- =====================================================

SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'plan_features',
            'user_storage_usage',
            'country_plan_prices',
            'payment_transactions',
            'billing_cycles',
            'subscription_changes'
        ) THEN '✅ NEW TABLE'
        ELSE '⚠️ EXISTING TABLE'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'plan_features',
    'user_storage_usage',
    'country_plan_prices',
    'payment_transactions',
    'billing_cycles',
    'subscription_changes',
    'user_subscriptions',
    'subscription_plans'
)
ORDER BY 
    CASE table_name
        WHEN 'plan_features' THEN 1
        WHEN 'user_storage_usage' THEN 2
        WHEN 'country_plan_prices' THEN 3
        WHEN 'payment_transactions' THEN 4
        WHEN 'billing_cycles' THEN 5
        WHEN 'subscription_changes' THEN 6
        WHEN 'user_subscriptions' THEN 7
        WHEN 'subscription_plans' THEN 8
    END;

-- =====================================================
-- 2. VERIFY plan_features TABLE
-- =====================================================

SELECT 
    'plan_features' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT plan_tier) as plan_tiers,
    COUNT(DISTINCT feature_name) as features
FROM plan_features;

-- Show feature distribution
SELECT 
    plan_tier,
    COUNT(*) as total_features,
    COUNT(*) FILTER (WHERE is_enabled = true) as enabled,
    COUNT(*) FILTER (WHERE is_enabled = false) as disabled
FROM plan_features
GROUP BY plan_tier
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- =====================================================
-- 3. VERIFY country_plan_prices TABLE
-- =====================================================

SELECT 
    'country_plan_prices' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT country) as countries,
    COUNT(DISTINCT plan_tier) as plan_tiers
FROM country_plan_prices;

-- Show country prices
SELECT 
    country,
    plan_tier,
    price_inr,
    payment_gateway,
    is_active
FROM country_plan_prices
ORDER BY country, 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- =====================================================
-- 4. VERIFY payment_transactions TABLE STRUCTURE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_transactions'
AND column_name IN (
    'payment_gateway',
    'amount',
    'currency',
    'status',
    'payment_type',
    'plan_tier',
    'is_autopay',
    'billing_cycle_number'
)
ORDER BY column_name;

-- =====================================================
-- 5. VERIFY billing_cycles TABLE STRUCTURE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'billing_cycles'
AND column_name IN (
    'cycle_number',
    'period_start',
    'period_end',
    'amount',
    'status',
    'plan_tier',
    'is_autopay'
)
ORDER BY column_name;

-- =====================================================
-- 6. VERIFY subscription_changes TABLE STRUCTURE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_changes'
AND column_name IN (
    'change_type',
    'plan_tier_before',
    'plan_tier_after',
    'amount_before_inr',
    'amount_after_inr',
    'prorated_amount_inr',
    'autopay_before',
    'autopay_after'
)
ORDER BY column_name;

-- =====================================================
-- 7. VERIFY user_storage_usage TABLE
-- =====================================================

SELECT 
    'user_storage_usage' as table_name,
    COUNT(*) as total_files,
    COALESCE(SUM(file_size_mb), 0) as total_storage_mb
FROM user_storage_usage;

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_storage_usage';

-- Check if function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'get_user_storage_total';

-- =====================================================
-- 8. VERIFY user_subscriptions ENHANCED COLUMNS
-- =====================================================

SELECT 
    'user_subscriptions' as table_name,
    COUNT(*) FILTER (WHERE column_name IN (
        'locked_amount_inr', 'country', 'payment_gateway',
        'autopay_enabled', 'razorpay_mandate_id', 'payaid_subscription_id',
        'mandate_status', 'mandate_created_at',
        'next_billing_date', 'last_billing_date', 'billing_cycle_count', 'total_paid',
        'previous_plan_tier', 'previous_subscription_id', 'change_reason',
        'storage_used_mb'
    )) as payment_columns_found
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions';

-- =====================================================
-- 9. VERIFY subscription_plans ENHANCED COLUMNS
-- =====================================================

SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'subscription_plans'
AND column_name IN ('plan_tier', 'storage_limit_mb', 'features')
ORDER BY column_name;

-- =====================================================
-- 10. CHECK RLS POLICIES
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN (
    'plan_features',
    'user_storage_usage',
    'country_plan_prices',
    'payment_transactions',
    'billing_cycles',
    'subscription_changes'
)
ORDER BY tablename, policyname;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
    '✅ VERIFICATION COMPLETE' as status,
    'All tables and columns should be verified above' as message;
