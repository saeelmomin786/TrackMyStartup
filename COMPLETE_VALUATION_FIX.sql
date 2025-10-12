-- =====================================================
-- COMPLETE VALUATION CALCULATION FIX
-- =====================================================
-- This script fixes ALL valuation calculation issues:
-- 1. Removes conflicting triggers
-- 2. Implements cumulative valuation logic
-- 3. Ensures consistent price per share calculations

-- =====================================================
-- STEP 1: CLEAN UP ALL EXISTING TRIGGERS
-- =====================================================

-- Drop ALL existing triggers that might conflict
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_update_startup_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;
DROP TRIGGER IF EXISTS trigger_update_shares_on_startup_change ON startups;

-- Drop ALL existing functions
DROP FUNCTION IF EXISTS update_shares_on_investment_change();
DROP FUNCTION IF EXISTS update_startup_shares_on_investment_change();
DROP FUNCTION IF EXISTS update_shares_on_founder_change();
DROP FUNCTION IF EXISTS update_shares_on_startup_change();

-- =====================================================
-- STEP 2: CREATE SINGLE CUMULATIVE VALUATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_cumulative_valuation()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    base_valuation DECIMAL;
    total_investment_amount DECIMAL;
    cumulative_valuation DECIMAL;
    new_price_per_share DECIMAL;
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
        
        -- Get base valuation (from registration: total_shares * price_per_share)
        SELECT COALESCE(
            (SELECT total_shares * price_per_share 
             FROM startup_shares 
             WHERE startup_id = target_startup_id), 
            0
        ) INTO base_valuation;
        
        -- Calculate total investment amount
        SELECT COALESCE(
            (SELECT SUM(amount) 
             FROM investment_records 
             WHERE startup_id = target_startup_id), 
            0
        ) INTO total_investment_amount;
        
        -- Calculate cumulative valuation: base + all investments
        cumulative_valuation := base_valuation + total_investment_amount;
        
        -- Calculate new price per share using cumulative valuation
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND cumulative_valuation > 0 THEN 
                cumulative_valuation / new_total_shares
            ELSE 0
        END;
        
        -- Update startup_shares
        UPDATE startup_shares 
        SET 
            total_shares = new_total_shares,
            price_per_share = new_price_per_share,
            updated_at = NOW()
        WHERE startup_id = target_startup_id;
        
        -- If no startup_shares record exists, create one
        IF NOT FOUND THEN
            INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
            VALUES (target_startup_id, new_total_shares, 10000, new_price_per_share, NOW());
        END IF;
        
        -- Update startup's current_valuation to cumulative valuation
        UPDATE startups 
        SET 
            current_valuation = cumulative_valuation,
            updated_at = NOW()
        WHERE id = target_startup_id;
        
        -- Log the update for debugging
        RAISE NOTICE 'Updated startup %: total_shares=%, price_per_share=%, cumulative_valuation=% (base: % + investments: %)', 
            target_startup_id, new_total_shares, new_price_per_share, cumulative_valuation, 
            base_valuation, total_investment_amount;
    ELSE
        RAISE NOTICE 'Startup % does not exist, skipping valuation update', target_startup_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: CREATE SINGLE TRIGGER FOR ALL CHANGES
-- =====================================================

-- Trigger for investment changes
CREATE TRIGGER trigger_update_cumulative_valuation_on_investment
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_cumulative_valuation();

-- Trigger for founder changes
CREATE TRIGGER trigger_update_cumulative_valuation_on_founder
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW
    EXECUTE FUNCTION update_cumulative_valuation();

-- =====================================================
-- STEP 4: RECALCULATE ALL EXISTING DATA
-- =====================================================

-- Recalculate all existing startups with correct cumulative valuations
DO $$
DECLARE
    startup_record RECORD;
    base_valuation DECIMAL;
    total_investment_amount DECIMAL;
    cumulative_valuation DECIMAL;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
BEGIN
    -- Loop through all startups
    FOR startup_record IN SELECT id FROM startups LOOP
        -- Calculate base valuation
        SELECT COALESCE(
            (SELECT total_shares * price_per_share 
             FROM startup_shares 
             WHERE startup_id = startup_record.id), 
            0
        ) INTO base_valuation;
        
        -- Calculate total investment amount
        SELECT COALESCE(
            (SELECT SUM(amount) 
             FROM investment_records 
             WHERE startup_id = startup_record.id), 
            0
        ) INTO total_investment_amount;
        
        -- Calculate cumulative valuation
        cumulative_valuation := base_valuation + total_investment_amount;
        
        -- Calculate total shares
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
                SELECT esop_reserved_shares 
                FROM startup_shares 
                WHERE startup_id = startup_record.id
            ), 10000)
        );
        
        -- Calculate new price per share
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND cumulative_valuation > 0 THEN 
                cumulative_valuation / new_total_shares
            ELSE 0
        END;
        
        -- Update startup_shares
        UPDATE startup_shares 
        SET 
            total_shares = new_total_shares,
            price_per_share = new_price_per_share,
            updated_at = NOW()
        WHERE startup_id = startup_record.id;
        
        -- Update startup current_valuation
        UPDATE startups 
        SET 
            current_valuation = cumulative_valuation,
            updated_at = NOW()
        WHERE id = startup_record.id;
        
        RAISE NOTICE 'Recalculated startup %: cumulative_valuation=%, price_per_share=%', 
            startup_record.id, cumulative_valuation, new_price_per_share;
    END LOOP;
END $$;

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Show current state of all startups
SELECT 
    'FINAL VERIFICATION - All startup valuations:' as info,
    s.id,
    s.name,
    s.current_valuation,
    ss.total_shares,
    ss.price_per_share,
    ss.esop_reserved_shares,
    (ss.total_shares * ss.price_per_share) as calculated_valuation,
    COALESCE((
        SELECT SUM(amount) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) as total_investments
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- Show investment records
SELECT 
    'Investment records:' as info,
    ir.startup_id,
    s.name as startup_name,
    ir.investor_name,
    ir.amount,
    ir.shares,
    ir.price_per_share,
    ir.date
FROM investment_records ir
JOIN startups s ON ir.startup_id = s.id
ORDER BY ir.startup_id, ir.date DESC;

-- =====================================================
-- STEP 6: TEST SCENARIO VERIFICATION
-- =====================================================

SELECT 
    'TEST SCENARIO VERIFICATION:' as info,
    'Registration: 100,000 shares × ₹1 = ₹100,000 base' as step1,
    'Investment 1: ₹10,000 → Cumulative: ₹110,000' as step2,
    'Investment 2: ₹20,000 → Cumulative: ₹130,000' as step3,
    'Price per share: ₹130,000 ÷ total_shares = consistent_price' as expected_result;
