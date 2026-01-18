-- =====================================================
-- ROLLBACK AND FIX: Restore startup access + add advisor access
-- =====================================================
-- This keeps the original startup policies AND adds advisor policies
-- =====================================================

-- Drop all current policies first
DROP POLICY IF EXISTS user_subscriptions_advisor_insert ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_advisor_update ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_advisor_read ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_admin_all ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_read ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_insert ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_update ON public.user_subscriptions;

-- =====================================================
-- RESTORE ORIGINAL STARTUP POLICIES (using user_profiles)
-- =====================================================

-- Policy 1: Users can READ their own subscriptions via user_profiles
CREATE POLICY user_subscriptions_user_read ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR
  -- ADDON: Allow advisors to view subscriptions they're paying for
  paid_by_advisor_id::text = auth.uid()::text
  OR
  -- ADDON: Allow advisors to view subscriptions for startups they manage
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
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
);

-- Policy 2: Users can INSERT their own subscriptions via user_profiles
CREATE POLICY user_subscriptions_user_insert ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR
  -- ADDON: Allow advisors to insert subscriptions they're paying for
  paid_by_advisor_id::text = auth.uid()::text
);

-- Policy 3: Users can UPDATE their own subscriptions via user_profiles
CREATE POLICY user_subscriptions_user_update ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR
  -- ADDON: Allow advisors to update subscriptions they're paying for
  paid_by_advisor_id::text = auth.uid()::text
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR
  -- ADDON: Allow advisors to update subscriptions they're paying for
  paid_by_advisor_id::text = auth.uid()::text
);

-- Policy 4: Admins can manage ALL subscriptions
CREATE POLICY user_subscriptions_admin_all ON public.user_subscriptions
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles u 
  WHERE u.auth_user_id = auth.uid() 
  AND u.role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles u 
  WHERE u.auth_user_id = auth.uid() 
  AND u.role = 'Admin'
));

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  'Active' AS status
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;
