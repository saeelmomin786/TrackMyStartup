-- Fix Admin Access to Investor and Investment Advisor Data
-- This script allows Admin users to view all investor favorites and due diligence requests

-- =====================================================
-- 1. ADMIN ACCESS TO INVESTOR_FAVORITES
-- =====================================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all investor favorites" ON public.investor_favorites;

-- Create policy for Admin to view all investor favorites
CREATE POLICY "Admin can view all investor favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

-- =====================================================
-- 2. ADMIN ACCESS TO DUE_DILIGENCE_REQUESTS
-- =====================================================

-- Check if due_diligence_requests table exists and has RLS enabled
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'due_diligence_requests') THEN
        ALTER TABLE public.due_diligence_requests ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing admin policy if it exists
        DROP POLICY IF EXISTS "Admin can view all due diligence requests" ON public.due_diligence_requests;
        
        -- Create policy for Admin to view all due diligence requests
        CREATE POLICY "Admin can view all due diligence requests" 
        ON public.due_diligence_requests
        FOR SELECT 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role = 'Admin'
            )
        );
        
        RAISE NOTICE 'RLS policies created for due_diligence_requests table';
    ELSE
        RAISE NOTICE 'due_diligence_requests table does not exist yet';
    END IF;
END $$;

-- =====================================================
-- 3. ADMIN ACCESS TO INVESTMENT_RECORDS (for completeness)
-- =====================================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all investment records" ON public.investment_records;

-- Create policy for Admin to view all investment records
CREATE POLICY "Admin can view all investment records" 
ON public.investment_records
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

-- =====================================================
-- 4. ADMIN ACCESS TO STARTUP_ADDITION_REQUESTS
-- =====================================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can view all startup addition requests" ON public.startup_addition_requests;

-- Create policy for Admin to view all startup addition requests
CREATE POLICY "Admin can view all startup addition requests" 
ON public.startup_addition_requests
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

-- =====================================================
-- 5. VERIFY POLICIES WERE CREATED
-- =====================================================

-- Check investor_favorites policies
SELECT '=== INVESTOR_FAVORITES POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'investor_favorites' 
ORDER BY policyname;

-- Check due_diligence_requests policies (if table exists)
SELECT '=== DUE_DILIGENCE_REQUESTS POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'due_diligence_requests' 
ORDER BY policyname;

-- Check investment_records policies
SELECT '=== INVESTMENT_RECORDS POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'investment_records' 
AND policyname LIKE '%Admin%'
ORDER BY policyname;

-- Check startup_addition_requests policies
SELECT '=== STARTUP_ADDITION_REQUESTS POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'startup_addition_requests' 
AND policyname LIKE '%Admin%'
ORDER BY policyname;

