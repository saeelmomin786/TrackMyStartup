-- =====================================================
-- ADD ADVISOR POLICIES WITHOUT TOUCHING EXISTING ONES
-- =====================================================
-- This ONLY adds advisor access, keeps all existing startup policies
-- =====================================================

-- ADD Policy: Advisors can INSERT subscriptions they're paying for
DROP POLICY IF EXISTS user_subscriptions_advisor_insert ON public.user_subscriptions;
CREATE POLICY user_subscriptions_advisor_insert ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  paid_by_advisor_id::text = auth.uid()::text
);

-- ADD Policy: Advisors can UPDATE subscriptions they're paying for
DROP POLICY IF EXISTS user_subscriptions_advisor_update ON public.user_subscriptions;
CREATE POLICY user_subscriptions_advisor_update ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (
  paid_by_advisor_id::text = auth.uid()::text
)
WITH CHECK (
  paid_by_advisor_id::text = auth.uid()::text
);

-- ADD Policy: Advisors can READ subscriptions for their startups
DROP POLICY IF EXISTS user_subscriptions_advisor_read ON public.user_subscriptions;
CREATE POLICY user_subscriptions_advisor_read ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  paid_by_advisor_id::text = auth.uid()::text
  OR
  -- Allow Investment Advisors to read all subscriptions to check before assigning
  -- This is needed to prevent duplicate premium assignments
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.auth_user_id::text = auth.uid()::text
    AND up.role = 'Investment Advisor'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.advisor_added_startups aas
    INNER JOIN public.startups s ON s.id = aas.tms_startup_id
    WHERE aas.advisor_id::text = auth.uid()::text
    AND s.user_id::text = user_subscriptions.user_id::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.advisor_credit_assignments aca
    WHERE aca.advisor_user_id::text = auth.uid()::text
    AND aca.startup_user_id::text = user_subscriptions.user_id::text
  )
);

-- =====================================================
-- VERIFICATION: Check all policies (old + new)
-- =====================================================
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  'Active' AS status
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- Expected result:
-- user_subscriptions_admin_all (if exists)
-- user_subscriptions_advisor_insert (NEW)
-- user_subscriptions_advisor_read (NEW)
-- user_subscriptions_advisor_update (NEW)
-- user_subscriptions_user_insert (EXISTING - kept)
-- user_subscriptions_user_read (EXISTING - kept)
-- user_subscriptions_user_update (EXISTING - kept)
