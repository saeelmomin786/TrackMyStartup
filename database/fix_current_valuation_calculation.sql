-- =====================================================
-- FIX CURRENT VALUATION CALCULATION
-- =====================================================
-- This script ensures current_valuation is properly updated
-- when investments are added/updated/deleted
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING TRIGGERS (IF ANY)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_update_cumulative_valuation_on_investment ON investment_records;
DROP TRIGGER IF EXISTS trigger_update_valuation_on_investment ON investment_records;

-- =====================================================
-- STEP 2: CREATE FUNCTION TO UPDATE VALUATION
-- =====================================================

CREATE OR REPLACE FUNCTION update_current_valuation_on_investment()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    latest_post_money_valuation DECIMAL(15,2);
    startup_exists BOOLEAN;
BEGIN
    -- Get the startup_id from the changed record
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Check if startup exists
    SELECT EXISTS(SELECT 1 FROM startups WHERE id = target_startup_id) INTO startup_exists;
    
    IF startup_exists THEN
        -- Get the latest post-money valuation from investment records
        -- This is the most recent post-money valuation for this startup
        SELECT COALESCE(
            (SELECT post_money_valuation 
             FROM investment_records 
             WHERE startup_id = target_startup_id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date DESC, id DESC 
             LIMIT 1), 
            0
        ) INTO latest_post_money_valuation;
        
        -- Update the startup's current_valuation to the latest post-money valuation
        -- Only update if we have a valid post-money valuation
        IF latest_post_money_valuation > 0 THEN
            UPDATE startups 
            SET 
                current_valuation = latest_post_money_valuation,
                updated_at = NOW()
            WHERE id = target_startup_id;
            
            RAISE NOTICE '✅ Updated startup % current_valuation to %', 
                target_startup_id, latest_post_money_valuation;
        ELSE
            -- If no post-money valuation exists, keep the existing current_valuation
            RAISE NOTICE '⚠️ No post-money valuation found for startup %, keeping existing current_valuation', 
                target_startup_id;
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Startup % does not exist, skipping valuation update', target_startup_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: CREATE TRIGGER
-- =====================================================

CREATE TRIGGER trigger_update_valuation_on_investment
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_current_valuation_on_investment();

-- =====================================================
-- STEP 4: UPDATE EXISTING STARTUPS WITH CORRECT VALUATION
-- =====================================================

-- Update all startups that have investment records with post-money valuations
UPDATE startups s
SET 
    current_valuation = COALESCE(
        (SELECT post_money_valuation 
         FROM investment_records ir
         WHERE ir.startup_id = s.id 
         AND ir.post_money_valuation IS NOT NULL 
         AND ir.post_money_valuation > 0
         ORDER BY ir.date DESC, ir.id DESC 
         LIMIT 1),
        s.current_valuation
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM investment_records ir 
    WHERE ir.startup_id = s.id 
    AND ir.post_money_valuation IS NOT NULL 
    AND ir.post_money_valuation > 0
);

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Check if trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    '✅ CREATED' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'trigger_update_valuation_on_investment';

-- Show startups with their current valuations and latest post-money valuations
SELECT 
    s.id,
    s.name,
    s.current_valuation as current_valuation_in_db,
    (SELECT post_money_valuation 
     FROM investment_records ir
     WHERE ir.startup_id = s.id 
     AND ir.post_money_valuation IS NOT NULL 
     AND ir.post_money_valuation > 0
     ORDER BY ir.date DESC, ir.id DESC 
     LIMIT 1) as latest_post_money_valuation,
    CASE 
        WHEN s.current_valuation = (SELECT post_money_valuation 
                                     FROM investment_records ir
                                     WHERE ir.startup_id = s.id 
                                     AND ir.post_money_valuation IS NOT NULL 
                                     AND ir.post_money_valuation > 0
                                     ORDER BY ir.date DESC, ir.id DESC 
                                     LIMIT 1) 
        THEN '✅ MATCHES'
        WHEN (SELECT post_money_valuation 
              FROM investment_records ir
              WHERE ir.startup_id = s.id 
              AND ir.post_money_valuation IS NOT NULL 
              AND ir.post_money_valuation > 0
              ORDER BY ir.date DESC, ir.id DESC 
              LIMIT 1) IS NULL
        THEN '⚠️ NO POST-MONEY VALUATION'
        ELSE '❌ MISMATCH'
    END as status
FROM startups s
WHERE EXISTS (
    SELECT 1 
    FROM investment_records ir 
    WHERE ir.startup_id = s.id
)
ORDER BY s.id;
