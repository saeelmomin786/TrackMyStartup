-- =====================================================
-- CHECK SUBSCRIPTION DUPLICATES & CONSTRAINT ISSUES
-- =====================================================

-- 1️⃣ CHECK: Verify the partial unique index exists
SELECT 'STEP 1: Verify Constraint' as diagnostic;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND indexname LIKE '%active_unique%';

-- 2️⃣ CHECK: Find users with MULTIPLE ACTIVE subscriptions (violating constraint)
SELECT 'STEP 2: Users with Duplicate ACTIVE Subscriptions' as diagnostic;
SELECT 
  user_id,
  COUNT(*) as active_count,
  STRING_AGG(id::text, ', ') as subscription_ids,
  STRING_AGG(plan_tier, ', ') as plan_tiers,
  MAX(created_at) as latest_created
FROM public.user_subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY active_count DESC;

-- 3️⃣ CHECK: Specific user (f03f6c31-aacf-4d24-b410-fe0601ecff2d) subscription history
SELECT 'STEP 3: Subscription History for f03f6c31-aacf-4d24-b410-fe0601ecff2d' as diagnostic;
SELECT 
  id,
  user_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
FROM public.user_subscriptions
WHERE user_id = 'f03f6c31-aacf-4d24-b410-fe0601ecff2d'
ORDER BY created_at DESC;

-- 4️⃣ CHECK: Count of subscriptions per status for this user
SELECT 'STEP 4: Subscription Count by Status' as diagnostic;
SELECT 
  status,
  COUNT(*) as count
FROM public.user_subscriptions
WHERE user_id = 'f03f6c31-aacf-4d24-b410-fe0601ecff2d'
GROUP BY status;

-- 5️⃣ CHECK: All users with their subscription counts
SELECT 'STEP 5: All Users - Active Subscription Count' as diagnostic;
SELECT 
  user_id,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
  COUNT(*) as total_subscriptions
FROM public.user_subscriptions
GROUP BY user_id
ORDER BY active_count DESC, total_subscriptions DESC;

-- 6️⃣ CHECK: Verify table structure
SELECT 'STEP 6: user_subscriptions Table Structure' as diagnostic;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 7️⃣ CHECK: All constraints on user_subscriptions
SELECT 'STEP 7: All Constraints & Indexes' as diagnostic;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
ORDER BY indexname;
