-- =====================================================
-- FIX ESOP SYSTEMIC ISSUE FOR ALL STARTUPS
-- =====================================================
-- This script ensures all startups have correct ESOP configuration
-- and prevents the ESOP = 0 issue from happening again

-- =====================================================
-- STEP 1: FIX ALL EXISTING STARTUPS WITH ESOP = 0
-- =====================================================

-- Update all startups that have ESOP reserved shares = 0 or NULL
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE esop_reserved_shares = 0 OR esop_reserved_shares IS NULL;

-- =====================================================
-- STEP 2: RECALCULATE TOTAL SHARES FOR ALL STARTUPS
-- =====================================================

-- Update total shares calculation for all startups
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = startup_shares.startup_id
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = startup_shares.startup_id
        ), 0) +
        COALESCE(esop_reserved_shares, 0)
    ),
    updated_at = NOW();

-- =====================================================
-- STEP 3: RECALCULATE PRICE PER SHARE FOR ALL STARTUPS
-- =====================================================

-- Update price per share for all startups
UPDATE startup_shares 
SET 
    price_per_share = CASE 
        WHEN total_shares > 0 THEN (
            SELECT s.current_valuation / startup_shares.total_shares 
            FROM startups s 
            WHERE s.id = startup_shares.startup_id
        )
        ELSE 0
    END,
    updated_at = NOW()
WHERE total_shares > 0;

-- =====================================================
-- STEP 4: CREATE TRIGGER FOR NEW STARTUPS
-- =====================================================

-- Function to initialize startup_shares with correct ESOP for new startups
CREATE OR REPLACE FUNCTION initialize_startup_shares_with_esop()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert startup_shares record with default ESOP of 10000
    INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
    VALUES (NEW.id, 0, 10000, 0, NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_initialize_startup_shares_with_esop ON startups;

-- Create trigger for new startups
CREATE TRIGGER trigger_initialize_startup_shares_with_esop
    AFTER INSERT ON startups
    FOR EACH ROW EXECUTE FUNCTION initialize_startup_shares_with_esop();

-- =====================================================
-- STEP 5: CREATE TRIGGER TO AUTO-UPDATE SHARES
-- =====================================================

-- Function to automatically update shares when founders change
CREATE OR REPLACE FUNCTION update_shares_on_founder_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Update total shares calculation
    UPDATE startup_shares 
    SET 
        total_shares = (
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
            COALESCE(esop_reserved_shares, 0)
        ),
        price_per_share = CASE 
            WHEN (
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
                COALESCE(esop_reserved_shares, 0)
            ) > 0 THEN (
                SELECT s.current_valuation / (
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
                    COALESCE(esop_reserved_shares, 0)
                )
                FROM startups s 
                WHERE s.id = target_startup_id
            )
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = target_startup_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update shares when investments change
CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Update total shares calculation
    UPDATE startup_shares 
    SET 
        total_shares = (
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
            COALESCE(esop_reserved_shares, 0)
        ),
        price_per_share = CASE 
            WHEN (
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
                COALESCE(esop_reserved_shares, 0)
            ) > 0 THEN (
                SELECT s.current_valuation / (
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
                    COALESCE(esop_reserved_shares, 0)
                )
                FROM startups s 
                WHERE s.id = target_startup_id
            )
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = target_startup_id;
    
    -- Also update total_funding in startups table
    UPDATE startups 
    SET 
        total_funding = (
            SELECT COALESCE(SUM(amount), 0)
            FROM investment_records 
            WHERE startup_id = target_startup_id
        ),
        updated_at = NOW()
    WHERE id = target_startup_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;

-- Create triggers
CREATE TRIGGER trigger_update_shares_on_founder_change
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW EXECUTE FUNCTION update_shares_on_founder_change();

CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW EXECUTE FUNCTION update_shares_on_investment_change();

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

-- Check all startups after fixes
SELECT 
    '=== ALL STARTUPS AFTER ESOP FIX ===' as status,
    s.id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id) as total_investor_shares,
    CASE 
        WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
        THEN '❌ STILL HAS ISSUE'
        ELSE '✅ ESOP FIXED'
    END as esop_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;
