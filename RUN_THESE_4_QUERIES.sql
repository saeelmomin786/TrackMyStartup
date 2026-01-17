-- Run these queries ONE BY ONE in Supabase

-- =====================================================
-- QUERY 1: Check payment transactions
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
-- QUERY 2: Check billing cycles
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
-- QUERY 3: Check ALL payments for this user
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
-- QUERY 4: DIAGNOSIS
-- =====================================================

DO $$
DECLARE
  has_payment_transaction BOOLEAN;
  has_billing_cycle BOOLEAN;
  has_razorpay_sub_id BOOLEAN;
  payment_count INTEGER;
  subscription_created_at TIMESTAMPTZ;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.payment_transactions
    WHERE subscription_id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9'
  ) INTO has_payment_transaction;
  
  SELECT EXISTS (
    SELECT 1 FROM public.billing_cycles
    WHERE subscription_id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9'
  ) INTO has_billing_cycle;
  
  SELECT 
    razorpay_subscription_id IS NOT NULL,
    created_at
  INTO has_razorpay_sub_id, subscription_created_at
  FROM public.user_subscriptions
  WHERE id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9';
  
  SELECT COUNT(*) INTO payment_count
  FROM public.payment_transactions
  WHERE user_id = 'c66cf9bb-12ea-4962-8fca-6f6a945ad569'
    AND created_at >= subscription_created_at - INTERVAL '5 minutes'
    AND created_at <= subscription_created_at + INTERVAL '5 minutes';
  
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSIS: HOW WAS THIS SUBSCRIPTION CREATED?';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE 'Subscription Created: %', subscription_created_at;
  RAISE NOTICE 'Has payment transaction: %', CASE WHEN has_payment_transaction THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE 'Has billing cycle: %', CASE WHEN has_billing_cycle THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE 'Has razorpay_subscription_id: %', CASE WHEN has_razorpay_sub_id THEN 'YES ✅' ELSE 'NO ❌' END;
  RAISE NOTICE 'Payments around same time: %', payment_count;
  RAISE NOTICE '';
  
  IF NOT has_payment_transaction AND NOT has_billing_cycle AND NOT has_razorpay_sub_id THEN
    RAISE NOTICE '❌ CRITICAL: Subscription created WITHOUT going through payment flow!';
    RAISE NOTICE '   Possible causes:';
    RAISE NOTICE '   A. FREE/TRIAL signup (not paid)';
    RAISE NOTICE '   B. Payment verify endpoint NOT called';
    RAISE NOTICE '   C. Manual SQL insert';
    RAISE NOTICE '   D. Payment succeeded but verify failed';
  ELSIF has_payment_transaction AND NOT has_razorpay_sub_id THEN
    RAISE NOTICE '⚠️ PARTIAL: Payment recorded but subscription metadata missing';
  ELSIF has_razorpay_sub_id THEN
    RAISE NOTICE '✅ GOOD: Subscription has Razorpay ID';
  END IF;
END $$;
