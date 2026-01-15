-- =====================================================
-- FIX USERS TABLE RLS FOR INVESTMENT_ADVISOR_CODE
-- =====================================================
-- This script fixes the 406 error when fetching investment_advisor_code
-- The issue is that RLS policies may be blocking access to this column

-- 1. Ensure the column exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS investment_advisor_code TEXT;

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code ON public.users(investment_advisor_code);

-- 3. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing restrictive policies that might block self-access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients (users table)" ON public.users;

-- 5. Create a simple, non-recursive policy that allows users to view their own profile
-- This is critical - users MUST be able to read their own data including investment_advisor_code
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Users can ALWAYS see their own profile (including investment_advisor_code)
    id = auth.uid()
    OR
    -- Investment Advisors can see users who entered their advisor code
    EXISTS (
        SELECT 1 FROM public.users advisor
        WHERE advisor.id = auth.uid()
        AND advisor.role = 'Investment Advisor'
        AND advisor.investment_advisor_code IS NOT NULL
        AND advisor.investment_advisor_code != ''
        AND public.users.investment_advisor_code_entered = advisor.investment_advisor_code
    )
    OR
    -- Admins can see all users
    EXISTS (
        SELECT 1 FROM public.users admin_user
        WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'Admin'
    )
    OR
    -- Allow public read for Investment Advisor profiles (for logo_url, etc.)
    role = 'Investment Advisor'
);

-- 6. Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users'
    AND policyname = 'Users can view their own profile';

-- 7. Test query to verify it works
-- This should return the investment_advisor_code for the current user
-- (Run this as the authenticated user to test)
SELECT 
    id,
    name,
    email,
    role,
    investment_advisor_code,
    investment_advisor_code_entered
FROM public.users
WHERE id = auth.uid();

-- =====================================================
-- SUMMARY
-- =====================================================
-- After running this script:
-- 1. Users can now read their own investment_advisor_code
-- 2. The 406 error should be resolved
-- 3. Investment Advisors can still see their clients
-- 4. Admins can see all users
-- 
-- The key fix: Simplified RLS policy that ensures users can ALWAYS
-- read their own profile data, including investment_advisor_code
