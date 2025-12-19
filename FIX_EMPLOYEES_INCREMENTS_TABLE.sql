-- =====================================================
-- FIX EMPLOYEES_INCREMENTS TABLE
-- =====================================================
-- This script creates the missing employees_increments table
-- which is required for employee creation and salary tracking

-- First, check if table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees_increments'
    ) THEN
        RAISE NOTICE 'Table employees_increments does NOT exist. Creating it...';
    ELSE
        RAISE NOTICE 'Table employees_increments EXISTS. Checking structure...';
    END IF;
END $$;

-- Create employees_increments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.employees_increments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    salary DECIMAL(15,2) NOT NULL,
    esop_allocation DECIMAL(15,2) DEFAULT 0,
    allocation_type VARCHAR(20) DEFAULT 'one-time' CHECK (allocation_type IN ('one-time', 'annually', 'quarterly', 'monthly')),
    esop_per_allocation DECIMAL(15,2) DEFAULT 0,
    price_per_share DECIMAL(15,2) DEFAULT 0,
    number_of_shares INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emp_increments_employee_date ON public.employees_increments(employee_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_employees_increments_price_per_share ON public.employees_increments(price_per_share);
CREATE INDEX IF NOT EXISTS idx_employees_increments_number_of_shares ON public.employees_increments(number_of_shares);

-- Add comments for documentation
COMMENT ON TABLE public.employees_increments IS 'History of salary and ESOP increments per employee';
COMMENT ON COLUMN public.employees_increments.employee_id IS 'Reference to the employee';
COMMENT ON COLUMN public.employees_increments.effective_date IS 'Date when the increment becomes effective';
COMMENT ON COLUMN public.employees_increments.salary IS 'New salary amount after increment';
COMMENT ON COLUMN public.employees_increments.esop_allocation IS 'ESOP allocation value in USD';
COMMENT ON COLUMN public.employees_increments.allocation_type IS 'Type of ESOP allocation: one-time, annually, quarterly, or monthly';
COMMENT ON COLUMN public.employees_increments.esop_per_allocation IS 'ESOP value per allocation period';
COMMENT ON COLUMN public.employees_increments.price_per_share IS 'Price per share at the time of ESOP increment';
COMMENT ON COLUMN public.employees_increments.number_of_shares IS 'Number of shares in increment (auto-calculated from ESOP allocation / price per share)';

-- Enable RLS on employees_increments table
ALTER TABLE public.employees_increments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own startup employee increments" ON public.employees_increments;
DROP POLICY IF EXISTS "Users can add employee increments to their own startups" ON public.employees_increments;
DROP POLICY IF EXISTS "Users can update employee increments in their own startups" ON public.employees_increments;
DROP POLICY IF EXISTS "Users can delete employee increments from their own startups" ON public.employees_increments;
DROP POLICY IF EXISTS "Admins can view all employee increments" ON public.employees_increments;
DROP POLICY IF EXISTS "CA can view all employee increments" ON public.employees_increments;
DROP POLICY IF EXISTS "CS can view all employee increments" ON public.employees_increments;
DROP POLICY IF EXISTS "Investment Advisors can view all employee increments" ON public.employees_increments;

-- Policy: Users can view increments for employees in their own startups
CREATE POLICY "Users can view their own startup employee increments" ON public.employees_increments
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can add increments for employees in their own startups
CREATE POLICY "Users can add employee increments to their own startups" ON public.employees_increments
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can update increments for employees in their own startups
CREATE POLICY "Users can update employee increments in their own startups" ON public.employees_increments
    FOR UPDATE USING (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can delete increments for employees in their own startups
CREATE POLICY "Users can delete employee increments from their own startups" ON public.employees_increments
    FOR DELETE USING (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Admins can view all employee increments
CREATE POLICY "Admins can view all employee increments" ON public.employees_increments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Policy: CA can view all employee increments
CREATE POLICY "CA can view all employee increments" ON public.employees_increments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'CA'
        )
    );

-- Policy: CS can view all employee increments
CREATE POLICY "CS can view all employee increments" ON public.employees_increments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'CS'
        )
    );

-- Policy: Investment Advisors can view all employee increments
CREATE POLICY "Investment Advisors can view all employee increments" ON public.employees_increments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Investment Advisor'
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify table structure
SELECT 'employees_increments table structure:' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'employees_increments' 
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT 
    'RLS Status:' as status,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'employees_increments';

-- Verify policies
SELECT 
    'RLS Policies:' as status,
    schemaname,
    tablename,
    policyname,
    cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'employees_increments'
ORDER BY policyname;

-- =====================================================
-- FIX get_employee_current_salary FUNCTION
-- =====================================================
-- Make sure the function handles the case where employees_increments might be empty
-- (This should already exist, but we'll ensure it's correct)

CREATE OR REPLACE FUNCTION get_employee_current_salary(emp_id UUID, as_of DATE)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    current_salary DECIMAL(15,2);
BEGIN
    -- Start with base salary
    SELECT e.salary INTO current_salary
    FROM public.employees e
    WHERE e.id = emp_id;

    -- Override with latest increment effective on/before as_of, if any
    -- This will return NULL if no increments exist, which is fine
    SELECT ei.salary
    INTO current_salary
    FROM public.employees_increments ei
    WHERE ei.employee_id = emp_id
      AND ei.effective_date <= as_of
    ORDER BY ei.effective_date DESC
    LIMIT 1;

    RETURN COALESCE(current_salary, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Verify table was created/updated successfully
DO $$
DECLARE
    table_exists BOOLEAN;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees_increments'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'employees_increments';
        
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'employees_increments';
        
        RAISE NOTICE '=== FINAL STATUS ===';
        RAISE NOTICE '✅ Table exists: %', table_exists;
        RAISE NOTICE '✅ RLS enabled: %', rls_enabled;
        RAISE NOTICE '✅ RLS policies: %', policy_count;
        
        IF rls_enabled AND policy_count > 0 THEN
            RAISE NOTICE '✅ Setup complete! Table is ready to use.';
        ELSIF rls_enabled AND policy_count = 0 THEN
            RAISE WARNING '⚠️ RLS is enabled but no policies found. This might cause access issues.';
        ELSE
            RAISE WARNING '⚠️ RLS is not enabled. Consider enabling it for security.';
        END IF;
    ELSE
        RAISE EXCEPTION '❌ Table creation failed!';
    END IF;
END $$;

SELECT '✅ employees_increments table setup complete!' as status;
SELECT '✅ get_employee_current_salary function updated!' as status;

