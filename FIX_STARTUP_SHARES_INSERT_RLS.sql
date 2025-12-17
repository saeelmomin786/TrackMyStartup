-- =====================================================
-- FIX STARTUP_SHARES INSERT RLS FOR TRIGGERS
-- =====================================================
-- This script fixes the RLS policy issue that prevents triggers
-- from inserting into startup_shares when a new startup is created.
-- 
-- Problem: When a startup is created, a trigger tries to insert
-- into startup_shares, but RLS blocks it.
-- 
-- Solution: 
-- 1. Add INSERT policy for startup_shares that allows users to insert
--    when they own the startup (via user_id in startups table)
-- 2. Update trigger function to use SECURITY DEFINER (bypasses RLS)
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
-- STEP 2: ADD INSERT POLICY FOR STARTUP_SHARES
-- =====================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "startup_shares_insert_own" ON startup_shares;

-- Create INSERT policy: Allow users to insert startup_shares for startups they own
CREATE POLICY "startup_shares_insert_own" ON startup_shares
    FOR INSERT 
    WITH CHECK (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 3: UPDATE TRIGGER FUNCTION TO USE SECURITY DEFINER
-- =====================================================

-- This allows the trigger to bypass RLS when inserting startup_shares
CREATE OR REPLACE FUNCTION initialize_startup_shares()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default startup_shares record for new startup
    INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
    VALUES (NEW.id, 0, 10000, 0, NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update other trigger function names if they exist
CREATE OR REPLACE FUNCTION initialize_startup_shares_with_esop()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert startup_shares record with default ESOP of 10000
    INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
    VALUES (NEW.id, 0, 10000, 0, NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: ENSURE TRIGGER EXISTS
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_initialize_startup_shares ON startups;
DROP TRIGGER IF EXISTS trigger_initialize_startup_shares_with_esop ON startups;

-- Create trigger for new startups
CREATE TRIGGER trigger_initialize_startup_shares
    AFTER INSERT ON startups
    FOR EACH ROW EXECUTE FUNCTION initialize_startup_shares();

-- =====================================================
-- STEP 5: VERIFY POLICIES AND FUNCTIONS
-- =====================================================

SELECT '=== VERIFICATION - POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

SELECT '=== VERIFICATION - FUNCTIONS ===' as info;

SELECT 
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN ('initialize_startup_shares', 'initialize_startup_shares_with_esop')
ORDER BY proname;

SELECT '=== VERIFICATION - TRIGGERS ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%initialize_startup_shares%'
ORDER BY trigger_name;

-- =====================================================
-- STEP 6: SUMMARY
-- =====================================================

SELECT '=== FIX COMPLETED ===' as info;
SELECT 
    '✅ INSERT policy created for startup_shares' as step1,
    '✅ Trigger function updated to use SECURITY DEFINER' as step2,
    '✅ Trigger recreated to use updated function' as step3,
    '✅ Users can now create startups and startup_shares will be auto-created' as result;


