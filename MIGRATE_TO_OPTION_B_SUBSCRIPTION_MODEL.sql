-- ============================================================================
-- MIGRATE TO OPTION B: AUDIT TRAIL WITH ONE ACTIVE SUBSCRIPTION PER USER
-- ============================================================================
-- This migration enables proper upgrade flow (Basic → Premium)
-- and keeps audit trail of subscription history
--
-- Flow:
-- 1. User has 'basic' subscription with status='active'
-- 2. User upgrades to 'premium'
-- 3. Old 'basic' subscription marked as status='inactive'
-- 4. New 'premium' subscription inserted with status='active'
-- ============================================================================

-- STEP 1: Remove old unique index (if it exists)
DROP INDEX IF EXISTS idx_user_subscriptions_user_id_unique;

-- STEP 2: Clean up duplicates - keep only the most recent per user per status
-- Preview duplicates first
SELECT 'PREVIEW: Users with multiple ACTIVE subscriptions' as step;
SELECT 
  user_id, 
  COUNT(*) as cnt,
  STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as ids
FROM public.user_subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- Mark old duplicates as 'inactive' (keep most recent active)
WITH ranked AS (
  SELECT 
    id, 
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.user_subscriptions
  WHERE status = 'active'
)
UPDATE public.user_subscriptions us
SET 
  status = 'inactive',
  updated_at = now()
FROM ranked r
WHERE us.id = r.id 
  AND r.rn > 1;

-- STEP 3: Create partial unique index (only enforces uniqueness for active subscriptions)
-- This allows multiple inactive rows (audit history) but only one active per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_active_unique
ON public.user_subscriptions (user_id)
WHERE status = 'active';

-- STEP 4: Verify the index was created
SELECT 'VERIFICATION: Partial unique index created' as step;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND indexname = 'idx_user_subscriptions_user_id_active_unique';

-- STEP 5: Verify no active duplicates exist
SELECT 'VERIFICATION: Active subscriptions per user' as step;
SELECT 
  user_id,
  COUNT(*) as active_count,
  STRING_AGG(plan_tier, ', ') as plan_tiers
FROM public.user_subscriptions
WHERE status = 'active'
GROUP BY user_id
ORDER BY user_id;

-- STEP 6: Show audit trail example (one user with multiple subscription history)
SELECT 'AUDIT TRAIL EXAMPLE: One user with subscription history' as step;
SELECT 
  user_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
FROM public.user_subscriptions
WHERE user_id = (
  SELECT user_id 
  FROM public.user_subscriptions 
  GROUP BY user_id 
  HAVING COUNT(*) > 1 
  LIMIT 1
)
ORDER BY created_at DESC;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '✅ MIGRATION COMPLETE' as result;
SELECT 'Partial unique index created on (user_id) WHERE status=''active''' as summary_1;
SELECT 'Duplicate active subscriptions marked as inactive' as summary_2;
SELECT 'Users now have audit trail of all past subscriptions' as summary_3;
SELECT 'Only ONE active subscription per user is enforced' as summary_4;
