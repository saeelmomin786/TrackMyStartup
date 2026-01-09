-- =====================================================
-- FIX MENTOR EQUITY RECORDS SHARES AND VALUATION UPDATE (SAFE VERSION)
-- =====================================================
-- This script fixes the bug where adding a mentor with equity
-- does not update the current_valuation and total_shares in startup_shares
--
-- SAFETY FEATURES:
-- 1. Preserves existing functionality (e.g., total_funding updates)
-- 2. Only adds new triggers (doesn't replace existing ones unless necessary)
-- 3. Makes recalculation optional (commented out by default)
-- 4. Includes verification queries to check impact before applying

-- =====================================================
-- STEP 0: CHECK EXISTING TRIGGERS AND FUNCTIONS
-- =====================================================

-- Check what triggers currently exist
SELECT 
    'Current triggers that will be affected:' as info,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname IN (
    'trigger_update_shares_on_investment_change',
    'trigger_update_shares_on_founder_change',
    'trigger_update_shares_on_mentor_equity_change',
    'trigger_update_shares_on_recognition_change'
)
ORDER BY tgname;

-- Check what functions currently exist
SELECT 
    'Current functions:' as info,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname IN (
    'update_shares_on_investment_change',
    'update_startup_shares_on_investment_change',
    'update_shares_on_founder_change',
    'update_startup_shares_on_founder_change',
    'update_shares_and_valuation_on_equity_change'
)
ORDER BY proname;

-- =====================================================
-- STEP 1: CREATE NEW FUNCTION (PRESERVES EXISTING FUNCTIONALITY)
-- =====================================================

-- Create a comprehensive function that includes ALL functionality
CREATE OR REPLACE FUNCTION update_shares_and_valuation_on_equity_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL(15, 2);
    latest_post_money_valuation DECIMAL(15, 2);
    startup_exists BOOLEAN;
BEGIN
    -- Get startup_id from NEW or OLD record
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Check if startup exists
    SELECT EXISTS(SELECT 1 FROM startups WHERE id = target_startup_id) INTO startup_exists;
    
    -- Only proceed if startup exists
    IF startup_exists THEN
        -- Calculate new total shares including ALL sources:
        -- 1. Founders shares
        -- 2. Investment records shares
        -- 3. Recognition records shares (Equity or Hybrid fee types)
        -- 4. Mentor equity records shares (Equity or Hybrid fee types)
        -- 5. ESOP reserved shares
        new_total_shares := (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = target_startup_id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = target_startup_id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM recognition_records 
                WHERE startup_id = target_startup_id
                AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
                AND shares IS NOT NULL
                AND shares > 0
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM mentor_equity_records 
                WHERE startup_id = target_startup_id
                AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
                AND shares IS NOT NULL
                AND shares > 0
            ), 0) +
            COALESCE((
                SELECT esop_reserved_shares 
                FROM startup_shares 
                WHERE startup_id = target_startup_id
            ), 10000) -- Default ESOP if missing
        );
        
        -- Get the latest post-money valuation from:
        -- 1. Investment records (priority)
        -- 2. Mentor equity records (if investment records don't have it)
        -- 3. Recognition records (if neither has it)
        -- 4. Current startup valuation (fallback)
        SELECT COALESCE(
            (SELECT post_money_valuation 
             FROM investment_records 
             WHERE startup_id = target_startup_id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date DESC, id DESC 
             LIMIT 1),
            (SELECT post_money_valuation 
             FROM mentor_equity_records 
             WHERE startup_id = target_startup_id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date_added DESC, id DESC 
             LIMIT 1),
            (SELECT post_money_valuation 
             FROM recognition_records 
             WHERE startup_id = target_startup_id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date_added DESC, id DESC 
             LIMIT 1),
            (SELECT current_valuation FROM startups WHERE id = target_startup_id)
        ) INTO latest_post_money_valuation;
        
        -- Calculate new price per share using the latest post-money valuation
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND latest_post_money_valuation > 0 THEN 
                latest_post_money_valuation / new_total_shares
            ELSE 0
        END;
        
        -- Update startup_shares if record exists
        UPDATE startup_shares 
        SET 
            total_shares = new_total_shares,
            price_per_share = new_price_per_share,
            updated_at = NOW()
        WHERE startup_id = target_startup_id;
        
        -- If no startup_shares record exists, create one with safe values
        IF NOT FOUND THEN
            INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
            VALUES (target_startup_id, new_total_shares, 10000, new_price_per_share, NOW());
        END IF;
        
        -- Update the startup's current_valuation to the latest post-money valuation
        -- This ensures valuation is updated when mentors/investments are added
        UPDATE startups 
        SET 
            current_valuation = COALESCE(latest_post_money_valuation, current_valuation),
            updated_at = NOW()
        WHERE id = target_startup_id;
        
        -- PRESERVE EXISTING FUNCTIONALITY: Update total_funding if this is an investment change
        -- Only update total_funding when investment_records change (not for mentors/recognition)
        IF TG_TABLE_NAME = 'investment_records' THEN
            UPDATE startups 
            SET 
                total_funding = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM investment_records 
                    WHERE startup_id = target_startup_id
                ),
                updated_at = NOW()
            WHERE id = target_startup_id;
        END IF;
        
        -- Log the update for debugging
        RAISE NOTICE 'Updated startup %: total_shares=%, price_per_share=%, current_valuation=%', 
            target_startup_id, new_total_shares, new_price_per_share, latest_post_money_valuation;
    ELSE
        RAISE NOTICE 'Startup % does not exist, skipping startup_shares update', target_startup_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: ADD NEW TRIGGERS (SAFE - ONLY ADDS, DOESN'T REPLACE)
-- =====================================================

-- Add trigger for mentor_equity_records (NEW - safe to add)
CREATE TRIGGER trigger_update_shares_on_mentor_equity_change
    AFTER INSERT OR UPDATE OR DELETE ON mentor_equity_records
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_and_valuation_on_equity_change();

-- Add trigger for recognition_records (NEW - safe to add)
CREATE TRIGGER trigger_update_shares_on_recognition_change
    AFTER INSERT OR UPDATE OR DELETE ON recognition_records
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_and_valuation_on_equity_change();

-- =====================================================
-- STEP 3: OPTIONALLY UPDATE EXISTING TRIGGERS
-- =====================================================
-- WARNING: Uncommenting this section will REPLACE existing triggers
-- Only do this if you're sure the new function handles everything correctly
-- It's safer to keep existing triggers and just add the new ones above

/*
-- Update the existing investment_records trigger to use the new function
DO $$
BEGIN
    -- Drop existing trigger if it uses old function
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_shares_on_investment_change'
        AND tgrelid = 'investment_records'::regclass
    ) THEN
        DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
    END IF;
END $$;

-- Create trigger using the new comprehensive function
CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_and_valuation_on_equity_change();

-- Update founders trigger to use the new function
DO $$
BEGIN
    -- Drop existing trigger if it exists
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_shares_on_founder_change'
        AND tgrelid = 'founders'::regclass
    ) THEN
        DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;
    END IF;
END $$;

-- Create trigger using the new comprehensive function
CREATE TRIGGER trigger_update_shares_on_founder_change
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_and_valuation_on_equity_change();
*/

-- =====================================================
-- STEP 4: OPTIONAL RECALCULATION (COMMENTED OUT FOR SAFETY)
-- =====================================================
-- WARNING: This will recalculate ALL startup data
-- Only run this if you want to fix existing inconsistencies
-- Review the results first before applying

/*
-- Recalculate shares and valuation for all startups to fix any existing inconsistencies
DO $$
DECLARE
    startup_record RECORD;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL(15, 2);
    latest_post_money_valuation DECIMAL(15, 2);
BEGIN
    FOR startup_record IN SELECT id FROM startups LOOP
        -- Calculate total shares including all sources
        new_total_shares := (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = startup_record.id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = startup_record.id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM recognition_records 
                WHERE startup_id = startup_record.id
                AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
                AND shares IS NOT NULL
                AND shares > 0
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM mentor_equity_records 
                WHERE startup_id = startup_record.id
                AND (fee_type = 'Equity' OR fee_type = 'Hybrid')
                AND shares IS NOT NULL
                AND shares > 0
            ), 0) +
            COALESCE((
                SELECT esop_reserved_shares 
                FROM startup_shares 
                WHERE startup_id = startup_record.id
            ), 10000)
        );
        
        -- Get latest post-money valuation
        SELECT COALESCE(
            (SELECT post_money_valuation 
             FROM investment_records 
             WHERE startup_id = startup_record.id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date DESC, id DESC 
             LIMIT 1),
            (SELECT post_money_valuation 
             FROM mentor_equity_records 
             WHERE startup_id = startup_record.id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date_added DESC, id DESC 
             LIMIT 1),
            (SELECT post_money_valuation 
             FROM recognition_records 
             WHERE startup_id = startup_record.id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date_added DESC, id DESC 
             LIMIT 1),
            (SELECT current_valuation FROM startups WHERE id = startup_record.id)
        ) INTO latest_post_money_valuation;
        
        -- Calculate price per share
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND latest_post_money_valuation > 0 THEN 
                latest_post_money_valuation / new_total_shares
            ELSE 0
        END;
        
        -- Update startup_shares
        UPDATE startup_shares 
        SET 
            total_shares = new_total_shares,
            price_per_share = new_price_per_share,
            updated_at = NOW()
        WHERE startup_id = startup_record.id;
        
        -- Create if doesn't exist
        IF NOT FOUND THEN
            INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
            VALUES (startup_record.id, new_total_shares, 10000, new_price_per_share, NOW());
        END IF;
        
        -- Update current_valuation
        UPDATE startups 
        SET 
            current_valuation = COALESCE(latest_post_money_valuation, current_valuation),
            updated_at = NOW()
        WHERE id = startup_record.id;
    END LOOP;
    
    RAISE NOTICE 'Recalculated shares and valuation for all startups';
END $$;
*/

-- =====================================================
-- STEP 5: VERIFICATION QUERIES
-- =====================================================

-- Show current state of startups with all share sources
SELECT 
    'Startup shares breakdown (before fix):' as info,
    s.id,
    s.name,
    s.current_valuation,
    ss.total_shares as current_total_shares,
    ss.price_per_share,
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
    ), 0) as mentor_shares,
    ss.esop_reserved_shares,
    -- Calculate what the new total should be
    (COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = s.id), 0) +
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
     COALESCE(ss.esop_reserved_shares, 10000)) as calculated_total_shares,
    -- Show if there's a discrepancy
    CASE 
        WHEN ss.total_shares != (COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = s.id), 0) +
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
                                  COALESCE(ss.esop_reserved_shares, 10000))
        THEN '⚠️ MISMATCH'
        ELSE '✅ OK'
    END as status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- Show mentor equity records with shares
SELECT 
    'Mentor equity records with shares:' as info,
    mer.startup_id,
    s.name as startup_name,
    mer.mentor_name,
    mer.fee_type,
    mer.shares,
    mer.post_money_valuation,
    mer.date_added
FROM mentor_equity_records mer
JOIN startups s ON mer.startup_id = s.id
WHERE (mer.fee_type = 'Equity' OR mer.fee_type = 'Hybrid')
AND mer.shares IS NOT NULL
AND mer.shares > 0
ORDER BY mer.startup_id, mer.date_added DESC;

-- Verify triggers are created
SELECT 
    'Active triggers for equity updates:' as info,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname IN (
    'trigger_update_shares_on_mentor_equity_change',
    'trigger_update_shares_on_recognition_change',
    'trigger_update_shares_on_investment_change',
    'trigger_update_shares_on_founder_change'
)
ORDER BY tgname;

