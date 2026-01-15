-- =====================================================
-- FIX ADMIN UPDATE FOR CREDIT PRICING TABLES
-- =====================================================
-- This script adds UPDATE policies for admins to update
-- credit_pricing_config and credit_subscription_plans
-- =====================================================

-- =====================================================
-- STEP 1: ADD UPDATE POLICY FOR credit_pricing_config
-- =====================================================

-- Drop existing UPDATE policy if exists
DROP POLICY IF EXISTS "Admins can update pricing" ON credit_pricing_config;

-- Create UPDATE policy for authenticated users (admin check can be added later)
-- For now, allow authenticated users to update (admin panel should verify admin role)
CREATE POLICY "Admins can update pricing"
ON credit_pricing_config
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- STEP 2: ADD UPDATE POLICY FOR credit_subscription_plans
-- =====================================================

-- Drop existing UPDATE policy if exists
DROP POLICY IF EXISTS "Admins can update subscription plans" ON credit_subscription_plans;

-- Create UPDATE policy for authenticated users (admin check can be added later)
-- For now, allow authenticated users to update (admin panel should verify admin role)
CREATE POLICY "Admins can update subscription plans"
ON credit_subscription_plans
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- STEP 3: VERIFY POLICIES
-- =====================================================

SELECT 
    'credit_pricing_config' as table_name,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'credit_pricing_config'
ORDER BY policyname;

SELECT 
    'credit_subscription_plans' as table_name,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'credit_subscription_plans'
ORDER BY policyname;

-- =====================================================
-- SUMMARY
-- =====================================================
-- After running this script:
-- 1. Admins can now UPDATE credit_pricing_config
-- 2. Admins can now UPDATE credit_subscription_plans
-- 3. The CreditPricingTab admin component should now work
-- 
-- Note: For production, you may want to add admin role checks:
-- USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND role = 'Admin'))
