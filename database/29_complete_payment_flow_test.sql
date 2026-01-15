-- =====================================================
-- COMPLETE PAYMENT FLOW TEST QUERIES
-- =====================================================
-- Use these queries to verify the entire payment flow
-- Replace 'YOUR_USER_ID' with your test user ID
-- =====================================================

-- =====================================================
-- 1. CHECK ALL SUBSCRIPTIONS FOR USER
-- =====================================================
SELECT 
  us.id,
  us.user_id,
  us.status,
  sp.plan_tier,
  sp.name as plan_name,
  us.amount,
  us.interval,
  us.autopay_enabled,
  us.mandate_status,
  us.current_period_start,
  us.current_period_end,
  us.billing_cycle_count,
  us.total_paid,
  us.previous_plan_tier,
  us.previous_subscription_id,
  us.razorpay_subscription_id,
  us.created_at
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'::UUID
ORDER BY us.created_at DESC;

-- =====================================================
-- 2. CHECK ALL PAYMENT TRANSACTIONS
-- =====================================================
SELECT 
  pt.id,
  pt.user_id,
  pt.subscription_id,
  pt.amount,
  pt.currency,
  pt.status,
  pt.payment_type,
  pt.plan_tier,
  pt.plan_tier_before,
  pt.plan_tier_after,
  pt.is_autopay,
  pt.gateway_order_id,
  pt.gateway_payment_id,
  pt.created_at
FROM payment_transactions pt
WHERE pt.user_id = 'YOUR_USER_ID'::UUID
ORDER BY pt.created_at DESC;

-- =====================================================
-- 3. CHECK ALL BILLING CYCLES
-- =====================================================
SELECT 
  bc.id,
  bc.subscription_id,
  bc.cycle_number,
  bc.period_start,
  bc.period_end,
  bc.amount,
  bc.currency,
  bc.status,
  bc.plan_tier,
  bc.is_autopay,
  bc.payment_transaction_id,
  bc.created_at
FROM billing_cycles bc
WHERE bc.subscription_id IN (
  SELECT id FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID'::UUID
)
ORDER BY bc.subscription_id, bc.cycle_number DESC;

-- =====================================================
-- 4. CHECK SUBSCRIPTION CHANGES
-- =====================================================
SELECT 
  sc.id,
  sc.subscription_id,
  sc.user_id,
  sc.change_type,
  sc.plan_tier_before,
  sc.plan_tier_after,
  sc.amount_before_inr,
  sc.amount_after_inr,
  sc.old_billing_end,
  sc.new_billing_start,
  sc.new_billing_end,
  sc.autopay_before,
  sc.autopay_after,
  sc.reason,
  sc.initiated_by,
  sc.created_at
FROM subscription_changes sc
WHERE sc.user_id = 'YOUR_USER_ID'::UUID
ORDER BY sc.created_at DESC;

-- =====================================================
-- 5. VERIFY PLAN TIER FUNCTION
-- =====================================================
SELECT 
  'Current Plan Tier' as check_name,
  get_user_plan_tier('YOUR_USER_ID'::UUID) as result;

-- =====================================================
-- 6. SUMMARY STATISTICS
-- =====================================================
SELECT 
  'Subscriptions' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) FILTER (WHERE autopay_enabled = true) as autopay_enabled
FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID'::UUID

UNION ALL

SELECT 
  'Payment Transactions' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE payment_type = 'initial') as initial_payments
FROM payment_transactions
WHERE user_id = 'YOUR_USER_ID'::UUID

UNION ALL

SELECT 
  'Billing Cycles' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  MAX(cycle_number) as max_cycle
FROM billing_cycles
WHERE subscription_id IN (
  SELECT id FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID'::UUID
)

UNION ALL

SELECT 
  'Subscription Changes' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE change_type = 'upgrade') as upgrades,
  COUNT(*) FILTER (WHERE change_type = 'downgrade') as downgrades,
  COUNT(*) FILTER (WHERE change_type = 'cancellation') as cancellations,
  0 as placeholder
FROM subscription_changes
WHERE user_id = 'YOUR_USER_ID'::UUID;

-- =====================================================
-- 7. CHECK PAYMENT FLOW INTEGRITY
-- =====================================================
SELECT 
  'Payment Flow Integrity Check' as check_type,
  CASE 
    WHEN COUNT(DISTINCT pt.id) = COUNT(DISTINCT bc.payment_transaction_id) 
      THEN '✅ All billing cycles linked to payments'
    ELSE '❌ Missing payment links'
  END as status,
  COUNT(DISTINCT pt.id) as payment_count,
  COUNT(DISTINCT bc.payment_transaction_id) as linked_cycles
FROM payment_transactions pt
LEFT JOIN billing_cycles bc ON pt.id = bc.payment_transaction_id
WHERE pt.user_id = 'YOUR_USER_ID'::UUID
  AND pt.status = 'completed';

-- =====================================================
-- 8. CHECK FOR DATA INCONSISTENCIES
-- =====================================================
SELECT 
  'Data Inconsistencies' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No issues found'
    ELSE '❌ Issues found: ' || COUNT(*)::TEXT
  END as status,
  COUNT(*) as issue_count
FROM (
  -- Payments without plan_tier
  SELECT 'Payment missing plan_tier' as issue, id
  FROM payment_transactions
  WHERE user_id = 'YOUR_USER_ID'::UUID
    AND plan_tier IS NULL
  
  UNION ALL
  
  -- Subscriptions with autopay but no mandate
  SELECT 'Subscription autopay enabled but mandate inactive' as issue, us.id
  FROM user_subscriptions us
  WHERE us.user_id = 'YOUR_USER_ID'::UUID
    AND us.autopay_enabled = true
    AND (us.mandate_status IS NULL OR us.mandate_status != 'active')
  
  UNION ALL
  
  -- Billing cycles without payment transaction
  SELECT 'Billing cycle missing payment transaction' as issue, bc.id
  FROM billing_cycles bc
  WHERE bc.subscription_id IN (
    SELECT id FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID'::UUID
  )
  AND bc.payment_transaction_id IS NULL
  
  UNION ALL
  
  -- Subscriptions with wrong billing cycle count
  SELECT 'Subscription billing cycle count mismatch' as issue, us.id
  FROM user_subscriptions us
  WHERE us.user_id = 'YOUR_USER_ID'::UUID
    AND us.billing_cycle_count != (
      SELECT COUNT(*) 
      FROM billing_cycles 
      WHERE subscription_id = us.id
    )
) issues;

-- =====================================================
-- 9. CHECK ACTIVE SUBSCRIPTIONS BY TIER
-- =====================================================
SELECT 
  sp.plan_tier,
  COUNT(*) as subscription_count,
  SUM(us.amount) as total_amount,
  AVG(us.billing_cycle_count) as avg_cycles,
  SUM(us.total_paid) as total_paid
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'::UUID
  AND us.status = 'active'
GROUP BY sp.plan_tier
ORDER BY 
  CASE sp.plan_tier
    WHEN 'premium' THEN 3
    WHEN 'basic' THEN 2
    WHEN 'free' THEN 1
  END DESC;

-- =====================================================
-- 10. TIMELINE VIEW
-- =====================================================
SELECT 
  'Subscription Created' as event_type,
  us.created_at as event_date,
  sp.plan_tier,
  us.status,
  us.amount
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'::UUID

UNION ALL

SELECT 
  'Payment: ' || pt.payment_type as event_type,
  pt.created_at as event_date,
  pt.plan_tier,
  pt.status,
  pt.amount
FROM payment_transactions pt
WHERE pt.user_id = 'YOUR_USER_ID'::UUID

UNION ALL

SELECT 
  'Change: ' || sc.change_type as event_type,
  sc.created_at as event_date,
  sc.plan_tier_after,
  'completed' as status,
  sc.amount_after_inr
FROM subscription_changes sc
WHERE sc.user_id = 'YOUR_USER_ID'::UUID

ORDER BY event_date DESC;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================
-- 1. Replace 'YOUR_USER_ID' with your actual test user ID
-- 2. Run each query section to verify different aspects
-- 3. Compare results with expected values from test flow
-- 4. Use summary statistics to get overview
-- 5. Check for data inconsistencies in section 8
-- =====================================================
