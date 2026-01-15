-- =====================================================
-- FINAL PAYMENT FLOW VERIFICATION
-- =====================================================
-- This shows the complete payment flow for recent transactions
-- Use this to verify everything is working end-to-end

-- =====================================================
-- COMPLETE PAYMENT FLOW FOR RECENT TRANSACTIONS
-- =====================================================

SELECT 
    'Complete Payment Flow' as check_type,
    pt.id as payment_transaction_id,
    pt.user_id,
    pt.created_at as payment_date,
    
    -- Payment Details
    pt.plan_tier as payment_plan_tier,
    pt.amount as payment_amount,
    pt.currency as payment_currency,
    pt.status as payment_status,
    pt.payment_type,
    pt.is_autopay,
    pt.autopay_mandate_id,
    
    -- Subscription Details
    us.id as subscription_id,
    us.status as subscription_status,
    us.razorpay_subscription_id,
    us.autopay_enabled,
    us.mandate_status,
    us.razorpay_mandate_id,
    us.payment_gateway,
    us.current_period_start,
    us.current_period_end,
    us.interval,
    us.amount as subscription_amount,
    
    -- Plan Details
    sp.id as plan_id,
    sp.name as plan_name,
    sp.plan_tier as plan_plan_tier,
    sp.price as plan_price,
    sp.currency as plan_currency,
    sp.storage_limit_mb,
    
    -- Verification Status
    CASE 
        WHEN pt.plan_tier IS NULL THEN '❌ Payment missing plan_tier'
        WHEN pt.subscription_id IS NULL THEN '⚠️ Payment not linked to subscription'
        WHEN us.id IS NULL THEN '❌ Subscription not found'
        WHEN pt.plan_tier != sp.plan_tier THEN '⚠️ Plan tier mismatch'
        WHEN pt.is_autopay != us.autopay_enabled THEN '⚠️ Autopay flag mismatch'
        WHEN us.autopay_enabled = false AND us.razorpay_subscription_id IS NOT NULL THEN '⚠️ Autopay not enabled but subscription_id exists'
        WHEN us.mandate_status != 'active' AND us.razorpay_subscription_id IS NOT NULL THEN '⚠️ Mandate not active'
        ELSE '✅ All checks passed'
    END as verification_status
    
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE pt.payment_type = 'initial'
ORDER BY pt.created_at DESC
LIMIT 10;

-- =====================================================
-- SUMMARY STATISTICS
-- =====================================================

SELECT 
    'Summary Statistics' as check_type,
    COUNT(DISTINCT pt.user_id) as total_users_with_payments,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.payment_type = 'initial') as total_initial_payments,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'success' AND pt.payment_type = 'initial') as successful_initial_payments,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.is_autopay = true) as autopay_payments,
    COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'active') as active_subscriptions,
    COUNT(DISTINCT us.id) FILTER (WHERE us.autopay_enabled = true) as subscriptions_with_autopay,
    COUNT(DISTINCT us.id) FILTER (WHERE us.mandate_status = 'active') as subscriptions_with_active_mandate,
    ROUND(AVG(pt.amount) FILTER (WHERE pt.payment_type = 'initial'), 2) as avg_initial_payment_amount,
    SUM(pt.amount) FILTER (WHERE pt.payment_type = 'initial') as total_initial_payments_amount
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id;

-- =====================================================
-- CHECK FOR ANY ISSUES
-- =====================================================

SELECT 
    'Issues Found' as check_type,
    'Payments without plan_tier' as issue,
    COUNT(*) as count
FROM payment_transactions
WHERE plan_tier IS NULL

UNION ALL

SELECT 
    'Issues Found' as check_type,
    'Initial payments not linked to subscription' as issue,
    COUNT(*) as count
FROM payment_transactions
WHERE payment_type = 'initial' AND subscription_id IS NULL

UNION ALL

SELECT 
    'Issues Found' as check_type,
    'Subscriptions with subscription_id but autopay disabled' as issue,
    COUNT(*) as count
FROM user_subscriptions
WHERE razorpay_subscription_id IS NOT NULL AND autopay_enabled = false

UNION ALL

SELECT 
    'Issues Found' as check_type,
    'Subscriptions with subscription_id but mandate not active' as issue,
    COUNT(*) as count
FROM user_subscriptions
WHERE razorpay_subscription_id IS NOT NULL 
  AND (mandate_status IS NULL OR mandate_status != 'active');
