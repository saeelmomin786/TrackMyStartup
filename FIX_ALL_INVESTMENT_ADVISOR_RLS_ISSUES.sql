-- =====================================================
-- FIX ALL INVESTMENT ADVISOR RLS ISSUES
-- =====================================================
-- This script fixes RLS policies for ALL tables that
-- Investment Advisors need to access
-- =====================================================

-- 1. Fix advisor_mandates RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Advisors can view their own mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Advisors can insert their own mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Advisors can update their own mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Advisors can delete their own mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Admin can view all mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Admin can insert mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Admin can update mandates" ON public.advisor_mandates;
DROP POLICY IF EXISTS "Admin can delete mandates" ON public.advisor_mandates;

-- Create new policies using auth.uid() (NOT profile ID)
CREATE POLICY "Advisors can view their own mandates"
ON public.advisor_mandates FOR SELECT
TO authenticated
USING (
    advisor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

CREATE POLICY "Advisors can insert their own mandates"
ON public.advisor_mandates FOR INSERT
TO authenticated
WITH CHECK (
    advisor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

CREATE POLICY "Advisors can update their own mandates"
ON public.advisor_mandates FOR UPDATE
TO authenticated
USING (
    advisor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
)
WITH CHECK (
    advisor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

CREATE POLICY "Advisors can delete their own mandates"
ON public.advisor_mandates FOR DELETE
TO authenticated
USING (
    advisor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

-- 2. Fix advisor_mandate_investors RLS policies
DROP POLICY IF EXISTS "Advisors can view their mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Advisors can insert mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Advisors can update mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Advisors can delete mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Admin can view all mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Admin can insert mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Admin can update mandate investors" ON public.advisor_mandate_investors;
DROP POLICY IF EXISTS "Admin can delete mandate investors" ON public.advisor_mandate_investors;

-- Create new policies - allow advisors to see investors in their mandates
CREATE POLICY "Advisors can view their mandate investors"
ON public.advisor_mandate_investors FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.advisor_mandates am
        WHERE am.id = advisor_mandate_investors.mandate_id
        AND am.advisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

CREATE POLICY "Advisors can insert mandate investors"
ON public.advisor_mandate_investors FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.advisor_mandates am
        WHERE am.id = advisor_mandate_investors.mandate_id
        AND am.advisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

CREATE POLICY "Advisors can update mandate investors"
ON public.advisor_mandate_investors FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.advisor_mandates am
        WHERE am.id = advisor_mandate_investors.mandate_id
        AND am.advisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.advisor_mandates am
        WHERE am.id = advisor_mandate_investors.mandate_id
        AND am.advisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

CREATE POLICY "Advisors can delete mandate investors"
ON public.advisor_mandate_investors FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.advisor_mandates am
        WHERE am.id = advisor_mandate_investors.mandate_id
        AND am.advisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

-- 3. Verify advisor_mandates has RLS enabled
ALTER TABLE public.advisor_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_mandate_investors ENABLE ROW LEVEL SECURITY;

-- 4. Summary
SELECT 
    'RLS Fix Summary' as category,
    'advisor_mandates' as table_name,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_mandates'

UNION ALL

SELECT 
    'RLS Fix Summary' as category,
    'advisor_mandate_investors' as table_name,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_mandate_investors';





