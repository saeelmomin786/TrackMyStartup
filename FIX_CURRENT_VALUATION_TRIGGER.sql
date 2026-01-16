-- =================================================================
-- FIX: CURRENT VALUATION AUTO-UPDATE TRIGGER
-- =================================================================
-- Issue: Current valuation is not automatically updated when new 
-- investment records are added. This causes the dashboard to show
-- outdated valuation information.
--
-- Solution: Create a trigger that automatically updates the 
-- startup's current_valuation whenever an investment record is 
-- inserted or updated.
-- =================================================================

-- Step 1: Create trigger function to update startup current_valuation
CREATE OR REPLACE FUNCTION update_startup_current_valuation()
RETURNS TRIGGER AS $$
DECLARE
    latest_post_money_val NUMERIC;
    startup_id_var INTEGER;
BEGIN
    -- Get the startup_id from the inserted/updated row
    startup_id_var := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Get the latest post-money valuation from investment records
    SELECT post_money_valuation INTO latest_post_money_val
    FROM investment_records 
    WHERE startup_id = startup_id_var 
    AND post_money_valuation IS NOT NULL 
    AND post_money_valuation > 0
    ORDER BY date DESC, id DESC 
    LIMIT 1;
    
    -- If we found a post-money valuation, update the startup
    IF latest_post_money_val IS NOT NULL AND latest_post_money_val > 0 THEN
        UPDATE startups 
        SET 
            current_valuation = latest_post_money_val,
            updated_at = NOW()
        WHERE id = startup_id_var;
        
        RAISE NOTICE 'Updated startup % current_valuation to %', startup_id_var, latest_post_money_val;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_valuation_on_investment_insert ON investment_records;
DROP TRIGGER IF EXISTS update_valuation_on_investment_update ON investment_records;

-- Step 3: Create trigger for INSERT operations
CREATE TRIGGER update_valuation_on_investment_insert
AFTER INSERT ON investment_records
FOR EACH ROW
EXECUTE FUNCTION update_startup_current_valuation();

-- Step 4: Create trigger for UPDATE operations
CREATE TRIGGER update_valuation_on_investment_update
AFTER UPDATE ON investment_records
FOR EACH ROW
WHEN (OLD.post_money_valuation IS DISTINCT FROM NEW.post_money_valuation)
EXECUTE FUNCTION update_startup_current_valuation();

-- Step 5: Backfill current valuations for all startups
-- This ensures all existing startups have the correct current valuation
DO $$
DECLARE
    startup_record RECORD;
    latest_post_money_valuation NUMERIC;
BEGIN
    FOR startup_record IN SELECT id FROM startups LOOP
        -- Get the latest post-money valuation
        SELECT COALESCE(
            (SELECT post_money_valuation 
             FROM investment_records 
             WHERE startup_id = startup_record.id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date DESC, id DESC 
             LIMIT 1),
            (SELECT current_valuation FROM startups WHERE id = startup_record.id)
        ) INTO latest_post_money_valuation;
        
        -- Update the startup if we found a valuation
        IF latest_post_money_valuation IS NOT NULL AND latest_post_money_valuation > 0 THEN
            UPDATE startups 
            SET 
                current_valuation = latest_post_money_valuation,
                updated_at = NOW()
            WHERE id = startup_record.id;
            
            RAISE NOTICE 'Backfilled startup % with valuation %', startup_record.id, latest_post_money_valuation;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Backfill complete: Updated all startup valuations';
END $$;

-- Step 6: Verification
SELECT 
    '✅ VERIFICATION: Startup current valuations' as info,
    s.id,
    s.name,
    s.current_valuation,
    ir.investor_name,
    ir.post_money_valuation,
    ir.date as latest_investment_date
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
WHERE s.current_valuation IS NOT NULL AND s.current_valuation > 0
ORDER BY s.id;

-- Step 7: Test the trigger with a new investment
-- Uncomment this section to test (create a test investment and verify the valuation updates)
/*
-- Test case: Create a test investment and verify trigger works
DO $$
DECLARE
    test_startup_id INTEGER := 1; -- Change to an actual startup ID
    test_before_valuation NUMERIC;
    test_after_valuation NUMERIC;
BEGIN
    -- Get current valuation before
    SELECT current_valuation INTO test_before_valuation 
    FROM startups WHERE id = test_startup_id;
    
    RAISE NOTICE 'TEST: Before valuation = %', test_before_valuation;
    
    -- Simulate inserting a new investment (just for verification, don't actually insert)
    RAISE NOTICE 'TEST: Trigger would update valuation when new investment is added';
    
    -- Get current valuation after (in real scenario, you would insert here)
    SELECT current_valuation INTO test_after_valuation 
    FROM startups WHERE id = test_startup_id;
    
    RAISE NOTICE 'TEST: After valuation = %', test_after_valuation;
END $$;
*/
