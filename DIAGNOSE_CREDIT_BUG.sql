-- 🔍 DIAGNOSE CREDIT DEDUCTION BUG
-- Check if credits are being deducted but subscriptions not created

-- =====================================================
-- PART 1: Show all investment advisor credit records
-- =====================================================

SELECT 
  'PART 1: All Advisor Credits' as section,
  ac.advisor_user_id,
  up.name as advisor_name,
  au.email as advisor_email,
  ac.credits_purchased,
  ac.credits_available,
  ac.credits_used,
  (ac.credits_purchased - ac.credits_available) as credits_deducted_total
FROM public.advisor_credits ac
LEFT JOIN auth.users au ON au.id = ac.advisor_user_id
LEFT JOIN public.user_profiles up ON up.auth_user_id = ac.advisor_user_id
ORDER BY ac.created_at DESC;

-- =====================================================
-- PART 2: Show all credit assignments (active or not)
-- =====================================================

SELECT 
  'PART 2: All Credit Assignments' as section,
  aca.id as assignment_id,
  aca.advisor_user_id,
  adv_up.name as advisor_name,
  aca.startup_user_id,
  startup_up.name as startup_name,
  aca.status,
  aca.subscription_id,
  aca.assigned_at,
  aca.expired_at,
  aca.auto_renewal_enabled,
  CASE 
    WHEN aca.subscription_id IS NOT NULL THEN '✅ HAS SUBSCRIPTION'
    ELSE '❌ NO SUBSCRIPTION'
  END as has_subscription
FROM public.advisor_credit_assignments aca
LEFT JOIN public.user_profiles adv_up ON adv_up.auth_user_id = aca.advisor_user_id
LEFT JOIN public.user_profiles startup_up ON startup_up.auth_user_id = aca.startup_user_id
ORDER BY aca.assigned_at DESC;

-- =====================================================
-- PART 3: Show all subscriptions (advisor-paid or not)
-- =====================================================

SELECT 
  'PART 3: All Subscriptions' as section,
  s.id as subscription_id,
  s.user_id as startup_profile_id,
  s.plan_id,
  s.plan_tier,
  s.status,
  s.paid_by_advisor_id,
  adv_up.name as paid_by_advisor_name,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  CASE 
    WHEN s.paid_by_advisor_id IS NOT NULL THEN '✅ ADVISOR-PAID'
    ELSE '💰 SELF-PAID'
  END as payment_type
FROM public.user_subscriptions s
LEFT JOIN public.user_profiles adv_up ON adv_up.auth_user_id = s.paid_by_advisor_id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;

-- =====================================================
-- PART 4: MISMATCH - Assignments without subscriptions
-- =====================================================

SELECT 
  'PART 4: ❌ ASSIGNMENTS WITHOUT SUBSCRIPTIONS' as section,
  aca.id as assignment_id,
  aca.advisor_user_id,
  adv_up.name as advisor_name,
  aca.startup_user_id,
  startup_up.name as startup_name,
  aca.status,
  aca.assigned_at,
  aca.expired_at,
  '❌ CREDIT DEDUCTED BUT NO SUBSCRIPTION CREATED!' as issue
FROM public.advisor_credit_assignments aca
LEFT JOIN public.user_profiles adv_up ON adv_up.auth_user_id = aca.advisor_user_id
LEFT JOIN public.user_profiles startup_up ON startup_up.auth_user_id = aca.startup_user_id
WHERE aca.subscription_id IS NULL
  AND aca.status = 'active'
ORDER BY aca.assigned_at DESC;

-- =====================================================
-- PART 5: Check if premium plan exists now
-- =====================================================

SELECT 
  'PART 5: Premium Plan Check' as section,
  id,
  name,
  price,
  currency,
  plan_tier,
  user_type,
  "interval",
  is_active,
  CASE 
    WHEN plan_tier = 'premium' THEN '✅ WILL BE FOUND'
    WHEN plan_tier IS NULL THEN '❌ NULL - WILL NOT BE FOUND'
    ELSE '⚠️ ' || plan_tier
  END as status
FROM public.subscription_plans
WHERE user_type = 'Startup'
  AND "interval" = 'monthly'
  AND is_active = true
ORDER BY created_at;

-- =====================================================
-- PART 6: SUMMARY - What's the issue?
-- =====================================================

DO $$
DECLARE
  total_credits_deducted INTEGER;
  total_active_assignments INTEGER;
  assignments_without_subs INTEGER;
  premium_plan_exists BOOLEAN;
BEGIN
  -- Count total credits deducted
  SELECT COALESCE(SUM(credits_used), 0) INTO total_credits_deducted
  FROM public.advisor_credits;
  
  -- Count active assignments
  SELECT COUNT(*) INTO total_active_assignments
  FROM public.advisor_credit_assignments
  WHERE status = 'active';
  
  -- Count assignments without subscriptions
  SELECT COUNT(*) INTO assignments_without_subs
  FROM public.advisor_credit_assignments
  WHERE status = 'active' AND subscription_id IS NULL;
  
  -- Check if premium plan exists
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_plans
    WHERE user_type = 'Startup'
      AND plan_tier = 'premium'
      AND "interval" = 'monthly'
      AND is_active = true
  ) INTO premium_plan_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '📊 SUMMARY';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE 'Total credits deducted: %', total_credits_deducted;
  RAISE NOTICE 'Active assignments: %', total_active_assignments;
  RAISE NOTICE 'Assignments WITHOUT subscriptions: % ❌', assignments_without_subs;
  RAISE NOTICE 'Premium plan exists: %', CASE WHEN premium_plan_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '';
  
  IF assignments_without_subs > 0 THEN
    IF premium_plan_exists THEN
      RAISE NOTICE '⚠️ ISSUE: % assignments exist but subscriptions were NOT created', assignments_without_subs;
      RAISE NOTICE '   Plan exists NOW, but may have been NULL when assignments were created.';
      RAISE NOTICE '   Solution: Re-trigger subscription creation for these assignments.';
    ELSE
      RAISE NOTICE '❌ CRITICAL: Premium plan with plan_tier = ''premium'' does NOT exist!';
      RAISE NOTICE '   Run CHECK_AND_FIX_REMAINING_PLANS.sql FIRST!';
    END IF;
  ELSE
    RAISE NOTICE '✅ ALL GOOD! All assignments have subscriptions.';
  END IF;
END $$;
