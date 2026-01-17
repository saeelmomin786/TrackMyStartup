-- FIXED RLS Policy for user_subscriptions
-- Allows Investment Advisors to create subscriptions for startups (and anyone for themselves)
-- Run this in Supabase SQL Editor

-- Drop old policies
DROP POLICY IF EXISTS user_subscriptions_user_insert ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_read ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_user_update ON public.user_subscriptions;

-- NEW INSERT POLICY: Allow users to insert for themselves OR allow Investment Advisors to insert for anyone
CREATE POLICY user_subscriptions_user_insert ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  -- Option 1: User creating subscription for their own profile
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR
  -- Option 2: Investment Advisor creating subscription for any startup
  EXISTS (
    SELECT 1 FROM public.user_profiles advisor
    WHERE advisor.auth_user_id = auth.uid() 
    AND advisor.role = 'Investment Advisor'
  )
);

-- READ POLICY: Allow users to read their own subscriptions, plus admins can read all
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

-- UPDATE POLICY: Allow users to update their own subscriptions, plus Investment Advisors and Admins
CREATE POLICY user_subscriptions_user_update ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.auth_user_id = auth.uid() 
    AND (u.role = 'Investment Advisor' OR u.role = 'Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.auth_user_id = auth.uid() 
    AND (u.role = 'Investment Advisor' OR u.role = 'Admin')
  )
);
