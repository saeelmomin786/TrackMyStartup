-- CLEANUP_OLD_FUNDRAISING_POLICIES.sql
-- Remove old/duplicate RLS policies that may conflict with new policies
-- This script safely removes old policies that use the old authentication method

-- 1. Check current policies before cleanup
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname, cmd;

-- 2. Drop old policies that may conflict
-- These policies might be using the old users.startup_name check
DROP POLICY IF EXISTS fundraising_details_authenticated_read ON fundraising_details;
DROP POLICY IF EXISTS fundraising_details_insert_authenticated ON fundraising_details;

-- Note: We keep these policies as they serve specific purposes:
-- - fundraising_details_public_read (for anonymous/public access)
-- - fundraising_details_read_all (for investors to see all active fundraising)
-- - fundraising_details_select_own (for users to read their own)
-- - fundraising_details_insert_own (for users to insert their own)
-- - fundraising_details_update_own (for users to update their own)
-- - fundraising_details_delete_own (for users to delete their own)

-- 3. Verify policies after cleanup
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_status,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_status
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname, cmd;

-- Expected policies after cleanup:
-- - fundraising_details_delete_own (DELETE)
-- - fundraising_details_insert_own (INSERT)
-- - fundraising_details_public_read (SELECT for anon)
-- - fundraising_details_read_all (SELECT for authenticated - all active)
-- - fundraising_details_select_own (SELECT for authenticated - own)
-- - fundraising_details_update_own (UPDATE)



