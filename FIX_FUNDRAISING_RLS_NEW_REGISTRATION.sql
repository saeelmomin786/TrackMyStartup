-- FIX_FUNDRAISING_RLS_NEW_REGISTRATION.sql
-- Fix RLS policies for fundraising_details to work with new registration flow
-- 
-- ISSUE: The RLS policies were checking the 'users' table's 'startup_name' field,
-- but new registrations use 'user_profiles' and 'startups.user_id' (auth_user_id).
-- 
-- SOLUTION: Update policies to check startups.user_id = auth.uid() instead
-- This works for both old and new registrations since startups.user_id is always auth_user_id

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

-- 2. Drop old policies that check users.startup_name (these don't work for new registrations)
-- Also drop any duplicate policies that might conflict
DROP POLICY IF EXISTS "Users can view their own startup's fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS "Startup users can manage their own fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS fundraising_details_update_authenticated ON fundraising_details;
DROP POLICY IF EXISTS fundraising_details_delete_authenticated ON fundraising_details;
DROP POLICY IF EXISTS fundraising_details_owner_manage ON fundraising_details;
-- Drop old policies that might be using old authentication method
DROP POLICY IF EXISTS fundraising_details_authenticated_read ON fundraising_details;
DROP POLICY IF EXISTS fundraising_details_insert_authenticated ON fundraising_details;

-- 3. Create new policies that check startups.user_id = auth.uid()
-- This works for both old and new registrations

-- Policy for SELECT (read) - allow users to read their own startup's fundraising details
-- Also allow all authenticated users to read active fundraising (for investors)
DO $$ 
BEGIN
    -- Policy for reading own startup's fundraising details
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_select_own'
    ) THEN
        CREATE POLICY fundraising_details_select_own ON fundraising_details
        FOR SELECT
        TO authenticated
        USING (
            -- Can read if it belongs to their startup
            startup_id IN (
                SELECT id FROM startups 
                WHERE user_id = auth.uid()
            )
            OR
            -- Or if they are an Admin
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Admin'
            )
        );
    END IF;

    -- Policy for reading all active fundraising (for investors)
    -- This allows investors to see all active fundraising opportunities
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_read_all'
    ) THEN
        CREATE POLICY fundraising_details_read_all ON fundraising_details
        FOR SELECT
        TO authenticated
        USING (active = true);
    END IF;
END $$;

-- Policy for INSERT (create) - allow users to create fundraising details for their startup
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_insert_own'
    ) THEN
        CREATE POLICY fundraising_details_insert_own ON fundraising_details
        FOR INSERT
        TO authenticated
        WITH CHECK (
            -- Can insert if it belongs to their startup
            startup_id IN (
                SELECT id FROM startups 
                WHERE user_id = auth.uid()
            )
            OR
            -- Or if they are an Admin
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Admin'
            )
        );
    END IF;
END $$;

-- Policy for UPDATE (modify) - CRITICAL: needs both USING and WITH CHECK
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_update_own'
    ) THEN
        CREATE POLICY fundraising_details_update_own ON fundraising_details
        FOR UPDATE
        TO authenticated
        USING (
            -- Can see the existing row if it belongs to their startup
            startup_id IN (
                SELECT id FROM startups 
                WHERE user_id = auth.uid()
            )
            OR
            -- Or if they are an Admin
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Admin'
            )
        )
        WITH CHECK (
            -- Can update to new values if it belongs to their startup
            startup_id IN (
                SELECT id FROM startups 
                WHERE user_id = auth.uid()
            )
            OR
            -- Or if they are an Admin
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Admin'
            )
        );
    END IF;
END $$;

-- Policy for DELETE (optional - add if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fundraising_details' 
        AND policyname = 'fundraising_details_delete_own'
    ) THEN
        CREATE POLICY fundraising_details_delete_own ON fundraising_details
        FOR DELETE
        TO authenticated
        USING (
            -- Can delete if it belongs to their startup
            startup_id IN (
                SELECT id FROM startups 
                WHERE user_id = auth.uid()
            )
            OR
            -- Or if they are an Admin
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Admin'
            )
        );
    END IF;
END $$;

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON fundraising_details TO authenticated;
GRANT SELECT ON startups TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;

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

-- 6. Test query to verify user can see their startup (for debugging)
-- This query will only work if you're logged in, otherwise returns empty
SELECT 
    auth.uid() as current_auth_user_id,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as startup_user_id,
    CASE 
        WHEN s.id IS NOT NULL AND s.user_id = auth.uid() THEN '✅ Startup match found'
        WHEN s.id IS NOT NULL THEN '⚠️ Startup exists but user_id mismatch'
        ELSE '⚠️ No startup found for this user'
    END as status
FROM startups s
WHERE s.user_id = auth.uid()
LIMIT 1;

