-- CHECK_STARTUPS_RLS_POLICIES.sql
-- Check current RLS policies on the startups table
-- This will help identify why startup creation is failing with 403 error

-- 1. Check if RLS is enabled on startups table
SELECT '=== RLS STATUS ===' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'startups';

-- 2. List all current RLS policies on startups table
SELECT '=== CURRENT RLS POLICIES ===' as info;

SELECT 
    policyname,
    cmd as command,  -- SELECT, INSERT, UPDATE, DELETE, or ALL
    permissive,     -- PERMISSIVE or RESTRICTIVE
    roles,          -- Which roles this applies to
    qual as using_expression,  -- The USING clause (for SELECT, UPDATE, DELETE)
    with_check as with_check_expression  -- The WITH CHECK clause (for INSERT, UPDATE)
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

-- 3. Check if there are any policies that allow INSERT
SELECT '=== INSERT POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'startups'
AND (cmd = 'INSERT' OR cmd = 'ALL')
ORDER BY policyname;

-- 4. Check grants on the startups table
SELECT '=== TABLE GRANTS ===' as info;

SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'startups'
ORDER BY grantee, privilege_type;

-- 5. Test if current user can insert (this will show the actual error)
SELECT '=== TEST INSERT PERMISSION ===' as info;

-- This will show if the user has permission to insert
-- Note: This is a dry-run check, not an actual insert
SELECT 
    has_table_privilege('public.startups', 'INSERT') as can_insert,
    has_table_privilege('public.startups', 'SELECT') as can_select,
    has_table_privilege('public.startups', 'UPDATE') as can_update;

-- 6. Check the current authenticated user
SELECT '=== CURRENT USER INFO ===' as info;

SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    current_user as database_user;

-- 7. Check if user_id column exists and its type
SELECT '=== STARTUPS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'startups'
AND column_name = 'user_id';

-- 8. Sample query to see what the policy would check
SELECT '=== POLICY CHECK SIMULATION ===' as info;

-- This simulates what the RLS policy would check
SELECT 
    auth.uid() as user_id_from_auth,
    'This is what RLS policies check against' as note;

