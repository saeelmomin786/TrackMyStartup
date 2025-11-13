-- FIX_STARTUP_DASHBOARD_RLS_POLICIES.sql
-- Fix RLS policies to ensure investors and investment advisors can access all data needed for startup dashboard
-- This addresses missing RLS policies on subsidiaries, international_operations, and company_documents tables

-- =====================================================
-- 1. CHECK CURRENT RLS STATUS
-- =====================================================

SELECT '=== CHECKING RLS STATUS ===' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'startups',
        'fundraising_details',
        'startup_shares',
        'founders',
        'subsidiaries',
        'international_operations',
        'company_documents'
    )
ORDER BY tablename;

-- =====================================================
-- 2. CHECK EXISTING POLICIES
-- =====================================================

SELECT '=== CHECKING EXISTING POLICIES ===' as info;

SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'startups',
        'fundraising_details',
        'startup_shares',
        'founders',
        'subsidiaries',
        'international_operations',
        'company_documents'
    )
ORDER BY tablename, policyname;

-- =====================================================
-- 3. FIX SUBSIDIARIES TABLE RLS
-- =====================================================

SELECT '=== FIXING SUBSIDIARIES RLS ===' as info;

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.subsidiaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Investors with due diligence can view subsidiaries" ON public.subsidiaries;
DROP POLICY IF EXISTS "Investment Advisors can view all subsidiaries" ON public.subsidiaries;
DROP POLICY IF EXISTS "Startup owners can view their subsidiaries" ON public.subsidiaries;
DROP POLICY IF EXISTS "Anyone can view subsidiaries" ON public.subsidiaries;

-- Policy 1: Investment Advisors can view all subsidiaries
CREATE POLICY "Investment Advisors can view all subsidiaries"
ON public.subsidiaries
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

-- Policy 2: Investors with due diligence can view subsidiaries
CREATE POLICY "Investors with due diligence can view subsidiaries"
ON public.subsidiaries
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
        WHERE u.id = auth.uid()
        AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
        AND (ddr.startup_id::INTEGER = subsidiaries.startup_id OR ddr.startup_id = subsidiaries.startup_id::TEXT)
        AND ddr.status = 'completed'
    )
    OR
    -- Startup owner can view their own subsidiaries
    EXISTS (
        SELECT 1
        FROM public.startups s
        WHERE s.id = subsidiaries.startup_id
        AND s.user_id = auth.uid()
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

-- =====================================================
-- 4. FIX INTERNATIONAL_OPERATIONS TABLE RLS
-- =====================================================

SELECT '=== FIXING INTERNATIONAL_OPERATIONS RLS ===' as info;

-- Enable RLS if not already enabled (table may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'international_operations') THEN
        ALTER TABLE public.international_operations ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Investors with due diligence can view international operations" ON public.international_operations;
        DROP POLICY IF EXISTS "Investment Advisors can view all international operations" ON public.international_operations;
        DROP POLICY IF EXISTS "Startup owners can view their international operations" ON public.international_operations;
        
        -- Policy 1: Investment Advisors can view all international operations
        CREATE POLICY "Investment Advisors can view all international operations"
        ON public.international_operations
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
        
        -- Policy 2: Investors with due diligence can view international operations
        CREATE POLICY "Investors with due diligence can view international operations"
        ON public.international_operations
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.users u
                JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
                WHERE u.id = auth.uid()
                AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                AND (ddr.startup_id::INTEGER = international_operations.startup_id OR ddr.startup_id = international_operations.startup_id::TEXT)
                AND ddr.status = 'completed'
            )
            OR
            -- Startup owner can view their own international operations
            EXISTS (
                SELECT 1
                FROM public.startups s
                WHERE s.id = international_operations.startup_id
                AND s.user_id = auth.uid()
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
    ELSE
        RAISE NOTICE 'international_operations table does not exist, skipping RLS setup';
    END IF;
END $$;

-- =====================================================
-- 5. FIX COMPANY_DOCUMENTS TABLE RLS
-- =====================================================

SELECT '=== FIXING COMPANY_DOCUMENTS RLS ===' as info;

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.company_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Investors with due diligence can view company documents" ON public.company_documents;
DROP POLICY IF EXISTS "Investment Advisors can view all company documents" ON public.company_documents;
DROP POLICY IF EXISTS "Startup owners can view their company documents" ON public.company_documents;

-- Policy 1: Investment Advisors can view all company documents
CREATE POLICY "Investment Advisors can view all company documents"
ON public.company_documents
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

-- Policy 2: Investors with due diligence can view company documents
CREATE POLICY "Investors with due diligence can view company documents"
ON public.company_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
        JOIN public.startups s ON s.id = company_documents.startup_id
        WHERE u.id = auth.uid()
        AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
        AND (ddr.startup_id::INTEGER = company_documents.startup_id OR ddr.startup_id = company_documents.startup_id::TEXT)
        AND ddr.status = 'completed'
    )
    OR
    -- Startup owner can view their own company documents
    EXISTS (
        SELECT 1
        FROM public.startups s
        WHERE s.id = company_documents.startup_id
        AND s.user_id = auth.uid()
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

-- =====================================================
-- 6. VERIFY FUNDRAISING_DETAILS RLS (ensure it's accessible)
-- =====================================================

SELECT '=== VERIFYING FUNDRAISING_DETAILS RLS ===' as info;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.fundraising_details ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all authenticated users to read (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_read_all'
    ) THEN
        CREATE POLICY fundraising_details_read_all ON public.fundraising_details
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- =====================================================
-- 7. VERIFY STARTUP_SHARES RLS
-- =====================================================

SELECT '=== VERIFYING STARTUP_SHARES RLS ===' as info;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.startup_shares ENABLE ROW LEVEL SECURITY;

-- Create policy for Investment Advisors if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'startup_shares' 
        AND policyname = 'Investment Advisors can view all startup shares'
    ) THEN
        CREATE POLICY "Investment Advisors can view all startup shares"
        ON public.startup_shares
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
    END IF;
END $$;

-- =====================================================
-- 8. VERIFY FOUNDERS RLS
-- =====================================================

SELECT '=== VERIFYING FOUNDERS RLS ===' as info;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.founders ENABLE ROW LEVEL SECURITY;

-- Create policy for Investment Advisors if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'founders' 
        AND policyname = 'Investment Advisors can view all founders'
    ) THEN
        CREATE POLICY "Investment Advisors can view all founders"
        ON public.founders
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
    END IF;
END $$;

-- =====================================================
-- 9. FIX IP_TRADEMARK RECORDS/DOCUMENTS RLS
-- =====================================================

SELECT '=== FIXING IP TRADEMARK RLS ===' as info;

-- Ensure RLS is enabled on ip_trademark tables
ALTER TABLE IF EXISTS public.ip_trademark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ip_trademark_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Investment Advisors can view ip records" ON public.ip_trademark_records;
DROP POLICY IF EXISTS "Investors with due diligence can view ip records" ON public.ip_trademark_records;
DROP POLICY IF EXISTS "Investment Advisors can view ip documents" ON public.ip_trademark_documents;
DROP POLICY IF EXISTS "Investors with due diligence can view ip documents" ON public.ip_trademark_documents;

-- Policy: Investment Advisors can view all IP records
CREATE POLICY "Investment Advisors can view ip records"
ON public.ip_trademark_records
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
          AND role = 'Investment Advisor'
    )
    OR startup_id IN (
        SELECT id FROM public.startups WHERE user_id = auth.uid()
    )
);

-- Policy: Investors with due diligence can view IP records
CREATE POLICY "Investors with due diligence can view ip records"
ON public.ip_trademark_records
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.due_diligence_requests ddr ON ddr.user_id = u.id
        WHERE u.id = auth.uid()
          AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
          AND (ddr.startup_id::INTEGER = ip_trademark_records.startup_id OR ddr.startup_id = ip_trademark_records.startup_id::TEXT)
          AND ddr.status = 'completed'
    )
    OR EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id = ip_trademark_records.startup_id
          AND s.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('CA', 'CS', 'Admin')
    )
);

-- Policy: Investment Advisors can view IP documents
CREATE POLICY "Investment Advisors can view ip documents"
ON public.ip_trademark_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
          AND role = 'Investment Advisor'
    )
    OR ip_record_id IN (
        SELECT id FROM public.ip_trademark_records
        WHERE startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Investors with due diligence can view IP documents
CREATE POLICY "Investors with due diligence can view ip documents"
ON public.ip_trademark_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.ip_trademark_records r
        JOIN public.due_diligence_requests ddr ON ddr.startup_id::INTEGER = r.startup_id OR ddr.startup_id = r.startup_id::TEXT
        JOIN public.users u ON u.id = ddr.user_id
        WHERE r.id = ip_trademark_documents.ip_record_id
          AND u.id = auth.uid()
          AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
          AND ddr.status = 'completed'
    )
    OR EXISTS (
        SELECT 1 FROM public.ip_trademark_records r
        JOIN public.startups s ON s.id = r.startup_id
        WHERE r.id = ip_trademark_documents.ip_record_id
          AND s.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('CA', 'CS', 'Admin')
    )
);

-- =====================================================
-- 10. FINAL VERIFICATION
-- =====================================================

SELECT '=== FINAL VERIFICATION ===' as info;

-- Check all policies were created
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'startups',
        'fundraising_details',
        'startup_shares',
        'founders',
        'subsidiaries',
        'international_operations',
        'company_documents'
    )
GROUP BY tablename
ORDER BY tablename;

-- Summary
SELECT 
    'RLS Policies Summary' as summary,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'startups',
        'fundraising_details',
        'startup_shares',
        'founders',
        'subsidiaries',
        'international_operations',
        'company_documents'
    );

