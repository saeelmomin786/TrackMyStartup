-- =====================================================
-- UPDATE EXISTING TRIGGERS TO USE NEW COMPREHENSIVE FUNCTION
-- =====================================================
-- This script updates the existing triggers for investment_records
-- and founders to use the new comprehensive function that includes
-- mentor and recognition shares.
--
-- SAFE: This only updates the function reference, doesn't change logic
-- The new function preserves all existing functionality (including total_funding)

-- =====================================================
-- STEP 1: VERIFY NEW FUNCTION EXISTS
-- =====================================================

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'update_shares_and_valuation_on_equity_change'
        ) THEN '✅ New function exists - safe to proceed'
        ELSE '❌ New function not found - run FIX_MENTOR_EQUITY_SHARES_VALUATION_UPDATE_SAFE.sql first'
    END as verification;

-- =====================================================
-- STEP 2: UPDATE INVESTMENT_RECORDS TRIGGER
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;

-- Create trigger using the new comprehensive function
CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_and_valuation_on_equity_change();

-- =====================================================
-- STEP 3: UPDATE FOUNDERS TRIGGER
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;

-- Create trigger using the new comprehensive function
CREATE TRIGGER trigger_update_shares_on_founder_change
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_and_valuation_on_equity_change();

-- =====================================================
-- STEP 4: VERIFY ALL TRIGGERS ARE USING NEW FUNCTION
-- =====================================================

SELECT 
    'Verification - All triggers should use new function:' as info,
    t.tgname as trigger_name,
    t.tgrelid::regclass as table_name,
    p.proname as function_name,
    CASE 
        WHEN p.proname = 'update_shares_and_valuation_on_equity_change' THEN '✅ Using new comprehensive function'
        ELSE '❌ Still using old function'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN (
    'trigger_update_shares_on_mentor_equity_change',
    'trigger_update_shares_on_recognition_change',
    'trigger_update_shares_on_investment_change',
    'trigger_update_shares_on_founder_change'
)
ORDER BY t.tgname;

-- =====================================================
-- STEP 5: TEST (OPTIONAL)
-- =====================================================
-- Uncomment and modify to test that triggers work correctly

/*
-- Test: Add a small share change to see if all triggers work together
-- Replace <STARTUP_ID> with an actual startup ID that has founders/investments

-- Get current state
SELECT 
    'Before test:' as test_step,
    ss.total_shares as current_total_shares,
    s.current_valuation
FROM startup_shares ss
JOIN startups s ON ss.startup_id = s.id
WHERE ss.startup_id = <STARTUP_ID>;

-- The triggers should automatically update when you:
-- 1. Add/edit a founder
-- 2. Add/edit an investment
-- 3. Add/edit a mentor with equity
-- 4. Add/edit a recognition with equity

-- After making any of the above changes, check:
SELECT 
    'After test:' as test_step,
    ss.total_shares as new_total_shares,
    s.current_valuation,
    CASE 
        WHEN ss.total_shares = (
            COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = <STARTUP_ID>), 0) +
            COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = <STARTUP_ID>), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM recognition_records 
                WHERE startup_id = <STARTUP_ID>
                AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
                AND shares IS NOT NULL
                AND shares > 0
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM mentor_equity_records 
                WHERE startup_id = <STARTUP_ID>
                AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
                AND shares IS NOT NULL
                AND shares > 0
            ), 0) +
            COALESCE((SELECT esop_reserved_shares FROM startup_shares WHERE startup_id = <STARTUP_ID>), 10000)
        ) THEN '✅ All triggers working correctly'
        ELSE '❌ Mismatch detected'
    END as test_result
FROM startup_shares ss
JOIN startups s ON ss.startup_id = s.id
WHERE ss.startup_id = <STARTUP_ID>;
*/

