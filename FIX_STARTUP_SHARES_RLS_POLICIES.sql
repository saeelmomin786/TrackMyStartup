-- FIX_STARTUP_SHARES_RLS_POLICIES.sql
-- Fix RLS policies for startup_shares table to allow facilitator access
-- This resolves the 403 Forbidden error when facilitators try to save price per share data

-- 1. Check current RLS status and policies
SELECT '=== CURRENT RLS STATUS ===' as info;        

SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'startup_shares';

SELECT '=== CURRENT POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

-- 2. Drop existing restrictive policies
SELECT '=== DROPPING RESTRICTIVE POLICIES ===' as info;

DROP POLICY IF EXISTS "Users can view their own startup's shares" ON startup_shares;
DROP POLICY IF EXISTS "Startup users can manage their own shares" ON startup_shares;

-- 3. Create comprehensive RLS policies that include facilitator access
SELECT '=== CREATING NEW COMPREHENSIVE POLICIES ===' as info;

-- Policy 1: Allow users to view their own startup's shares
CREATE POLICY "startup_shares_select_own" ON startup_shares
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE name IN (
                SELECT startup_name FROM users 
                WHERE email = auth.jwt() ->> 'email'
            )
        )
    );

-- Policy 2: Allow facilitators, admins, CA, CS to view all startup shares
CREATE POLICY "startup_shares_select_facilitators" ON startup_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'CA', 'CS', 'Startup Facilitation Center')
        )
    );

-- Policy 3: Allow startup owners to manage their own shares
CREATE POLICY "startup_shares_manage_own" ON startup_shares
    FOR ALL USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE name IN (
                SELECT startup_name FROM users 
                WHERE email = auth.jwt() ->> 'email'
            )
        )
    );

-- Policy 4: Allow facilitators, admins, CA, CS to manage all startup shares
CREATE POLICY "startup_shares_manage_facilitators" ON startup_shares
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'CA', 'CS', 'Startup Facilitation Center')
        )
    );

-- 4. Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON startup_shares TO authenticated;

-- 5. Verify the policies were created
SELECT '=== VERIFICATION - NEW POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

-- 6. Test access for different user roles
SELECT '=== TESTING ACCESS ===' as info;

-- Test that the policies work by checking if we can query the table
SELECT COUNT(*) as can_access_startup_shares FROM startup_shares;

-- 7. Additional helper function to check user permissions
CREATE OR REPLACE FUNCTION can_access_startup_shares(p_startup_id INTEGER DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin, CA, CS, or facilitator (can access all)
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('Admin', 'CA', 'CS', 'Startup Facilitation Center')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user owns the specific startup (if startup_id provided)
    IF p_startup_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM startups 
            WHERE id = p_startup_id 
            AND name IN (
                SELECT startup_name FROM users 
                WHERE email = auth.jwt() ->> 'email'
            )
        );
    END IF;
    
    -- Check if user owns any startup
    RETURN EXISTS (
        SELECT 1 FROM startups 
        WHERE name IN (
            SELECT startup_name FROM users 
            WHERE email = auth.jwt() ->> 'email'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create a test query to verify facilitator access
SELECT '=== FACILITATOR ACCESS TEST ===' as info;

-- This should work for facilitators
SELECT 
    ss.startup_id,
    ss.total_shares,
    ss.price_per_share,
    ss.esop_reserved_shares,
    s.name as startup_name
FROM startup_shares ss
LEFT JOIN startups s ON ss.startup_id = s.id
LIMIT 5;

SELECT '=== FIX COMPLETED ===' as info;
SELECT 'Startup shares RLS policies have been updated to allow facilitator access.' as result;
