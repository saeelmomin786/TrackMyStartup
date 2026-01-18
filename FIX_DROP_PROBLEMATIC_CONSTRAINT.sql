-- ❌ DROP PROBLEMATIC CONSTRAINT THAT BLOCKS RE-SUBSCRIPTIONS
-- 
-- Problem: This constraint prevents users from EVER re-subscribing to the same plan
-- Example scenarios it breaks:
--   1. User has Basic → Cancels → Later wants Basic again → ERROR
--   2. User has Pro → Downgrades to Basic → Later upgrades to Pro → ERROR
--   3. User tries any plan they previously had → ERROR
--
-- Solution: Drop this constraint
-- We already have idx_user_subscriptions_user_id_active_unique which ensures
-- only ONE active subscription per user (which is what we actually want)

-- Drop the problematic unique constraint on (user_id, plan_id)
-- Note: It's a CONSTRAINT, not just an index
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_plan_id_key;

-- ✅ Verify it's gone
-- Run this to confirm:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'user_subscriptions';

-- ✅ What we keep (the good constraint):
-- idx_user_subscriptions_user_id_active_unique - ensures only 1 active subscription
-- This is sufficient to maintain data integrity

-- ✅ Expected behavior after fix:
-- User can have multiple subscriptions in history for same plan
-- But only ONE can be status='active' at any time
-- Example valid data after fix:
--   user_123 | Basic | inactive | 2025-01-01 (old)
--   user_123 | Pro   | inactive | 2025-06-01 (old)
--   user_123 | Basic | active   | 2026-01-15 (current) ✅ Now allowed!

COMMENT ON TABLE user_subscriptions IS 'Stores subscription history. Constraint allows multiple subscriptions per plan but only ONE active per user.';
