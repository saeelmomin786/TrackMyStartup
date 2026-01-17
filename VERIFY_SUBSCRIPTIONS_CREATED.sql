-- 🔍 VERIFY: Where Are Advisor-Paid Subscriptions Being Created?

-- =====================================================
-- SECTION 1: Check if subscriptions were created
-- =====================================================

-- How many subscriptions have paid_by_advisor_id (advisor-paid)?
SELECT 
  'ADVISOR-PAID SUBSCRIPTIONS' as section,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_startups,
  COUNT(DISTINCT paid_by_advisor_id) as unique_advisors
FROM public.user_subscriptions
WHERE paid_by_advisor_id IS NOT NULL;

-- =====================================================
-- SECTION 2: Show all advisor-paid subscriptions
-- =====================================================

SELECT 
  'ALL ADVISOR-PAID SUBSCRIPTIONS' as section,
  us.id as subscription_id,
  us.user_id as startup_profile_id,
  us.paid_by_advisor_id as advisor_auth_user_id,
  us.plan_tier,
  us.status,
  us.amount,
  us.currency,
  us.current_period_start,
  us.current_period_end,
  us.created_at,
  us.updated_at
FROM public.user_subscriptions us
WHERE us.paid_by_advisor_id IS NOT NULL
ORDER BY us.created_at DESC
LIMIT 20;

-- =====================================================
-- SECTION 3: Check credit assignments
-- =====================================================

SELECT 
  'CREDIT ASSIGNMENTS' as section,
  COUNT(*) as total,
  COUNT(DISTINCT advisor_user_id) as unique_advisors,
  COUNT(DISTINCT startup_user_id) as unique_startups
FROM public.advisor_credit_assignments;

-- =====================================================
-- SECTION 4: Show all active credit assignments
-- =====================================================

SELECT 
  'ALL CREDIT ASSIGNMENTS' as section,
  id as assignment_id,
  advisor_user_id,
  startup_user_id,
  start_date,
  end_date,
  status,
  auto_renewal_enabled,
  subscription_id,
  assigned_at
FROM public.advisor_credit_assignments
WHERE status = 'active'
ORDER BY assigned_at DESC
LIMIT 20;

-- =====================================================
-- SECTION 5: Match Assignments to Subscriptions
-- =====================================================

SELECT 
  'MATCHING ASSIGNMENTS TO SUBSCRIPTIONS' as section,
  aca.id as assignment_id,
  aca.subscription_id as linked_subscription_id,
  us.id as actual_subscription_id,
  CASE 
    WHEN aca.subscription_id = us.id THEN '✅ LINKED'
    WHEN us.id IS NOT NULL THEN '⚠️ EXISTS BUT NOT LINKED'
    ELSE '❌ MISSING'
  END as link_status,
  aca.advisor_user_id,
  aca.startup_user_id,
  us.user_id as subscription_startup_id,
  us.paid_by_advisor_id
FROM public.advisor_credit_assignments aca
LEFT JOIN public.user_subscriptions us ON aca.subscription_id = us.id
ORDER BY aca.assigned_at DESC
LIMIT 20;

-- =====================================================
-- SECTION 6: Find Missing Links
-- =====================================================

SELECT 
  'ASSIGNMENTS WITHOUT SUBSCRIPTION_ID' as section,
  COUNT(*) as missing_count
FROM public.advisor_credit_assignments
WHERE subscription_id IS NULL
  AND status = 'active';

-- =====================================================
-- SECTION 7: Check if subscriptions exist for assignments
-- =====================================================

-- For each active assignment, check if there's a corresponding subscription
SELECT 
  'SUBSCRIPTIONS FOR ASSIGNMENTS' as section,
  COUNT(DISTINCT CASE 
    WHEN us.id IS NOT NULL THEN 1 
  END) as have_subscription,
  COUNT(DISTINCT CASE 
    WHEN us.id IS NULL THEN 1 
  END) as missing_subscription,
  COUNT(*) as total_assignments
FROM public.advisor_credit_assignments aca
LEFT JOIN public.user_subscriptions us ON (
  us.user_id = aca.startup_user_id 
  AND us.paid_by_advisor_id = aca.advisor_user_id
  AND us.status = 'active'
)
WHERE aca.status = 'active';

-- =====================================================
-- DETAILED DIAGNOSTIC: Show exactly what's happening
-- =====================================================

SELECT 
  'DIAGNOSTIC: Each Assignment & Its Subscription' as section,
  aca.id as assignment_id,
  aca.advisor_user_id,
  aca.startup_user_id,
  aca.status as assignment_status,
  aca.subscription_id as linked_sub_id,
  us.id as actual_subscription_id,
  us.plan_tier,
  us.status as subscription_status,
  us.current_period_end,
  us.paid_by_advisor_id,
  CASE 
    WHEN us.id IS NULL THEN '❌ NO SUBSCRIPTION FOUND!'
    WHEN aca.subscription_id != us.id THEN '⚠️ SUBSCRIPTION EXISTS BUT NOT LINKED IN ASSIGNMENT'
    WHEN us.paid_by_advisor_id != aca.advisor_user_id THEN '⚠️ WRONG ADVISOR ID'
    ELSE '✅ ALL GOOD'
  END as issue
FROM public.advisor_credit_assignments aca
LEFT JOIN public.user_subscriptions us ON (
  us.user_id = aca.startup_user_id 
  AND us.paid_by_advisor_id = aca.advisor_user_id
  AND us.status = 'active'
)
WHERE aca.status = 'active'
ORDER BY aca.assigned_at DESC;
