-- =====================================================
-- FIX USERS AND STARTUPS RLS FOR INVESTMENT ADVISORS
-- =====================================================
-- Allow Investment Advisors to view users and startups
-- needed for Service Requests section
-- =====================================================

-- Step 1: Check current users table policies
SELECT 'Step 1: Current users table policies' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Step 2: Check current startups table policies
SELECT 'Step 2: Current startups table policies' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'startups'
ORDER BY policyname;

-- Step 3: Enable RLS if not enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- Step 4: Check if public read policy exists for users
-- If not, create Investment Advisor specific policy
DO $$
BEGIN
    -- Check if there's already a public read policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
        AND (qual = 'true' OR qual LIKE '%Public%')
        AND cmd = 'SELECT'
    ) THEN
        -- Check if Investment Advisor policy exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'users'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
            AND cmd = 'SELECT'
        ) THEN
            -- Create Investment Advisor policy to view users
            CREATE POLICY "Investment Advisors can view users" 
            ON public.users 
            FOR SELECT 
            TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.users advisor
                    WHERE advisor.id = auth.uid()
                    AND advisor.role = 'Investment Advisor'
                )
            );
        END IF;
    END IF;
END $$;

-- Step 5: Check if public read policy exists for startups
-- If not, create Investment Advisor specific policy
DO $$
BEGIN
    -- Check if there's already a public read policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'startups'
        AND (qual = 'true' OR qual LIKE '%Public%')
        AND cmd = 'SELECT'
    ) THEN
        -- Check if Investment Advisor policy exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
            AND cmd = 'SELECT'
        ) THEN
            -- Create Investment Advisor policy to view startups
            CREATE POLICY "Investment Advisors can view startups" 
            ON public.startups 
            FOR SELECT 
            TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.users advisor
                    WHERE advisor.id = auth.uid()
                    AND advisor.role = 'Investment Advisor'
                )
            );
        END IF;
    END IF;
END $$;

-- Step 6: Verification
SELECT 'Step 6: Verification - users table' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Public Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT'
ORDER BY policyname;

SELECT 'Step 7: Verification - startups table' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Public Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT'
ORDER BY policyname;

-- Step 8: Final Status
SELECT 
    'Final Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'users'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) THEN '✅ Users table accessible to Investment Advisors'
        ELSE '❌ Users table NOT accessible to Investment Advisors'
    END as users_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) THEN '✅ Startups table accessible to Investment Advisors'
        ELSE '❌ Startups table NOT accessible to Investment Advisors'
    END as startups_status;





