-- 🔍 DIAGNOSE HOW THIS SUBSCRIPTION WAS CREATED
-- Check if subscription was properly created through payment flow or another method

-- =====================================================
-- PART 1: Show the problematic subscription
-- =====================================================

SELECT 
  'PART 1: The Problematic Subscription' as section,
  id as subscription_id,
  user_id,
  plan_id,
  plan_tier,
  status,
  created_at,
  -- MISSING FIELDS (should be set but are NULL):
  razorpay_subscription_id,
  payment_gateway,
  autopay_enabled,
  mandate_status,
  next_billing_date,
  last_billing_date,
  billing_cycle_count,
  total_paid,
  -- These are set correctly:
  current_period_start,
  current_period_end,
  amount,
  currency,
  "interval"
FROM public.user_subscriptions
WHERE id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9';

-- =====================================================
-- PART 2: Check if payment transaction exists
-- =====================================================

SELECT 
  'PART 2: Payment Transaction for This Subscription' as section,
  pt.*
FROM public.payment_transactions pt
WHERE pt.subscription_id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9'
   OR pt.user_id = 'c66cf9bb-12ea-4962-8fca-6f6a945ad569'
ORDER BY pt.created_at DESC
LIMIT 5;

-- =====================================================
-- PART 3: Check if billing cycle was created
-- =====================================================

SELECT 
  'PART 3: Billing Cycles for This Subscription' as section,
  bc.id as cycle_id,
  bc.subscription_id,
  bc.cycle_number,
  bc.period_start,
  bc.period_end,
  bc.payment_transaction_id,
  bc.amount,
  bc.status,
  bc.is_autopay,
  bc.created_at,
  CASE 
    WHEN bc.payment_transaction_id IS NOT NULL THEN '✅ LINKED TO PAYMENT'
    ELSE '❌ NO PAYMENT LINK'
  END as payment_link
FROM public.billing_cycles bc
WHERE bc.subscription_id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9'
ORDER BY bc.cycle_number;

-- =====================================================
-- PART 4: Check if there are ANY payment transactions for this user
-- =====================================================

SELECT 
  'PART 4: ALL Payment Transactions for This User' as section,
  pt.*,
  CASE 
    WHEN pt.created_at >= '2026-01-17 14:00:00'::timestamptz 
     AND pt.created_at <= '2026-01-17 14:10:00'::timestamptz 
    THEN '⏰ SAME TIME AS SUBSCRIPTION'
    ELSE '⏰ Different time'
  END as timing_match
FROM public.payment_transactions pt
WHERE pt.user_id = 'c66cf9bb-12ea-4962-8fca-6f6a945ad569'
ORDER BY pt.created_at DESC;

-- =====================================================
-- PART 5: DIAGNOSIS - What went wrong?
-- =====================================================

DO $$
DECLARE
  has_payment_transaction BOOLEAN;
  has_billing_cycle BOOLEAN;
  has_razorpay_sub_id BOOLEAN;
  payment_count INTEGER;
  subscription_created_at TIMESTAMPTZ;
BEGIN
  -- Check if payment transaction exists
  SELECT EXISTS (
    SELECT 1 FROM public.payment_transactions
    WHERE subscription_id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9'
  ) INTO has_payment_transaction;
  
  -- Check if billing cycle exists
  SELECT EXISTS (
    SELECT 1 FROM public.billing_cycles
    WHERE subscription_id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9'
  ) INTO has_billing_cycle;
  
  -- Check if subscription has razorpay_subscription_id
  SELECT 
    razorpay_subscription_id IS NOT NULL,
    created_at
  INTO has_razorpay_sub_id, subscription_created_at
  FROM public.user_subscriptions
  WHERE id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9';
  
  -- Count total payments for this user around this time
  SELECT COUNT(*) INTO payment_count
  FROM public.payment_transactions
  WHERE user_id = 'c66cf9bb-12ea-4962-8fca-6f6a945ad569'
    AND created_at >= subscription_created_at - INTERVAL '5 minutes'
    AND created_at <= subscription_created_at + INTERVAL '5 minutes';
  
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSIS: HOW WAS THIS SUBSCRIPTION CREATED?';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Subscription Created: %', subscription_created_at;
  RAISE NOTICE 'Has payment transaction: %', CASE WHEN has_payment_transaction THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE 'Has billing cycle: %', CASE WHEN has_billing_cycle THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE 'Has razorpay_subscription_id: %', CASE WHEN has_razorpay_sub_id THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE 'Payments around same time: %', payment_count;
  RAISE NOTICE '';
  
  -- Determine what happened
  IF NOT has_payment_transaction AND NOT has_billing_cycle AND NOT has_razorpay_sub_id THEN
    RAISE NOTICE '❌ CRITICAL: Subscription created WITHOUT going through payment flow!';
    RAISE NOTICE '   This means:';
    RAISE NOTICE '   1. Payment was NOT verified';
    RAISE NOTICE '   2. No payment transaction recorded';
    RAISE NOTICE '   3. No billing cycle created';
    RAISE NOTICE '   4. No Razorpay subscription ID captured';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ POSSIBLE CAUSES:';
    RAISE NOTICE '   A. Subscription created by FREE/TRIAL signup (not paid)';
    RAISE NOTICE '   B. Payment verify endpoint (/api/payment/verify) was NOT called';
    RAISE NOTICE '   C. Subscription created manually via SQL or another code path';
    RAISE NOTICE '   D. Payment flow error - payment succeeded but verify failed';
  ELSIF has_payment_transaction AND NOT has_razorpay_sub_id THEN
    RAISE NOTICE '⚠️ PARTIAL: Payment recorded but subscription metadata missing';
    RAISE NOTICE '   The /api/payment/verify endpoint may have failed partway through';
  ELSIF has_razorpay_sub_id THEN
    RAISE NOTICE '✅ GOOD: Subscription has Razorpay ID, payment flow completed';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔧 RECOMMENDED FIX:';
  RAISE NOTICE '   If user actually paid, find the payment transaction and UPDATE subscription';
  RAISE NOTICE '   If this was free/trial, current state is correct (no autopay needed)';
  RAISE NOTICE '   If payment failed, subscription should be cancelled';
END $$;
