-- =====================================================
-- ENABLE RLS POLICIES FOR ADVISOR CREDITS SYSTEM
-- =====================================================
-- This script enables RLS and creates proper policies
-- for advisor_credits and credit_purchase_history tables
-- =====================================================
-- Note: SECURITY DEFINER functions (like increment_advisor_credits)
-- will still work as they bypass RLS
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE advisor_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_credit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_credit_subscriptions ENABLE ROW LEVEL SECURITY;
-- Note: credit_pricing_config and credit_subscription_plans are admin-managed
-- They can have RLS enabled but with public read access (admin-only write)

-- =====================================================
-- STEP 2: DROP EXISTING POLICIES (if any)
-- =====================================================

-- Drop all existing policies on advisor_credits
DROP POLICY IF EXISTS "Users can view their own advisor credits" ON advisor_credits;
DROP POLICY IF EXISTS "Users can insert their own advisor credits" ON advisor_credits;
DROP POLICY IF EXISTS "Users can update their own advisor credits" ON advisor_credits;

-- Drop all existing policies on credit_purchase_history
DROP POLICY IF EXISTS "Users can view their own purchase history" ON credit_purchase_history;
DROP POLICY IF EXISTS "Users can insert their own purchase history" ON credit_purchase_history;

-- Drop all existing policies on advisor_credit_assignments
DROP POLICY IF EXISTS "Advisors can view their own credit assignments" ON advisor_credit_assignments;
DROP POLICY IF EXISTS "Advisors can insert their own credit assignments" ON advisor_credit_assignments;
DROP POLICY IF EXISTS "Advisors can update their own credit assignments" ON advisor_credit_assignments;

-- Drop all existing policies on advisor_credit_subscriptions
DROP POLICY IF EXISTS "Advisors can view their own subscriptions" ON advisor_credit_subscriptions;
DROP POLICY IF EXISTS "Advisors can insert their own subscriptions" ON advisor_credit_subscriptions;
DROP POLICY IF EXISTS "Advisors can update their own subscriptions" ON advisor_credit_subscriptions;

-- Drop all existing policies on credit_pricing_config
DROP POLICY IF EXISTS "Public can view active pricing" ON credit_pricing_config;

-- Drop all existing policies on credit_subscription_plans
DROP POLICY IF EXISTS "Public can view active subscription plans" ON credit_subscription_plans;

-- =====================================================
-- STEP 3: CREATE RLS POLICIES FOR advisor_credits
-- =====================================================

-- Policy: Users can view their own credits
CREATE POLICY "Users can view their own advisor credits"
ON advisor_credits
FOR SELECT
TO authenticated
USING (advisor_user_id = auth.uid());

-- Policy: Users can insert their own credits (for initial creation)
-- Note: The increment_advisor_credits function uses SECURITY DEFINER and bypasses RLS
-- This policy is for direct inserts (if needed)
CREATE POLICY "Users can insert their own advisor credits"
ON advisor_credits
FOR INSERT
TO authenticated
WITH CHECK (advisor_user_id = auth.uid());

-- Policy: Users can update their own credits
-- Note: The increment_advisor_credits function uses SECURITY DEFINER and bypasses RLS
-- This policy is for direct updates (if needed)
CREATE POLICY "Users can update their own advisor credits"
ON advisor_credits
FOR UPDATE
TO authenticated
USING (advisor_user_id = auth.uid())
WITH CHECK (advisor_user_id = auth.uid());

-- =====================================================
-- STEP 4: CREATE RLS POLICIES FOR credit_purchase_history
-- =====================================================

-- Policy: Users can view their own purchase history
CREATE POLICY "Users can view their own purchase history"
ON credit_purchase_history
FOR SELECT
TO authenticated
USING (advisor_user_id = auth.uid());

-- Policy: Users can insert their own purchase history
-- Note: The backend API uses service role and bypasses RLS
-- This policy is for direct inserts (if needed)
CREATE POLICY "Users can insert their own purchase history"
ON credit_purchase_history
FOR INSERT
TO authenticated
WITH CHECK (advisor_user_id = auth.uid());

-- =====================================================
-- STEP 5: CREATE RLS POLICIES FOR advisor_credit_assignments
-- =====================================================

-- Policy: Advisors can view their own credit assignments
CREATE POLICY "Advisors can view their own credit assignments"
ON advisor_credit_assignments
FOR SELECT
TO authenticated
USING (advisor_user_id = auth.uid());

-- Policy: Advisors can insert their own credit assignments
CREATE POLICY "Advisors can insert their own credit assignments"
ON advisor_credit_assignments
FOR INSERT
TO authenticated
WITH CHECK (advisor_user_id = auth.uid());

-- Policy: Advisors can update their own credit assignments
CREATE POLICY "Advisors can update their own credit assignments"
ON advisor_credit_assignments
FOR UPDATE
TO authenticated
USING (advisor_user_id = auth.uid())
WITH CHECK (advisor_user_id = auth.uid());

-- =====================================================
-- STEP 6: CREATE RLS POLICIES FOR advisor_credit_subscriptions
-- =====================================================

-- Policy: Advisors can view their own subscriptions
CREATE POLICY "Advisors can view their own subscriptions"
ON advisor_credit_subscriptions
FOR SELECT
TO authenticated
USING (advisor_user_id = auth.uid());

-- Policy: Advisors can insert their own subscriptions
-- Note: Backend API uses service role and bypasses RLS
CREATE POLICY "Advisors can insert their own subscriptions"
ON advisor_credit_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (advisor_user_id = auth.uid());

-- Policy: Advisors can update their own subscriptions
CREATE POLICY "Advisors can update their own subscriptions"
ON advisor_credit_subscriptions
FOR UPDATE
TO authenticated
USING (advisor_user_id = auth.uid())
WITH CHECK (advisor_user_id = auth.uid());

-- =====================================================
-- STEP 7: CREATE RLS POLICIES FOR credit_pricing_config (Admin-managed, public read)
-- =====================================================

ALTER TABLE credit_pricing_config ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active pricing (public read)
CREATE POLICY "Public can view active pricing"
ON credit_pricing_config
FOR SELECT
TO public
USING (is_active = true);

-- =====================================================
-- STEP 8: CREATE RLS POLICIES FOR credit_subscription_plans (Admin-managed, public read)
-- =====================================================

ALTER TABLE credit_subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active subscription plans (public read)
CREATE POLICY "Public can view active subscription plans"
ON credit_subscription_plans
FOR SELECT
TO public
USING (is_active = true);

-- =====================================================
-- STEP 9: VERIFY RLS IS ENABLED
-- =====================================================

DO $$
BEGIN
    -- Check RLS status
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'advisor_credits'
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled on advisor_credits table';
    ELSE
        RAISE WARNING '❌ RLS NOT enabled on advisor_credits table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'credit_purchase_history'
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled on credit_purchase_history table';
    ELSE
        RAISE WARNING '❌ RLS NOT enabled on credit_purchase_history table';
    END IF;
END $$;

-- =====================================================
-- STEP 10: LIST ALL POLICIES (for verification)
-- =====================================================

SELECT 
    'Policy Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_credits', 
    'credit_purchase_history',
    'advisor_credit_assignments',
    'advisor_credit_subscriptions',
    'credit_pricing_config',
    'credit_subscription_plans'
)
ORDER BY tablename, policyname;
