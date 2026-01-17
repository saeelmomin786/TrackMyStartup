-- 🔧 FIX: Update subscription plans to have plan_tier = 'premium'

-- =====================================================
-- STEP 1: Show current state
-- =====================================================

SELECT 
  'BEFORE FIX: Startup Plans' as section,
  COUNT(*) as total,
  COUNT(CASE WHEN plan_tier = 'premium' THEN 1 END) as with_premium_tier,
  COUNT(CASE WHEN plan_tier IS NULL THEN 1 END) as with_null_tier
FROM public.subscription_plans
WHERE user_type = 'Startup' AND is_active = true;

-- =====================================================
-- STEP 2: Update all active Startup plans to have plan_tier = 'premium'
-- =====================================================

UPDATE public.subscription_plans
SET 
  plan_tier = 'premium',
  updated_at = NOW()
WHERE user_type = 'Startup' 
  AND is_active = true
  AND plan_tier IS NULL;

-- =====================================================
-- STEP 3: Verify the fix
-- =====================================================

SELECT 
  'AFTER FIX: Startup Plans with plan_tier' as section,
  id,
  name,
  price,
  currency,
  "interval",
  plan_tier,
  user_type,
  country,
  is_active,
  created_at
FROM public.subscription_plans
WHERE user_type = 'Startup' 
  AND is_active = true
  AND plan_tier = 'premium'
ORDER BY country, "interval";

-- =====================================================
-- STEP 4: Verify the query now works
-- =====================================================

SELECT 
  'QUERY TEST: What advisorCreditService will find' as section,
  id,
  name,
  price,
  currency,
  plan_tier
FROM public.subscription_plans
WHERE plan_tier = 'premium'
  AND user_type = 'Startup'
  AND "interval" = 'monthly'
  AND is_active = true
LIMIT 1;

-- =====================================================
-- STEP 5: Show results
-- =====================================================

SELECT 
  'FINAL CHECK: Startup Plans Summary' as section,
  COUNT(*) as total_plans,
  COUNT(CASE WHEN plan_tier = 'premium' THEN 1 END) as premium_plans,
  COUNT(CASE WHEN user_type = 'Startup' THEN 1 END) as startup_plans,
  COUNT(CASE WHEN "interval" = 'monthly' THEN 1 END) as monthly_plans,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_plans
FROM public.subscription_plans
WHERE user_type = 'Startup' AND is_active = true;
