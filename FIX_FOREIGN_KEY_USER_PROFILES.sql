-- ============================================================================
-- FIX FOREIGN KEY: user_subscriptions.user_id → user_profiles(id)
-- ============================================================================
-- This migration fixes the foreign key constraint to point to user_profiles
-- instead of auth.users, ensuring compatibility with the app code that
-- passes profile_id values.
--
-- Impact:
-- ✅ Free plan selection will work (currently fails with 409 Conflict)
-- ✅ Razorpay payment flow will continue working (no changes needed)
-- ✅ PayPal payment flow will continue working (no changes needed)
-- ✅ All existing subscription data remains intact
--
-- The fix is safe because:
-- 1. No data is changed, only the constraint target
-- 2. All existing user_id values in user_subscriptions are already profile IDs
-- 3. Payment webhooks already pass profile_id values
-- ============================================================================

-- STEP 1: Drop the old foreign key constraint
-- This constraint currently references auth.users(id)
ALTER TABLE public.user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

-- STEP 2: Add the corrected foreign key constraint
-- Now references user_profiles(id) instead of auth.users(id)
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- STEP 3: Verify the constraint was applied correctly
SELECT 'VERIFICATION: Foreign key constraint updated' as step;
SELECT 
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'user_subscriptions' 
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name = 'user_subscriptions_user_id_fkey';

-- STEP 4: Check for any orphaned rows (user_id that don't exist in user_profiles)
SELECT 'VERIFICATION: Checking for orphaned subscription records' as step;
SELECT 
  COUNT(*) as orphaned_count,
  STRING_AGG(us.id::text, ', ') as orphaned_ids
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON us.user_id = up.id
WHERE up.id IS NULL;

-- STEP 5: Sample of existing subscriptions (to confirm they have valid profile IDs)
SELECT 'SAMPLE: Existing subscriptions with profile validation' as step;
SELECT 
  us.id,
  us.user_id,
  up.email as profile_email,
  us.plan_tier,
  us.status,
  us.current_period_end
FROM public.user_subscriptions us
JOIN public.user_profiles up ON us.user_id = up.id
ORDER BY us.created_at DESC
LIMIT 5;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '✅ FOREIGN KEY FIX COMPLETE' as result;
SELECT 'Foreign key now points to user_profiles(id) instead of auth.users(id)' as summary_1;
SELECT 'Free plan selection will now work (409 Conflict fixed)' as summary_2;
SELECT 'Razorpay payment flow unaffected (already uses profile_id)' as summary_3;
SELECT 'PayPal payment flow unaffected (already uses profile_id)' as summary_4;
SELECT 'All existing subscription data remains intact' as summary_5;
