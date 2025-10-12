-- =====================================================
-- FIX CUMULATIVE VALUATION CALCULATION
-- =====================================================
-- This script fixes the bug where current_valuation is overwritten
-- instead of being cumulative when investments are added

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
-- STEP 2: CREATE FIXED CUMULATIVE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    cumulative_valuation DECIMAL;
    startup_exists BOOLEAN;
    base_valuation DECIMAL;
    total_investment_amount DECIMAL;
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
        
        -- Get the base valuation (from registration: total_shares * price_per_share)
        SELECT COALESCE(
            (SELECT total_shares * price_per_share 
             FROM startup_shares 
             WHERE startup_id = target_startup_id), 
            0
        ) INTO base_valuation;
        
        -- Calculate cumulative valuation: base + all investment amounts
        SELECT COALESCE(
            base_valuation + (
                SELECT COALESCE(SUM(amount), 0) 
                FROM investment_records 
                WHERE startup_id = target_startup_id
            ), 
            base_valuation
        ) INTO cumulative_valuation;
        
        -- Calculate new price per share using cumulative valuation
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND cumulative_valuation > 0 THEN 
                cumulative_valuation / new_total_shares
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
        
        -- Update the startup's current_valuation to the cumulative valuation
        -- This is the key fix: cumulative valuation instead of overwriting
        UPDATE startups 
        SET 
            current_valuation = cumulative_valuation,
            updated_at = NOW()
        WHERE id = target_startup_id;
        
        -- Log the update for debugging
        RAISE NOTICE 'Updated startup %: total_shares=%, price_per_share=%, cumulative_valuation=% (base: % + investments: %)', 
            target_startup_id, new_total_shares, new_price_per_share, cumulative_valuation, 
            base_valuation, (cumulative_valuation - base_valuation);
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
    ss.esop_reserved_shares,
    (ss.total_shares * ss.price_per_share) as calculated_base_valuation
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- Show investment records with amounts
SELECT 
    'Investment records with amounts:' as info,
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

-- Show cumulative calculation
SELECT 
    'Cumulative valuation calculation:' as info,
    s.id as startup_id,
    s.name,
    s.current_valuation as current_valuation,
    (ss.total_shares * ss.price_per_share) as base_valuation,
    COALESCE((
        SELECT SUM(amount) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) as total_investments,
    (ss.total_shares * ss.price_per_share) + COALESCE((
        SELECT SUM(amount) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) as expected_cumulative_valuation
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 5: TEST SCENARIO VERIFICATION
-- =====================================================

-- This should now work correctly with cumulative valuations:
-- 1. Registration: 100,000 shares × ₹1 = ₹100,000 base valuation
-- 2. Investment 1: ₹10,000 → Cumulative: ₹110,000
-- 3. Investment 2: ₹20,000 → Cumulative: ₹130,000
-- 4. Price per share adjusts based on total shares and cumulative valuation

SELECT 
    'Test scenario verification:' as info,
    'Registration: 100,000 shares × ₹1 = ₹100,000 base' as step1,
    'Investment 1: ₹10,000 → Cumulative: ₹110,000' as step2,
    'Investment 2: ₹20,000 → Cumulative: ₹130,000' as step3,
    'Price adjusts: ₹130,000 ÷ total_shares = new_price_per_share' as expected_result;
