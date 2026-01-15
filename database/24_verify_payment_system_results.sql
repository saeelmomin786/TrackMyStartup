-- =====================================================
-- VERIFY PAYMENT SYSTEM - RESULTS AS TABLE
-- =====================================================
-- This version returns results as a table for easy viewing
-- Run this if you want to see results in the Supabase SQL Editor results panel

-- =====================================================
-- 1. SUBSCRIPTION PLANS SUMMARY
-- =====================================================

SELECT 
    'Subscription Plans' as check_type,
    plan_tier,
    user_type,
    interval,
    country,
    COUNT(*) as count,
    CASE 
        WHEN plan_tier IS NULL THEN '⚠️ Missing plan_tier'
        WHEN COUNT(*) = 0 THEN '⚠️ No plans found'
        ELSE '✅ OK'
    END as status
FROM subscription_plans
WHERE user_type = 'Startup' AND is_active = true
GROUP BY plan_tier, user_type, interval, country
ORDER BY plan_tier, interval, country;

-- =====================================================
-- 2. USER SUBSCRIPTIONS SUMMARY
-- =====================================================

SELECT 
    'User Subscriptions' as check_type,
    us.status,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE us.autopay_enabled = true) as with_autopay,
    COUNT(*) FILTER (WHERE us.autopay_enabled = false OR us.autopay_enabled IS NULL) as without_autopay,
    COUNT(*) FILTER (WHERE us.mandate_status = 'active') as active_mandates,
    COUNT(*) FILTER (WHERE sp.plan_tier IS NULL) as missing_plan_tier,
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ No subscriptions'
        WHEN COUNT(*) FILTER (WHERE sp.plan_tier IS NULL) > 0 THEN '⚠️ Some plans missing plan_tier'
        ELSE '✅ OK'
    END as verification_status
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
GROUP BY us.status
ORDER BY us.status;

-- =====================================================
-- 3. PAYMENT TRANSACTIONS SUMMARY
-- =====================================================

SELECT 
    'Payment Transactions' as check_type,
    pt.status,
    pt.payment_type,
    pt.plan_tier,
    COUNT(*) as count,
    SUM(pt.amount) as total_amount,
    COUNT(*) FILTER (WHERE pt.is_autopay = true) as autopay_count,
    COUNT(*) FILTER (WHERE pt.plan_tier IS NULL) as missing_tier,
    CASE 
        WHEN COUNT(*) FILTER (WHERE pt.plan_tier IS NULL) > 0 THEN '⚠️ Some missing plan_tier'
        WHEN COUNT(*) = 0 THEN '⚠️ No transactions'
        ELSE '✅ OK'
    END as verification_status
FROM payment_transactions pt
GROUP BY pt.status, pt.payment_type, pt.plan_tier
ORDER BY pt.status, pt.payment_type, pt.plan_tier;

-- =====================================================
-- 4. RECENT PAYMENTS (Last 5)
-- =====================================================

SELECT 
    'Recent Payments' as check_type,
    pt.id,
    pt.user_id,
    pt.plan_tier,
    pt.status,
    pt.payment_type,
    pt.is_autopay,
    pt.amount,
    pt.currency,
    pt.created_at,
    us.razorpay_subscription_id,
    us.autopay_enabled,
    us.mandate_status,
    sp.name as plan_name,
    CASE 
        WHEN pt.plan_tier IS NULL THEN '❌ Missing plan_tier'
        WHEN pt.is_autopay = true AND us.autopay_enabled = false THEN '⚠️ Autopay mismatch'
        ELSE '✅ OK'
    END as status
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY pt.created_at DESC
LIMIT 5;

-- =====================================================
-- 5. ACTIVE SUBSCRIPTIONS WITH PLAN DETAILS
-- =====================================================

SELECT 
    'Active Subscriptions' as check_type,
    us.id,
    us.user_id,
    us.status,
    sp.name as plan_name,
    sp.plan_tier,
    sp.storage_limit_mb,
    us.autopay_enabled,
    us.mandate_status,
    us.razorpay_subscription_id,
    us.current_period_start,
    us.current_period_end,
    CASE 
        WHEN sp.plan_tier IS NULL THEN '⚠️ Plan missing tier'
        WHEN us.autopay_enabled = false AND us.razorpay_subscription_id IS NOT NULL THEN '⚠️ Autopay not enabled'
        ELSE '✅ OK'
    END as status
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC
LIMIT 10;

-- =====================================================
-- 6. FUNCTION EXISTENCE CHECK
-- =====================================================

SELECT 
    'Functions' as check_type,
    p.proname as function_name,
    CASE 
        WHEN p.proname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_user_plan_tier', 'can_user_access_feature')
ORDER BY p.proname;

-- =====================================================
-- 7. TABLE CONSTRAINTS CHECK
-- =====================================================

SELECT 
    'Constraints' as check_type,
    tc.constraint_name,
    tc.table_name,
    '✅ EXISTS' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.constraint_name = 'unique_subscription_plan_name_user_interval_country'
UNION ALL
SELECT 
    'Constraints' as check_type,
    'plan_tier NOT NULL' as constraint_name,
    'payment_transactions' as table_name,
    CASE 
        WHEN c.is_nullable = 'NO' THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND c.table_name = 'payment_transactions'
AND c.column_name = 'plan_tier';
