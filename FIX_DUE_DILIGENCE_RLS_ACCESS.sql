-- FIX_DUE_DILIGENCE_RLS_ACCESS.sql
-- Fix RLS policies to allow investors and investment advisors to view startup data
-- when they have approved/completed due diligence requests

-- =====================================================
-- 1. CHECK CURRENT POLICIES
-- =====================================================

-- Check existing policies on financial_records
SELECT '=== CURRENT FINANCIAL_RECORDS POLICIES ===' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'financial_records';

-- Check existing policies on employees
SELECT '=== CURRENT EMPLOYEES POLICIES ===' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'employees';

-- Check existing policies on investment_records
SELECT '=== CURRENT INVESTMENT_RECORDS POLICIES ===' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'investment_records';

-- Check existing policies on startups (for reference)
SELECT '=== CURRENT STARTUPS POLICIES ===' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'startups';

-- =====================================================
-- 2. CREATE HELPER FUNCTION TO CHECK DUE DILIGENCE
-- =====================================================

-- Function to check if user has completed due diligence for a startup
CREATE OR REPLACE FUNCTION public.has_completed_due_diligence(
  p_user_id UUID,
  p_startup_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.due_diligence_requests
    WHERE user_id = p_user_id
      AND startup_id::INTEGER = p_startup_id
      AND status = 'completed'
  );
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.has_completed_due_diligence(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_completed_due_diligence(UUID, INTEGER) TO authenticated;

-- =====================================================
-- 3. CREATE RLS POLICIES FOR FINANCIAL_RECORDS
-- =====================================================

-- Policy: Investors with completed due diligence can view financial records
DROP POLICY IF EXISTS "Investors with due diligence can view financial records" ON public.financial_records;
CREATE POLICY "Investors with due diligence can view financial records"
ON public.financial_records
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND ddr.startup_id::INTEGER = financial_records.startup_id
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
);

-- Policy: Investment advisors can view all financial records
DROP POLICY IF EXISTS "Investment Advisors can view all financial records" ON public.financial_records;
CREATE POLICY "Investment Advisors can view all financial records"
ON public.financial_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
);

-- =====================================================
-- 4. CREATE RLS POLICIES FOR EMPLOYEES
-- =====================================================

-- Policy: Investors with completed due diligence can view employees
DROP POLICY IF EXISTS "Investors with due diligence can view employees" ON public.employees;
CREATE POLICY "Investors with due diligence can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND ddr.startup_id::INTEGER = employees.startup_id
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
);

-- Policy: Investment advisors can view all employees
DROP POLICY IF EXISTS "Investment Advisors can view all employees" ON public.employees;
CREATE POLICY "Investment Advisors can view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
);

-- =====================================================
-- 5. CREATE RLS POLICIES FOR INVESTMENT_RECORDS
-- =====================================================

-- Policy: Investors with completed due diligence can view investment records
DROP POLICY IF EXISTS "Investors with due diligence can view investment records" ON public.investment_records;
CREATE POLICY "Investors with due diligence can view investment records"
ON public.investment_records
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND ddr.startup_id::INTEGER = investment_records.startup_id
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
);

-- Policy: Investment advisors can view all investment records
DROP POLICY IF EXISTS "Investment Advisors can view all investment records" ON public.investment_records;
CREATE POLICY "Investment Advisors can view all investment records"
ON public.investment_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
);

-- =====================================================
-- 6. CREATE RLS POLICIES FOR STARTUP_SHARES (if exists)
-- =====================================================

-- Policy: Investors with completed due diligence can view startup shares
-- (Will be recreated in section 10 with better type handling)

-- Policy: Investment advisors can view all startup shares
-- (Will be recreated in section 10 with better type handling)

-- =====================================================
-- 7. CREATE RLS POLICIES FOR FOUNDERS
-- =====================================================

-- Policy: Investors with completed due diligence can view founders
-- (Will be recreated in section 10 with better type handling)

-- =====================================================
-- 8. VERIFY POLICIES WERE CREATED
-- =====================================================

SELECT '=== VERIFIED FINANCIAL_RECORDS POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'financial_records';

SELECT '=== VERIFIED EMPLOYEES POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employees';

SELECT '=== VERIFIED INVESTMENT_RECORDS POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'investment_records';

-- =====================================================
-- 9. CREATE RLS POLICIES FOR STARTUPS TABLE
-- =====================================================

-- Policy: Investors with completed due diligence can view startup details
DROP POLICY IF EXISTS "Investors with due diligence can view startups" ON public.startups;
CREATE POLICY "Investors with due diligence can view startups"
ON public.startups
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND (ddr.startup_id::INTEGER = startups.id OR ddr.startup_id = startups.id::TEXT)
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
  OR
  -- Startup owner can always view their own startup
  user_id = auth.uid()
  OR
  -- CA/CS/Admin can view all (if existing policies don't cover this)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('CA', 'CS', 'Admin')
  )
);

-- =====================================================
-- 10. FIX DATA TYPE HANDLING IN POLICIES
-- =====================================================

-- Note: due_diligence_requests.startup_id is TEXT, but most tables use INTEGER
-- The policies above handle both TEXT and INTEGER comparisons
-- We'll update policies to be more robust with type casting

-- Drop and recreate financial_records policy with better type handling
DROP POLICY IF EXISTS "Investors with due diligence can view financial records" ON public.financial_records;

CREATE POLICY "Investors with due diligence can view financial records"
ON public.financial_records
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND (ddr.startup_id::INTEGER = financial_records.startup_id OR ddr.startup_id = financial_records.startup_id::TEXT)
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
  OR
  -- Startup owner can view their own records
  EXISTS (
    SELECT 1
    FROM public.startups
    WHERE id = financial_records.startup_id
      AND user_id = auth.uid()
  )
  OR
  -- CA/CS/Admin can view all
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('CA', 'CS', 'Admin')
  )
);

-- Drop and recreate employees policy with better type handling
DROP POLICY IF EXISTS "Investors with due diligence can view employees" ON public.employees;

CREATE POLICY "Investors with due diligence can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND (ddr.startup_id::INTEGER = employees.startup_id OR ddr.startup_id = employees.startup_id::TEXT)
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
  OR
  -- Startup owner can view their own records
  EXISTS (
    SELECT 1
    FROM public.startups
    WHERE id = employees.startup_id
      AND user_id = auth.uid()
  )
  OR
  -- CA/CS/Admin can view all
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('CA', 'CS', 'Admin')
  )
);

-- Drop and recreate investment_records policy with better type handling
DROP POLICY IF EXISTS "Investors with due diligence can view investment records" ON public.investment_records;

CREATE POLICY "Investors with due diligence can view investment records"
ON public.investment_records
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND (ddr.startup_id::INTEGER = investment_records.startup_id OR ddr.startup_id = investment_records.startup_id::TEXT)
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
  OR
  -- Startup owner can view their own records
  EXISTS (
    SELECT 1
    FROM public.startups
    WHERE id = investment_records.startup_id
      AND user_id = auth.uid()
  )
  OR
  -- CA/CS/Admin can view all
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('CA', 'CS', 'Admin')
  )
);

-- Drop and recreate startup_shares policy with better type handling
DROP POLICY IF EXISTS "Investors with due diligence can view startup shares" ON public.startup_shares;
DROP POLICY IF EXISTS "Investment Advisors can view all startup shares" ON public.startup_shares;

CREATE POLICY "Investors with due diligence can view startup shares"
ON public.startup_shares
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND (ddr.startup_id::INTEGER = startup_shares.startup_id OR ddr.startup_id = startup_shares.startup_id::TEXT)
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
  OR
  -- Startup owner can view their own records
  EXISTS (
    SELECT 1
    FROM public.startups
    WHERE id = startup_shares.startup_id
      AND user_id = auth.uid()
  )
  OR
  -- CA/CS/Admin can view all
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('CA', 'CS', 'Admin')
  )
);

-- Drop and recreate founders policy with better type handling
DROP POLICY IF EXISTS "Investors with due diligence can view founders" ON public.founders;

CREATE POLICY "Investors with due diligence can view founders"
ON public.founders
FOR SELECT
TO authenticated
USING (
  -- Check if user is an investor with completed due diligence
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
    WHERE u.id = auth.uid()
      AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
      AND (ddr.startup_id::INTEGER = founders.startup_id OR ddr.startup_id = founders.startup_id::TEXT)
      AND ddr.status = 'completed'
  )
  OR
  -- Check if user is an investment advisor (they can view all for advisory role)
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'Investment Advisor'
  )
  OR
  -- Startup owner can view their own records
  EXISTS (
    SELECT 1
    FROM public.startups
    WHERE id = founders.startup_id
      AND user_id = auth.uid()
  )
  OR
  -- CA/CS/Admin can view all
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('CA', 'CS', 'Admin')
  )
  OR
  -- Anyone can view founders (if this is the existing policy)
  true
);

-- =====================================================
-- 11. TEST QUERIES (COMMENTED OUT - RUN MANUALLY TO TEST)
-- =====================================================

-- Test: Check if an investor with completed due diligence can access financial records
-- SELECT * FROM financial_records 
-- WHERE startup_id = <STARTUP_ID>
-- AND EXISTS (
--   SELECT 1 FROM due_diligence_requests 
--   WHERE user_id = auth.uid() 
--     AND startup_id::INTEGER = financial_records.startup_id 
--     AND status = 'completed'
-- );

-- Test: Check if an investment advisor can access all financial records
-- SELECT * FROM financial_records 
-- WHERE EXISTS (
--   SELECT 1 FROM users 
--   WHERE id = auth.uid() 
--     AND role = 'Investment Advisor'
-- );

