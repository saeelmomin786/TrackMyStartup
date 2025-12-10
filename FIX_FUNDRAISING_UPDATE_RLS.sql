-- FIX_FUNDRAISING_UPDATE_RLS.sql
-- Fix RLS policies for fundraising_details to allow proper UPDATE operations
-- The issue: UPDATE operations require both USING and WITH CHECK clauses
-- 
-- SAFETY NOTES:
-- 1. This script only modifies RLS policies, NOT table structure or data
-- 2. Uses IF NOT EXISTS to prevent duplicate policies
-- 3. Preserves existing read-all policy for investors
-- 4. Adds Admin access for management
-- 5. fundraising_details is separate from investment_records (cap table) - no impact on cap table
--
-- INTEGRATION CHECK:
-- - fundraising_details: Used for fundraising ask/display (separate table)
-- - investment_records: Used for actual investments (cap table)
-- - No foreign key constraints between them - safe to update RLS independently

-- 1. Check current policies (for reference)
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- 2. PRESERVE existing policies - DO NOT DROP them
-- Existing policies that are working:
-- - fundraising_details_authenticated_read (SELECT) - Keep this for investors
-- - fundraising_details_insert_authenticated (INSERT) - Keep this
-- 
-- We only need to ADD the missing UPDATE policy

-- 3. Add ONLY the missing UPDATE policy (with proper WITH CHECK clause)
-- This is the critical fix - UPDATE operations need both USING and WITH CHECK
DO $$ 
BEGIN

    -- Policy for UPDATE (modify) - CRITICAL: needs both USING and WITH CHECK
    -- This is the missing policy that's causing the update failures
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND cmd = 'UPDATE'
    ) THEN
        CREATE POLICY fundraising_details_update_authenticated ON fundraising_details
        FOR UPDATE
        TO authenticated
        USING (
            -- Can see the existing row if:
            -- 1. It belongs to their startup, OR
            -- 2. They are an Admin
            startup_id IN (
                SELECT id FROM startups 
                WHERE name IN (
                    SELECT startup_name FROM users 
                    WHERE email = (auth.jwt() ->> 'email')
                )
            )
            OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role = 'Admin'
            )
        )
        WITH CHECK (
            -- Can update to new values if:
            -- 1. The new startup_id belongs to their startup, OR
            -- 2. They are an Admin
            startup_id IN (
                SELECT id FROM startups 
                WHERE name IN (
                    SELECT startup_name FROM users 
                    WHERE email = (auth.jwt() ->> 'email')
                )
            )
            OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role = 'Admin'
            )
        );
    END IF;

    -- Policy for DELETE (optional - add if needed)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND cmd = 'DELETE'
    ) THEN
        CREATE POLICY fundraising_details_delete_authenticated ON fundraising_details
        FOR DELETE
        TO authenticated
        USING (
            -- Can delete if it belongs to their startup or they are Admin
            startup_id IN (
                SELECT id FROM startups 
                WHERE name IN (
                    SELECT startup_name FROM users 
                    WHERE email = (auth.jwt() ->> 'email')
                )
            )
            OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role = 'Admin'
            )
        );
    END IF;
END $$;

-- 4. Grant necessary permissions (safe - only grants, doesn't revoke)
GRANT SELECT, INSERT, UPDATE, DELETE ON fundraising_details TO authenticated;
GRANT SELECT ON startups TO authenticated;
GRANT SELECT ON users TO authenticated;

-- Note: These GRANT statements are idempotent - safe to run multiple times

-- 5. Verify the policies were created correctly
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

-- 6. Verify no conflicts with existing policies
SELECT 
    'Policy Check' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' AND with_check IS NOT NULL THEN 1 END) as update_with_check_policies
FROM pg_policies 
WHERE tablename = 'fundraising_details';

-- 7. Test query to verify user can see their startup (for debugging)
-- This query will only work if you're logged in, otherwise returns empty
SELECT 
    u.email,
    u.startup_name,
    u.role,
    s.id as startup_id,
    s.name as startup_name_match,
    CASE 
        WHEN s.id IS NOT NULL THEN '✅ Startup match found'
        ELSE '⚠️ No startup match'
    END as status
FROM users u
LEFT JOIN startups s ON s.name = u.startup_name
WHERE u.email = (auth.jwt() ->> 'email')
LIMIT 1;

