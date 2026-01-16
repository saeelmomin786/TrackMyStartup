-- FIX_NULL_PLAN_TIER.sql
-- Preview rows with NULL plan_tier
SELECT id, user_id, plan_id, plan_tier, status, created_at
FROM public.user_subscriptions
WHERE plan_tier IS NULL
ORDER BY created_at DESC;

-- 1) Set plan_tier from subscription_plans when plan_id exists
UPDATE public.user_subscriptions us
SET plan_tier = COALESCE(sp.plan_tier, 'free'),
    updated_at = now()
FROM public.subscription_plans sp
WHERE us.plan_tier IS NULL
  AND us.plan_id IS NOT NULL
  AND us.plan_id = sp.id;

-- 2) Default any remaining NULL plan_tier to 'free'
UPDATE public.user_subscriptions
SET plan_tier = 'free', updated_at = now()
WHERE plan_tier IS NULL;

-- Verify results
SELECT id, user_id, plan_id, plan_tier, status, created_at, updated_at
FROM public.user_subscriptions
WHERE id IN (
  SELECT id FROM public.user_subscriptions WHERE created_at >= now() - interval '30 days' ORDER BY created_at DESC LIMIT 50
)
ORDER BY created_at DESC;
