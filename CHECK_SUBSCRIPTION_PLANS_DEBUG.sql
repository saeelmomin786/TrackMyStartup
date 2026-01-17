-- 🔍 DEBUG: Check Subscription Plans in Database

-- COUNT total plans
SELECT 'Total Plans' as metric, COUNT(*)::TEXT as count FROM public.subscription_plans;

-- COUNT plans for Startup
SELECT 'Startup Plans' as metric, COUNT(*)::TEXT as count FROM public.subscription_plans WHERE user_type = 'Startup';

-- COUNT plans with plan_tier set
SELECT 'Plans with plan_tier' as metric, COUNT(*)::TEXT as count FROM public.subscription_plans WHERE plan_tier IS NOT NULL;

-- COUNT premium plans
SELECT 'Premium Plans' as metric, COUNT(*)::TEXT as count FROM public.subscription_plans WHERE plan_tier = 'premium';

-- =====================================================
-- DETAIL: Show ALL Startup Plans
-- =====================================================
SELECT 
  'ALL STARTUP PLANS' as section,
  id,
  name,
  price,
  currency,
  "interval",
  user_type,
  country,
  plan_tier,
  is_active,
  created_at
FROM public.subscription_plans
WHERE user_type = 'Startup'
ORDER BY country, "interval", is_active DESC;

-- =====================================================
-- DETAIL: Show Premium Plans (what code is looking for)
-- =====================================================
SELECT 
  'PREMIUM PLANS (Plan_tier="premium")' as section,
  id,
  name,
  price,
  currency,
  "interval",
  user_type,
  country,
  plan_tier,
  is_active
FROM public.subscription_plans
WHERE plan_tier = 'premium' 
  AND user_type = 'Startup'
  AND "interval" = 'monthly'
  AND is_active = true;

-- =====================================================
-- DETAIL: Show what would match if we remove plan_tier filter
-- =====================================================
SELECT 
  'MONTHLY STARTUP PLANS (no plan_tier filter)' as section,
  id,
  name,
  price,
  currency,
  "interval",
  user_type,
  country,
  plan_tier,
  is_active
FROM public.subscription_plans
WHERE user_type = 'Startup'
  AND "interval" = 'monthly'
  AND is_active = true;

-- =====================================================
-- ACTION NEEDED: If no premium plans found, run this
-- =====================================================
-- UPDATE plans to set plan_tier
UPDATE public.subscription_plans
SET plan_tier = CASE 
  WHEN "interval" = 'monthly' THEN 'premium'
  ELSE 'premium'
END
WHERE user_type = 'Startup' 
  AND is_active = true
  AND plan_tier IS NULL;

-- Verify update
SELECT 
  'VERIFICATION: Updated Plans' as section,
  id,
  name,
  plan_tier,
  user_type,
  "interval"
FROM public.subscription_plans
WHERE user_type = 'Startup'
  AND plan_tier IS NOT NULL
ORDER BY country, "interval";
