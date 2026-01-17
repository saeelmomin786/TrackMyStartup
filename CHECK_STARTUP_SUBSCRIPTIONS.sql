-- 🔍 CHECK SUBSCRIPTION STATUS FOR SPECIFIC STARTUPS
-- Based on console logs showing two different startups

-- =====================================================
-- PART 1: Find user_profiles for these email addresses
-- =====================================================

SELECT 
  'PART 1: User Profiles' as section,
  up.id as profile_id,
  up.auth_user_id,
  au.email,
  up.name as user_name,
  up.user_type,
  up.investment_advisor_code
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.auth_user_id
WHERE au.email IN (
  'sarveshgadkari.agri@gmail.com',
  'sarveshgadkari1234@gmail.com'
)
ORDER BY au.email;

-- =====================================================
-- PART 2: Check ALL subscriptions for these users
-- =====================================================

-- Using profile IDs from the logs
WITH target_users AS (
  SELECT 
    up.id as profile_id,
    up.auth_user_id,
    au.email,
    up.name
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.auth_user_id
  WHERE au.email IN (
    'sarveshgadkari.agri@gmail.com',
    'sarveshgadkari1234@gmail.com'
  )
)
SELECT 
  'PART 2: All Subscriptions for These Users' as section,
  tu.email,
  tu.name as user_name,
  tu.profile_id,
  tu.auth_user_id,
  s.id as subscription_id,
  s.plan_id,
  s.plan_tier,
  s.status,
  s.paid_by_advisor_id,
  advisor_up.name as paid_by_advisor_name,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  CASE 
    WHEN s.paid_by_advisor_id IS NOT NULL THEN '✅ ADVISOR-PAID'
    ELSE '💰 SELF-PAID'
  END as payment_type,
  CASE 
    WHEN s.current_period_end < NOW() THEN '❌ EXPIRED'
    WHEN s.status = 'active' AND s.current_period_end >= NOW() THEN '✅ ACTIVE'
    ELSE '⚠️ ' || s.status
  END as subscription_status
FROM target_users tu
LEFT JOIN public.user_subscriptions s ON s.user_id = tu.profile_id
LEFT JOIN public.user_profiles advisor_up ON advisor_up.auth_user_id = s.paid_by_advisor_id
ORDER BY tu.email, s.created_at DESC;

-- =====================================================
-- PART 3: Check credit assignments for these users
-- =====================================================

WITH target_users AS (
  SELECT 
    up.id as profile_id,
    up.auth_user_id,
    au.email,
    up.name
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.auth_user_id
  WHERE au.email IN (
    'sarveshgadkari.agri@gmail.com',
    'sarveshgadkari1234@gmail.com'
  )
)
SELECT 
  'PART 3: Credit Assignments for These Users' as section,
  tu.email,
  tu.name as user_name,
  aca.id as assignment_id,
  aca.advisor_user_id,
  advisor_up.name as advisor_name,
  aca.subscription_id,
  aca.status,
  aca.assigned_at,
  aca.expired_at,
  aca.auto_renewal_enabled,
  CASE 
    WHEN aca.subscription_id IS NOT NULL THEN '✅ HAS SUBSCRIPTION'
    ELSE '❌ NO SUBSCRIPTION LINKED'
  END as has_subscription
FROM target_users tu
LEFT JOIN public.advisor_credit_assignments aca ON aca.startup_user_id = tu.auth_user_id
LEFT JOIN public.user_profiles advisor_up ON advisor_up.auth_user_id = aca.advisor_user_id
ORDER BY tu.email, aca.assigned_at DESC;

-- =====================================================
-- PART 4: Check their investment advisors
-- =====================================================

WITH target_users AS (
  SELECT 
    up.id as profile_id,
    up.auth_user_id,
    au.email,
    up.name,
    up.investment_advisor_code
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.auth_user_id
  WHERE au.email IN (
    'sarveshgadkari.agri@gmail.com',
    'sarveshgadkari1234@gmail.com'
  )
)
SELECT 
  'PART 4: Investment Advisors Assigned' as section,
  tu.email,
  tu.name as user_name,
  tu.investment_advisor_code,
  advisor_up.name as advisor_name,
  advisor_up.firm_name as advisor_firm_name,
  advisor_au.email as advisor_email
FROM target_users tu
LEFT JOIN public.user_profiles advisor_up 
  ON advisor_up.investment_advisor_code = tu.investment_advisor_code
  AND advisor_up.user_type = 'Investment Advisor'
LEFT JOIN auth.users advisor_au ON advisor_au.id = advisor_up.auth_user_id
ORDER BY tu.email;

-- =====================================================
-- PART 5: SUMMARY - What's their current status?
-- =====================================================

DO $$
DECLARE
  user1_email TEXT := 'sarveshgadkari.agri@gmail.com';
  user2_email TEXT := 'sarveshgadkari1234@gmail.com';
  user1_plan TEXT;
  user2_plan TEXT;
  user1_paid_by TEXT;
  user2_paid_by TEXT;
BEGIN
  -- Check user 1
  SELECT s.plan_tier, 
    CASE 
      WHEN s.paid_by_advisor_id IS NOT NULL THEN 'advisor-paid'
      ELSE 'self-paid'
    END
  INTO user1_plan, user1_paid_by
  FROM auth.users au
  JOIN public.user_profiles up ON up.auth_user_id = au.id
  LEFT JOIN public.user_subscriptions s ON s.user_id = up.id
  WHERE au.email = user1_email
    AND s.status = 'active'
    AND s.current_period_end >= NOW()
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Check user 2
  SELECT s.plan_tier,
    CASE 
      WHEN s.paid_by_advisor_id IS NOT NULL THEN 'advisor-paid'
      ELSE 'self-paid'
    END
  INTO user2_plan, user2_paid_by
  FROM auth.users au
  JOIN public.user_profiles up ON up.auth_user_id = au.id
  LEFT JOIN public.user_subscriptions s ON s.user_id = up.id
  WHERE au.email = user2_email
    AND s.status = 'active'
    AND s.current_period_end >= NOW()
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '📊 SUBSCRIPTION STATUS SUMMARY';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE 'Startup 1: % (test1)', user1_email;
  RAISE NOTICE '  Plan: % (%)', COALESCE(user1_plan, 'NO ACTIVE SUBSCRIPTION'), COALESCE(user1_paid_by, 'N/A');
  RAISE NOTICE '';
  RAISE NOTICE 'Startup 2: % (MULSETU)', user2_email;
  RAISE NOTICE '  Plan: % (%)', COALESCE(user2_plan, 'NO ACTIVE SUBSCRIPTION'), COALESCE(user2_paid_by, 'N/A');
  RAISE NOTICE '';
  
  -- Check if they match console logs
  IF user1_plan = 'premium' THEN
    RAISE NOTICE '✅ Startup 1: Matches console log (premium)';
  ELSE
    RAISE NOTICE '❌ Startup 1: Does NOT match console log (expected premium, got %)', COALESCE(user1_plan, 'none');
  END IF;
  
  IF user2_plan = 'free' THEN
    RAISE NOTICE '✅ Startup 2: Matches console log (free)';
  ELSE
    RAISE NOTICE '❌ Startup 2: Does NOT match console log (expected free, got %)', COALESCE(user2_plan, 'none');
  END IF;
END $$;
