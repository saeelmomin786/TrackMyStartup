-- =====================================================================
-- VERIFICATION QUERIES FOR STARTUP VALUATION FIX
-- =====================================================================
-- Use these queries to verify the trigger is working correctly
-- and that valuations are being updated as expected.
-- =====================================================================

-- =====================================================================
-- Query 1: Verify Trigger Exists
-- =====================================================================
-- Run this to check if the triggers were created successfully
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'investment_records'
ORDER BY trigger_name;

-- Expected Output:
-- ✅ update_valuation_on_investment_insert (AFTER INSERT)
-- ✅ update_valuation_on_investment_update (AFTER UPDATE)


-- =====================================================================
-- Query 2: Check Current Startup Valuations
-- =====================================================================
-- Shows all startups with their current valuations and latest investments
SELECT 
    s.id,
    s.name,
    s.current_valuation as "startup_current_valuation",
    ir.investor_name as "latest_investor",
    ir.post_money_valuation as "latest_post_money",
    ir.date as "investment_date",
    CASE 
        WHEN s.current_valuation = ir.post_money_valuation THEN '✅ MATCH'
        ELSE '⚠️ MISMATCH'
    END as "status"
FROM startups s
LEFT JOIN LATERAL (
    SELECT investor_name, post_money_valuation, date
    FROM investment_records 
    WHERE startup_id = s.id 
    AND post_money_valuation IS NOT NULL 
    AND post_money_valuation > 0
    ORDER BY date DESC, id DESC 
    LIMIT 1
) ir ON true
WHERE s.current_valuation > 0 OR ir.post_money_valuation > 0
ORDER BY s.id
LIMIT 20;

-- Expected Output:
-- ✅ All rows should show "MATCH" status
-- ⚠️ If MISMATCH, the trigger may not have fired or old data exists


-- =====================================================================
-- Query 3: Recent Investment Activity
-- =====================================================================
-- Shows the 10 most recent investments and their valuations
SELECT 
    s.name as "startup_name",
    ir.investor_name,
    ir.amount,
    ir.equity_allocated,
    ir.post_money_valuation,
    ir.date,
    s.current_valuation as "startup_current_valuation",
    CASE 
        WHEN ir.post_money_valuation IS NOT NULL THEN ir.post_money_valuation
        ELSE 0
    END as "expected_current_valuation"
FROM investment_records ir
JOIN startups s ON ir.startup_id = s.id
WHERE ir.post_money_valuation IS NOT NULL 
AND ir.post_money_valuation > 0
ORDER BY ir.date DESC, ir.id DESC
LIMIT 10;

-- Expected Output:
-- Shows the latest investments and whether current_valuation matches


-- =====================================================================
-- Query 4: Trigger Function Exists Check
-- =====================================================================
-- Verifies the trigger function was created
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_startup_current_valuation'
AND routine_schema = 'public';

-- Expected Output:
-- ✅ Should show one row with the trigger function definition


-- =====================================================================
-- Query 5: Valuations by Startup (Detailed)
-- =====================================================================
-- Shows detailed valuation information for each startup
SELECT 
    s.id,
    s.name,
    COUNT(ir.id) as "total_investments",
    s.current_valuation as "current_valuation",
    MAX(ir.post_money_valuation) as "highest_valuation",
    MIN(ir.post_money_valuation) as "lowest_valuation",
    (SELECT post_money_valuation 
     FROM investment_records 
     WHERE startup_id = s.id 
     AND post_money_valuation IS NOT NULL 
     AND post_money_valuation > 0
     ORDER BY date DESC LIMIT 1) as "latest_valuation",
    CASE 
        WHEN s.current_valuation = (
            SELECT post_money_valuation 
            FROM investment_records 
            WHERE startup_id = s.id 
            AND post_money_valuation IS NOT NULL 
            AND post_money_valuation > 0
            ORDER BY date DESC LIMIT 1
        ) THEN '✅ CORRECT'
        ELSE '⚠️ INCORRECT'
    END as "status"
FROM startups s
LEFT JOIN investment_records ir ON s.id = ir.startup_id
WHERE ir.post_money_valuation IS NOT NULL
GROUP BY s.id, s.name, s.current_valuation
ORDER BY s.id;

-- Expected Output:
-- All startups should show "CORRECT" status


-- =====================================================================
-- Query 6: Test the Trigger (Safe Test - Use an Existing Investment)
-- =====================================================================
-- This simulates an update to verify the trigger works
-- NOTE: This will actually update a record, so be careful!
-- 
-- Uncomment and run only for testing:
/*
DO $$
DECLARE
    test_startup_id INTEGER := 1; -- CHANGE THIS TO AN ACTUAL STARTUP ID
    test_new_valuation NUMERIC := 250000; -- The new post-money valuation
BEGIN
    -- Get startup name
    RAISE NOTICE 'Testing trigger for startup ID: %', test_startup_id;
    
    -- Get current valuation before
    SELECT current_valuation FROM startups WHERE id = test_startup_id INTO @before_valuation;
    RAISE NOTICE 'Before: current_valuation = %', @before_valuation;
    
    -- The trigger will automatically fire when we update/insert an investment
    -- So you don't need to manually test it - just add an investment through the UI
    
    RAISE NOTICE 'TEST COMPLETE: Add an investment through UI and check the dashboard';
END $$;
*/


-- =====================================================================
-- Query 7: Find Startups Without Current Valuation
-- =====================================================================
-- Finds startups that may need manual valuation update
SELECT 
    s.id,
    s.name,
    s.current_valuation,
    COUNT(ir.id) as "total_investments",
    MAX(ir.post_money_valuation) as "latest_investment_valuation"
FROM startups s
LEFT JOIN investment_records ir ON s.id = ir.startup_id
WHERE s.current_valuation IS NULL OR s.current_valuation = 0
GROUP BY s.id, s.name, s.current_valuation
ORDER BY COUNT(ir.id) DESC;

-- Expected Output:
-- Shows startups with no current valuation
-- If they have investments, you may want to manually set their valuation


-- =====================================================================
-- Query 8: Valuation Timeline for a Specific Startup
-- =====================================================================
-- Shows how a startup's valuation has changed over time
-- USAGE: Replace "STARTUP_ID" with an actual startup ID (e.g., 1, 2, 3)
SELECT 
    ir.investor_name,
    ir.amount,
    ir.equity_allocated,
    ir.post_money_valuation as "post_money_valuation_this_round",
    ir.date,
    ROW_NUMBER() OVER (ORDER BY ir.date DESC) as "round_number",
    CASE 
        WHEN LAG(ir.post_money_valuation) OVER (ORDER BY ir.date ASC) IS NULL THEN 0
        ELSE ir.post_money_valuation - LAG(ir.post_money_valuation) OVER (ORDER BY ir.date ASC)
    END as "valuation_change"
FROM investment_records ir
WHERE ir.startup_id = 1  -- ⬅️ CHANGE THIS TO THE STARTUP ID YOU WANT
AND ir.post_money_valuation IS NOT NULL
ORDER BY ir.date DESC;

-- Expected Output:
-- Shows valuation progression for the startup
-- Helps you see if valuations are increasing (healthy) or decreasing


-- =====================================================================
-- Query 9: Startup Dashboard Summary
-- =====================================================================
-- A quick dashboard view of key startup metrics
SELECT 
    s.id,
    s.name,
    s.sector,
    s.current_valuation,
    s.total_funding,
    (
        SELECT COUNT(*) 
        FROM investment_records 
        WHERE startup_id = s.id
    ) as "total_investors",
    (
        SELECT MAX(post_money_valuation)
        FROM investment_records 
        WHERE startup_id = s.id
    ) as "highest_valuation",
    (
        SELECT post_money_valuation
        FROM investment_records 
        WHERE startup_id = s.id 
        AND post_money_valuation IS NOT NULL
        ORDER BY date DESC LIMIT 1
    ) as "latest_valuation",
    s.updated_at
FROM startups s
WHERE s.current_valuation > 0
ORDER BY s.current_valuation DESC
LIMIT 20;

-- Expected Output:
-- Current valuation should match the latest valuation


-- =====================================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================================

-- Check if trigger is ENABLED (not disabled)
SELECT 
    tgname as "trigger_name",
    tgenabled as "enabled",
    relname as "table_name"
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE tgname LIKE 'update_valuation%';

-- Expected: Both triggers should show '1' for enabled

-- Check PostgreSQL function permissions
SELECT 
    proname as "function_name",
    proowner::regrole as "owner",
    proacl as "permissions"
FROM pg_proc
WHERE proname = 'update_startup_current_valuation';

-- Check if there are any database errors/warnings in logs
-- (You'll need to check Supabase dashboard for logs)
