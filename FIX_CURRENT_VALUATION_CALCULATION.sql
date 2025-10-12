-- =====================================================
-- FIX CURRENT VALUATION CALCULATION BUG
-- =====================================================
-- This script fixes the bug where current_valuation is incorrectly
-- recalculated when investments are added, causing wrong valuations

-- =====================================================
-- STEP 1: DROP EXISTING TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_update_startup_shares_on_investment_change ON investment_records;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_shares_on_investment_change();
DROP FUNCTION IF EXISTS update_startup_shares_on_investment_change();

-- =====================================================
-- STEP 2: CREATE FIXED FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    latest_post_money_valuation DECIMAL;
    startup_exists BOOLEAN;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Check if startup exists
    SELECT EXISTS(SELECT 1 FROM startups WHERE id = target_startup_id) INTO startup_exists;
    
    -- Only proceed if startup exists
    IF startup_exists THEN
        -- Calculate new total shares
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
                SELECT esop_reserved_shares 
                FROM startup_shares 
                WHERE startup_id = target_startup_id
            ), 10000) -- Default ESOP if missing
        );
        
        -- Get the latest post-money valuation from investment records
        -- This is the key fix: use post_money_valuation instead of old current_valuation
        SELECT COALESCE(
            (SELECT post_money_valuation 
             FROM investment_records 
             WHERE startup_id = target_startup_id 
             AND post_money_valuation IS NOT NULL 
             AND post_money_valuation > 0
             ORDER BY date DESC, id DESC 
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
        -- This is the critical fix: update current_valuation when investments are added
        UPDATE startups 
        SET 
            current_valuation = COALESCE(latest_post_money_valuation, current_valuation),
            updated_at = NOW()
        WHERE id = target_startup_id;
        
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
-- STEP 3: CREATE TRIGGER
-- =====================================================

CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_shares_on_investment_change();

-- =====================================================
-- STEP 4: VERIFICATION QUERIES
-- =====================================================

-- Show current state of startups and their valuations
SELECT 
    'Current startup valuations:' as info,
    s.id,
    s.name,
    s.current_valuation,
    ss.total_shares,
    ss.price_per_share,
    ss.esop_reserved_shares
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- Show investment records with post-money valuations
SELECT 
    'Investment records with post-money valuations:' as info,
    ir.startup_id,
    s.name as startup_name,
    ir.investor_name,
    ir.amount,
    ir.shares,
    ir.price_per_share,
    ir.post_money_valuation,
    ir.date
FROM investment_records ir
JOIN startups s ON ir.startup_id = s.id
WHERE ir.post_money_valuation IS NOT NULL
ORDER BY ir.startup_id, ir.date DESC;

-- =====================================================
-- STEP 5: TEST SCENARIO VERIFICATION
-- =====================================================

-- This should now work correctly:
-- 1. Registration: 100,000 shares × ₹1 = ₹100,000 current valuation
-- 2. Add Investment: ₹10,000 for 10,000 shares at ₹1 per share
-- 3. Expected Result: 
--    - Total shares: 110,000
--    - Current valuation: ₹110,000 (₹100,000 + ₹10,000)
--    - Price per share: ₹1.00 (₹110,000 ÷ 110,000 shares)

SELECT 
    'Test scenario verification:' as info,
    'Registration: 100,000 shares × ₹1 = ₹100,000' as step1,
    'Investment: ₹10,000 for 10,000 shares at ₹1' as step2,
    'Expected: 110,000 shares × ₹1 = ₹110,000' as expected_result;
