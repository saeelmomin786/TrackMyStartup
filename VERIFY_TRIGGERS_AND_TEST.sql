-- =====================================================
-- VERIFY TRIGGERS AND TEST FUNCTIONALITY
-- =====================================================
-- This script helps verify that all triggers are working correctly
-- and shows which functions they're using

-- =====================================================
-- STEP 1: CHECK WHICH FUNCTIONS EACH TRIGGER IS USING
-- =====================================================

SELECT 
    'Trigger function mapping:' as info,
    t.tgname as trigger_name,
    t.tgrelid::regclass as table_name,
    p.proname as function_name,
    CASE 
        WHEN p.proname = 'update_shares_and_valuation_on_equity_change' THEN '✅ Using new comprehensive function'
        ELSE '⚠️ Using old function (may not include mentor/recognition shares)'
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
-- STEP 2: CHECK IF EXISTING TRIGGERS NEED UPDATING
-- =====================================================

-- Check if investment_records trigger is using the new function
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_trigger t
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE t.tgname = 'trigger_update_shares_on_investment_change'
            AND p.proname = 'update_shares_and_valuation_on_equity_change'
        ) THEN '✅ Investment trigger is using new function'
        ELSE '⚠️ Investment trigger needs to be updated to use new function'
    END as investment_trigger_status;

-- Check if founders trigger is using the new function
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_trigger t
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE t.tgname = 'trigger_update_shares_on_founder_change'
            AND p.proname = 'update_shares_and_valuation_on_equity_change'
        ) THEN '✅ Founders trigger is using new function'
        ELSE '⚠️ Founders trigger needs to be updated to use new function'
    END as founders_trigger_status;

-- =====================================================
-- STEP 3: SHOW CURRENT SHARE CALCULATIONS
-- =====================================================

-- Show a sample startup with all share sources
SELECT 
    'Sample startup share breakdown:' as info,
    s.id,
    s.name,
    s.current_valuation,
    ss.total_shares as stored_total_shares,
    -- Calculate what total should be
    (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = s.id), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM recognition_records 
            WHERE startup_id = s.id
            AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
            AND shares IS NOT NULL
            AND shares > 0
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM mentor_equity_records 
            WHERE startup_id = s.id
            AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
            AND shares IS NOT NULL
            AND shares > 0
        ), 0) +
        COALESCE(ss.esop_reserved_shares, 10000)
    ) as calculated_total_shares,
    -- Show breakdown
    COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = s.id), 0) as founder_shares,
    COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id), 0) as investor_shares,
    COALESCE((
        SELECT SUM(shares) 
        FROM recognition_records 
        WHERE startup_id = s.id
        AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
        AND shares IS NOT NULL
        AND shares > 0
    ), 0) as recognition_shares,
    COALESCE((
        SELECT SUM(shares) 
        FROM mentor_equity_records 
        WHERE startup_id = s.id
        AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
        AND shares IS NOT NULL
        AND shares > 0
    ), 0) as mentor_shares
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE EXISTS (
    SELECT 1 FROM mentor_equity_records 
    WHERE startup_id = s.id 
    AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
    AND shares IS NOT NULL
    AND shares > 0
)
LIMIT 5;

-- =====================================================
-- STEP 4: TEST TRIGGER (OPTIONAL - FOR TESTING)
-- =====================================================
-- Uncomment this section to test if triggers work
-- Replace <STARTUP_ID> and <TEST_MENTOR_ID> with actual IDs

/*
-- Test: Update a mentor record and see if shares update
-- First, note the current total_shares
SELECT 
    'Before update:' as test_step,
    ss.total_shares as current_total_shares
FROM startup_shares ss
WHERE ss.startup_id = <STARTUP_ID>;

-- Update a mentor record (this should trigger the update)
UPDATE mentor_equity_records
SET shares = shares + 1  -- Add 1 share for testing
WHERE id = <TEST_MENTOR_ID>
AND startup_id = <STARTUP_ID>;

-- Check if total_shares was updated
SELECT 
    'After update:' as test_step,
    ss.total_shares as new_total_shares,
    CASE 
        WHEN ss.total_shares = (
            SELECT 
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
        ) THEN '✅ Trigger working correctly'
        ELSE '❌ Trigger not working - shares mismatch'
    END as trigger_status
FROM startup_shares ss
WHERE ss.startup_id = <STARTUP_ID>;

-- Revert the test change
UPDATE mentor_equity_records
SET shares = shares - 1
WHERE id = <TEST_MENTOR_ID>
AND startup_id = <STARTUP_ID>;
*/

-- =====================================================
-- STEP 5: RECOMMENDATION
-- =====================================================

SELECT 
    'Recommendation:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_trigger t
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE t.tgname IN ('trigger_update_shares_on_investment_change', 'trigger_update_shares_on_founder_change')
            AND p.proname != 'update_shares_and_valuation_on_equity_change'
        ) THEN 'Update existing triggers (investment_records and founders) to use the new comprehensive function for consistency. See Step 3 in FIX_MENTOR_EQUITY_SHARES_VALUATION_UPDATE_SAFE.sql'
        ELSE 'All triggers are using the new comprehensive function. Everything should be working correctly!'
    END as recommendation;

