-- =====================================================
-- FIX: ALLOW ADVISORS TO CREATE SUBSCRIPTIONS FOR STARTUPS
-- =====================================================
-- This fixes the 403 error when advisors try to assign premium to startups
-- The issue: Advisors cannot create subscriptions where user_id = startup's auth_user_id
-- because auth.uid() = advisor's auth_user_id
-- Solution: Add policies that allow advisors to manage subscriptions they're paying for
-- =====================================================

-- ✅ POLICY: Advisors can INSERT subscriptions they're paying for
DROP POLICY IF EXISTS user_subscriptions_advisor_insert ON public.user_subscriptions;
CREATE POLICY user_subscriptions_advisor_insert ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow if the authenticated user is paying for this subscription
  paid_by_advisor_id::text = auth.uid()::text
  OR
  -- Original rule: Allow users to insert their own subscriptions
  user_id::text = auth.uid()::text
);

-- ✅ POLICY: Advisors can UPDATE subscriptions they're paying for
DROP POLICY IF EXISTS user_subscriptions_advisor_update ON public.user_subscriptions;
CREATE POLICY user_subscriptions_advisor_update ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (
  -- Allow if the authenticated user is paying for this subscription
  paid_by_advisor_id::text = auth.uid()::text
  OR
  -- Original rule: Allow users to update their own subscriptions
  user_id::text = auth.uid()::text
)
WITH CHECK (
  -- Allow if the authenticated user is paying for this subscription
  paid_by_advisor_id::text = auth.uid()::text
  OR
  -- Original rule: Allow users to update their own subscriptions
  user_id::text = auth.uid()::text
);

-- ✅ POLICY: Advisors can READ subscriptions for their startups
DROP POLICY IF EXISTS user_subscriptions_advisor_read ON public.user_subscriptions;
CREATE POLICY user_subscriptions_advisor_read ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  -- Allow if the authenticated user is paying for this subscription
  paid_by_advisor_id::text = auth.uid()::text
  OR
  -- Allow users to read their own subscriptions
  user_id::text = auth.uid()::text
  OR
  -- Allow advisors to view subscriptions for startups they've added/manage
  -- This is CRITICAL: Advisors need to see if startup already has premium
  EXISTS (
    SELECT 1 FROM public.advisor_added_startups aas
    INNER JOIN public.startups s ON s.id = aas.tms_startup_id
    WHERE aas.advisor_id::text = auth.uid()::text
    AND s.user_id::text = user_subscriptions.user_id::text
  )
  OR
  -- Allow advisors to view subscriptions for startups they have credit assignments with
  EXISTS (
    SELECT 1 FROM public.advisor_credit_assignments aca
    WHERE aca.advisor_user_id::text = auth.uid()::text
    AND aca.startup_user_id::text = user_subscriptions.user_id::text
  )
  OR
  -- Allow admins to read all
  EXISTS (
    SELECT 1 FROM public.user_profiles u 
    WHERE u.auth_user_id::text = auth.uid()::text
    AND u.role = 'Admin'
  )
);

-- ✅ IMPORTANT: Drop old conflicting policies
DROP POLICY IF EXISTS user_subscriptions_user_read ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_insert ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_update ON public.user_subscriptions;

-- ✅ VERIFICATION: Check the new policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd AS command,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- ✅ Expected result: You should see:
-- 1. user_subscriptions_advisor_insert (INSERT)
-- 2. user_subscriptions_advisor_update (UPDATE)
-- 3. user_subscriptions_advisor_read (SELECT)
-- 4. user_subscriptions_admin_all (ALL)

-- =====================================================
-- TEST: Verify advisor can create subscription for startup
-- =====================================================
-- Run this as an advisor user to test:
/*
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  plan_tier,
  paid_by_advisor_id,
  status,
  current_period_start,
  current_period_end,
  amount,
  currency,
  interval
) VALUES (
  '<startup_auth_user_id>',
  '<premium_plan_id>',
  'premium',
  auth.uid(),  -- advisor's auth_user_id
  'active',
  now(),
  now() + interval '1 month',
  0,
  'INR',
  'monthly'
);
*/
