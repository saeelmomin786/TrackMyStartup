-- 🚀 USER_SUBSCRIPTIONS RLS FIX
-- Copy and paste this directly into Supabase SQL Editor
-- This fixes the 403 Forbidden error on subscription creation
-- Runtime: ~10 seconds

-- Enable RLS on user_subscriptions table
ALTER TABLE IF EXISTS public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ✅ POLICY 1: Users can READ their own subscriptions
DROP POLICY IF EXISTS user_subscriptions_user_read ON public.user_subscriptions;
CREATE POLICY user_subscriptions_user_read ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
);

-- ✅ POLICY 2: Users can INSERT their own subscriptions (THIS FIXES THE 403 ERROR)
DROP POLICY IF EXISTS user_subscriptions_user_insert ON public.user_subscriptions;
CREATE POLICY user_subscriptions_user_insert ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
);

-- ✅ POLICY 3: Users can UPDATE their own subscriptions
DROP POLICY IF EXISTS user_subscriptions_user_update ON public.user_subscriptions;
CREATE POLICY user_subscriptions_user_update ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
);

-- ✅ POLICY 4: Admins can manage ALL subscriptions
DROP POLICY IF EXISTS user_subscriptions_admin_all ON public.user_subscriptions;
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

-- ✅ VERIFICATION: Check all policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;
