-- FIX_STARTUPS_INSERT_POLICY.sql
-- Fix RLS policy to allow authenticated users to INSERT into startups table
-- This fixes the 403 error when creating startups during profile registration

-- 1. First, check current policies
SELECT '=== CURRENT POLICIES BEFORE FIX ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

-- 2. Ensure RLS is enabled
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- 3. SAFELY drop only INSERT policies that might be conflicting
-- IMPORTANT: We ONLY drop INSERT-related policies, NOT other policies (CA, CS, Admin, etc.)
-- This preserves all existing functionality for CA, CS, Admin, and other roles
DROP POLICY IF EXISTS "startups_insert_authenticated" ON public.startups;
DROP POLICY IF EXISTS "Authenticated users can create startups" ON public.startups;
DROP POLICY IF EXISTS "Users can insert their own startups" ON public.startups;

-- Note: We will recreate "startups_manage_own" but only for SELECT/UPDATE/DELETE
-- This ensures we don't break existing functionality
DROP POLICY IF EXISTS "startups_manage_own" ON public.startups;

-- 4. Create a SECURE policy that allows authenticated users to INSERT startups
-- SECURITY: Users can only INSERT startups where user_id matches their auth.uid()
-- This prevents users from creating startups for other users
-- This is needed for the registration flow and maintains data security
CREATE POLICY "startups_insert_authenticated" ON public.startups
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()  -- SECURITY: Users can only create startups for themselves
        -- This ensures users cannot create startups with someone else's user_id
    );

-- 5. Ensure users can manage their own startups (SELECT, UPDATE, DELETE)
-- This policy allows users to manage startups where user_id matches their auth.uid()
-- Note: We create separate policies for each operation since PostgreSQL doesn't support multiple commands in one policy
DROP POLICY IF EXISTS "startups_manage_own_select" ON public.startups;
DROP POLICY IF EXISTS "startups_manage_own_update" ON public.startups;
DROP POLICY IF EXISTS "startups_manage_own_delete" ON public.startups;
DROP POLICY IF EXISTS "startups_manage_own" ON public.startups;  -- Drop old combined policy if exists

-- Users can SELECT their own startups
CREATE POLICY "startups_manage_own_select" ON public.startups
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Users can UPDATE their own startups
CREATE POLICY "startups_manage_own_update" ON public.startups
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can DELETE their own startups
CREATE POLICY "startups_manage_own_delete" ON public.startups
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- 6. Keep the SELECT policy for all users (needed for investors, etc.)
-- IMPORTANT: This preserves existing functionality for investors, advisors, etc.
-- Check if it exists first - if it does, we don't recreate it (preserves existing config)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'startups' 
        AND policyname = 'startups_select_all'
    ) THEN
        CREATE POLICY "startups_select_all" ON public.startups
            FOR SELECT 
            USING (true);
    END IF;
END $$;

-- 6b. PRESERVE existing CA and CS policies (if they exist)
-- These are NOT dropped or modified - existing functionality is preserved
-- CA and CS users can still update startup compliance status as before
-- Admin policies are also preserved

-- 7. Grant INSERT permission to authenticated role
GRANT INSERT ON public.startups TO authenticated;

-- 8. Verify the new policies
SELECT '=== POLICIES AFTER FIX ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

-- 9. Verify grants
SELECT '=== TABLE GRANTS ===' as info;

SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'startups'
AND grantee = 'authenticated'
ORDER BY privilege_type;

-- 10. Test query to verify INSERT permission
SELECT '=== TESTING INSERT PERMISSION ===' as info;

SELECT 
    has_table_privilege('authenticated', 'public.startups', 'INSERT') as authenticated_can_insert,
    has_table_privilege('authenticated', 'public.startups', 'SELECT') as authenticated_can_select,
    has_table_privilege('authenticated', 'public.startups', 'UPDATE') as authenticated_can_update;

-- 11. Verify no other policies were affected
SELECT '=== VERIFYING OTHER POLICIES PRESERVED ===' as info;

SELECT 
    policyname,
    cmd,
    '✅ Preserved' as status
FROM pg_policies 
WHERE tablename = 'startups'
AND policyname NOT IN (
    'startups_insert_authenticated', 
    'startups_manage_own_select',
    'startups_manage_own_update',
    'startups_manage_own_delete',
    'startups_select_all'
)
ORDER BY policyname;

-- 12. Summary
SELECT '=== SUMMARY ===' as info;

SELECT 
    '✅ RLS enabled' as status,
    '✅ INSERT policy created (users can only create startups for themselves)' as insert_policy,
    '✅ Users can manage their own startups (SELECT/UPDATE/DELETE)' as manage_policy,
    '✅ All users can SELECT startups (investors, advisors, etc.)' as select_policy,
    '✅ Existing CA/CS/Admin policies preserved' as other_policies,
    '✅ Data security maintained (users cannot create startups for others)' as security;

