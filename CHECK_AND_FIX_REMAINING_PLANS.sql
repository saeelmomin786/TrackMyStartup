-- 🔍 CHECK: Which Startup plan is still missing plan_tier = 'premium'?

-- Show ALL Startup plans with their plan_tier status
SELECT 
  'ALL STARTUP PLANS' as section,
  id,
  name,
  price,
  currency,
  "interval",
  plan_tier,
  is_active,
  CASE 
    WHEN plan_tier = 'premium' THEN '✅ GOOD'
    WHEN plan_tier IS NULL THEN '❌ NULL - NEEDS FIX'
    ELSE '⚠️ ' || plan_tier
  END as status
FROM public.subscription_plans
WHERE user_type = 'Startup'
ORDER BY "interval", created_at;

-- =====================================================
-- FIX: Set plan_tier on ANY remaining NULL plans
-- =====================================================

UPDATE public.subscription_plans
SET plan_tier = 'premium'
WHERE user_type = 'Startup' 
  AND is_active = true
  AND plan_tier IS NULL;

-- =====================================================
-- VERIFY: All should now be premium
-- =====================================================

SELECT 
  'AFTER FIX: All Startup Plans' as section,
  COUNT(*) as total,
  COUNT(CASE WHEN plan_tier = 'premium' THEN 1 END) as premium_tier_count,
  COUNT(CASE WHEN plan_tier IS NULL THEN 1 END) as null_tier_count
FROM public.subscription_plans
WHERE user_type = 'Startup' AND is_active = true;

-- =====================================================
-- FINAL: Show what will be found
-- =====================================================

SELECT 
  'FINAL: Plans that will be found by code' as section,
  id,
  name,
  price,
  currency,
  plan_tier
FROM public.subscription_plans
WHERE plan_tier = 'premium'
  AND user_type = 'Startup'
  AND "interval" = 'monthly'
  AND is_active = true;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  missing_count INTEGER;
  total_plans INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.subscription_plans
  WHERE user_type = 'Startup' AND is_active = true AND plan_tier IS NULL;
  
  SELECT COUNT(*) INTO total_plans
  FROM public.subscription_plans
  WHERE user_type = 'Startup' AND is_active = true;
  
  IF missing_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS! All % startup plans have plan_tier = premium', total_plans;
    RAISE NOTICE '✅ Advisor subscriptions will NOW be created!';
  ELSE
    RAISE WARNING '⚠️ PROBLEM: % plans still missing plan_tier', missing_count;
  END IF;
END $$;
