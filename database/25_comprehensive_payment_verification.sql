-- =====================================================
-- COMPREHENSIVE PAYMENT SYSTEM VERIFICATION
-- =====================================================
-- This script verifies that all payment and subscription data
-- is stored correctly, including autopay setup and initial payments

-- =====================================================
-- 1. VERIFY INITIAL PAYMENT WAS STORED
-- =====================================================

SELECT 
    'Initial Payment Check' as verification_type,
    pt.id as payment_id,
    pt.user_id,
    pt.plan_tier,
    pt.status as payment_status,
    pt.payment_type,
    pt.amount,
    pt.currency,
    pt.is_autopay,
    pt.autopay_mandate_id,
    pt.created_at as payment_date,
    CASE 
        WHEN pt.plan_tier IS NULL THEN '❌ Missing plan_tier'
        WHEN pt.status != 'success' THEN '⚠️ Payment not successful'
        WHEN pt.payment_type != 'initial' THEN '⚠️ Not marked as initial payment'
        WHEN pt.is_autopay = false AND pt.autopay_mandate_id IS NOT NULL THEN '⚠️ Autopay flag mismatch'
        ELSE '✅ OK'
    END as status
FROM payment_transactions pt
WHERE pt.payment_type = 'initial'
ORDER BY pt.created_at DESC
LIMIT 5;

-- =====================================================
-- 2. VERIFY SUBSCRIPTION WITH AUTOPAY SETUP
-- =====================================================

SELECT 
    'Subscription & Autopay Check' as verification_type,
    us.id as subscription_id,
    us.user_id,
    us.status as subscription_status,
    sp.name as plan_name,
    sp.plan_tier,
    us.razorpay_subscription_id,
    us.autopay_enabled,
    us.mandate_status,
    us.razorpay_mandate_id,
    us.payment_gateway,
    us.current_period_start,
    us.current_period_end,
    us.amount as subscription_amount,
    us.interval,
    CASE 
        WHEN us.autopay_enabled = false AND us.razorpay_subscription_id IS NOT NULL THEN '❌ Autopay not enabled but subscription_id exists'
        WHEN us.mandate_status != 'active' AND us.razorpay_subscription_id IS NOT NULL THEN '⚠️ Mandate status not active'
        WHEN us.razorpay_subscription_id IS NULL THEN '⚠️ No Razorpay subscription_id'
        WHEN sp.plan_tier IS NULL THEN '⚠️ Plan missing plan_tier'
        ELSE '✅ OK'
    END as status
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC
LIMIT 10;

-- =====================================================
-- 3. VERIFY PAYMENT LINKED TO SUBSCRIPTION
-- =====================================================

SELECT 
    'Payment-Subscription Link' as verification_type,
    pt.id as payment_id,
    pt.user_id,
    pt.subscription_id,
    pt.plan_tier as payment_plan_tier,
    pt.amount as payment_amount,
    pt.is_autopay,
    us.id as subscription_id_check,
    us.razorpay_subscription_id,
    us.autopay_enabled,
    sp.plan_tier as subscription_plan_tier,
    CASE 
        WHEN pt.subscription_id IS NULL THEN '⚠️ Payment not linked to subscription'
        WHEN pt.subscription_id != us.id THEN '❌ Payment linked to wrong subscription'
        WHEN pt.plan_tier != sp.plan_tier THEN '⚠️ Plan tier mismatch'
        WHEN pt.is_autopay != us.autopay_enabled THEN '⚠️ Autopay flag mismatch'
        ELSE '✅ OK'
    END as status
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE pt.payment_type = 'initial'
ORDER BY pt.created_at DESC
LIMIT 5;

-- =====================================================
-- 4. VERIFY INITIAL PAYMENT AMOUNT MATCHES PLAN
-- =====================================================

SELECT 
    'Payment Amount Verification' as verification_type,
    pt.id as payment_id,
    pt.user_id,
    pt.amount as payment_amount,
    pt.currency as payment_currency,
    pt.metadata->>'total_amount_with_tax' as total_with_tax,
    pt.metadata->>'tax_amount' as tax_amount,
    pt.metadata->>'tax_percentage' as tax_percentage,
    sp.price as plan_price,
    sp.currency as plan_currency,
    us.amount as subscription_amount,
    CASE 
        WHEN pt.amount IS NULL THEN '❌ Payment amount is null'
        WHEN pt.amount <= 0 THEN '❌ Payment amount is zero or negative'
        ELSE '✅ OK'
    END as status
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE pt.payment_type = 'initial'
ORDER BY pt.created_at DESC
LIMIT 5;

-- =====================================================
-- 5. VERIFY BILLING PERIOD IS SET CORRECTLY
-- =====================================================

SELECT 
    'Billing Period Check' as verification_type,
    us.id as subscription_id,
    us.user_id,
    us.current_period_start,
    us.current_period_end,
    us.interval,
    CASE 
        WHEN us.interval = 'monthly' THEN 
            CASE 
                WHEN EXTRACT(EPOCH FROM (us.current_period_end - us.current_period_start)) / 86400 BETWEEN 28 AND 31 THEN '✅ OK'
                ELSE '⚠️ Period not ~30 days'
            END
        WHEN us.interval = 'yearly' THEN
            CASE 
                WHEN EXTRACT(EPOCH FROM (us.current_period_end - us.current_period_start)) / 86400 BETWEEN 365 AND 366 THEN '✅ OK'
                ELSE '⚠️ Period not ~365 days'
            END
        ELSE '⚠️ Unknown interval'
    END as status,
    EXTRACT(EPOCH FROM (us.current_period_end - us.current_period_start)) / 86400 as days_in_period
FROM user_subscriptions us
WHERE us.status = 'active'
ORDER BY us.created_at DESC
LIMIT 10;

-- =====================================================
-- 6. SUMMARY: COMPLETE PAYMENT FLOW VERIFICATION
-- =====================================================

SELECT 
    'Complete Flow Summary' as verification_type,
    COUNT(DISTINCT pt.user_id) as users_with_payments,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.payment_type = 'initial') as initial_payments,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.is_autopay = true) as autopay_payments,
    COUNT(DISTINCT us.id) FILTER (WHERE us.autopay_enabled = true) as subscriptions_with_autopay,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.plan_tier IS NULL) as payments_missing_tier,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.subscription_id IS NULL) as payments_not_linked,
    COUNT(DISTINCT us.id) FILTER (WHERE us.razorpay_subscription_id IS NULL) as subscriptions_missing_razorpay_id,
    CASE 
        WHEN COUNT(DISTINCT pt.id) FILTER (WHERE pt.plan_tier IS NULL) > 0 THEN '❌ Some payments missing plan_tier'
        WHEN COUNT(DISTINCT pt.id) FILTER (WHERE pt.subscription_id IS NULL AND pt.payment_type = 'initial') > 0 THEN '⚠️ Some initial payments not linked'
        WHEN COUNT(DISTINCT us.id) FILTER (WHERE us.autopay_enabled = false AND us.razorpay_subscription_id IS NOT NULL) > 0 THEN '⚠️ Some subscriptions have subscription_id but autopay disabled'
        ELSE '✅ All checks passed'
    END as overall_status
FROM payment_transactions pt
FULL OUTER JOIN user_subscriptions us ON pt.subscription_id = us.id;

-- =====================================================
-- 7. CHECK FOR ANY DATA INCONSISTENCIES
-- =====================================================

SELECT 
    'Data Inconsistencies' as verification_type,
    'Payments without plan_tier' as issue_type,
    COUNT(*) as count,
    STRING_AGG(pt.id::text, ', ') as affected_ids
FROM payment_transactions pt
WHERE pt.plan_tier IS NULL

UNION ALL

SELECT 
    'Data Inconsistencies' as verification_type,
    'Initial payments not linked to subscription' as issue_type,
    COUNT(*) as count,
    STRING_AGG(pt.id::text, ', ') as affected_ids
FROM payment_transactions pt
WHERE pt.payment_type = 'initial' 
  AND pt.subscription_id IS NULL

UNION ALL

SELECT 
    'Data Inconsistencies' as verification_type,
    'Subscriptions with subscription_id but autopay disabled' as issue_type,
    COUNT(*) as count,
    STRING_AGG(us.id::text, ', ') as affected_ids
FROM user_subscriptions us
WHERE us.razorpay_subscription_id IS NOT NULL 
  AND us.autopay_enabled = false;
