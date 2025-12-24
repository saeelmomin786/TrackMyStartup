-- =====================================================
-- FIX STARTUP_SHARES UPDATE AND SELECT RLS POLICIES
-- =====================================================
-- This script fixes the 403 error when trying to update
-- startup_shares data (price_per_share, total_shares, etc.)
-- 
-- Problem: Users get 403 error when trying to upsert/update
-- startup_shares because there's no UPDATE policy.
-- 
-- Solution: Add UPDATE and SELECT policies for startup_shares
-- that allow users to manage shares for startups they own.
-- =====================================================

-- =====================================================
-- STEP 1: CHECK CURRENT STATE
-- =====================================================

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

-- =====================================================
-- STEP 2: ADD SELECT POLICY FOR STARTUP_SHARES
-- =====================================================

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "startup_shares_select_own" ON startup_shares;

-- Create SELECT policy: Allow users to read startup_shares for startups they own
CREATE POLICY "startup_shares_select_own" ON startup_shares
    FOR SELECT 
    USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- Also allow general SELECT for all authenticated users (for viewing)
-- This is useful for investors/advisors who need to see share information
DROP POLICY IF EXISTS "startup_shares_select_all" ON startup_shares;

CREATE POLICY "startup_shares_select_all" ON startup_shares
    FOR SELECT 
    TO authenticated
    USING (true);

-- =====================================================
-- STEP 3: ADD UPDATE POLICY FOR STARTUP_SHARES
-- =====================================================

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "startup_shares_update_own" ON startup_shares;

-- Create UPDATE policy: Allow users to update startup_shares for startups they own
CREATE POLICY "startup_shares_update_own" ON startup_shares
    FOR UPDATE 
    USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 4: GRANT PERMISSIONS
-- =====================================================

-- Ensure authenticated role has UPDATE permission
GRANT UPDATE ON startup_shares TO authenticated;

-- Ensure authenticated role has SELECT permission (if not already granted)
GRANT SELECT ON startup_shares TO authenticated;

-- =====================================================
-- STEP 5: VERIFY POLICIES AND PERMISSIONS
-- =====================================================

SELECT '=== VERIFICATION - POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname, cmd;

SELECT '=== VERIFICATION - GRANTS ===' as info;

SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
    AND table_name = 'startup_shares'
    AND grantee = 'authenticated'
ORDER BY privilege_type;

-- =====================================================
-- STEP 6: TEST POLICY (OPTIONAL - RUN MANUALLY)
-- =====================================================

-- To test, you can run this query as an authenticated user:
-- SELECT * FROM startup_shares WHERE startup_id IN (
--     SELECT id FROM startups WHERE user_id = auth.uid()
-- );
--
-- And try to update:
-- UPDATE startup_shares 
-- SET price_per_share = 10 
-- WHERE startup_id IN (
--     SELECT id FROM startups WHERE user_id = auth.uid()
-- );

-- =====================================================
-- STEP 7: SUMMARY
-- =====================================================

SELECT '=== FIX COMPLETED ===' as info;
SELECT 
    '✅ SELECT policy created for startup_shares (own + all)' as step1,
    '✅ UPDATE policy created for startup_shares (own)' as step2,
    '✅ UPDATE permission granted to authenticated role' as step3,
    '✅ Users can now update price_per_share and other share data' as result;







































