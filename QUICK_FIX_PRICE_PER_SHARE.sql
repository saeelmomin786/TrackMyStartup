-- =====================================================
-- QUICK FIX FOR PRICE_PER_SHARE NULL ERROR
-- =====================================================
-- This is a quick fix for the immediate null constraint violation
-- Run this first to resolve the current error

-- =====================================================
-- STEP 1: FIX EXISTING NULL VALUES IMMEDIATELY
-- =====================================================

-- Update any NULL price_per_share values to 0
UPDATE startup_shares 
SET price_per_share = 0
WHERE price_per_share IS NULL;

-- =====================================================
-- STEP 2: FIX THE FUNCTION THAT'S CAUSING THE ERROR
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_founder_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
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
    
    -- Calculate new price per share with safe null handling
    new_price_per_share := CASE 
        WHEN new_total_shares > 0 THEN (
            SELECT COALESCE(s.current_valuation, 0) / new_total_shares
            FROM startups s 
            WHERE s.id = target_startup_id
        )
        ELSE 0
    END;
    
    -- Ensure price_per_share is never NULL
    new_price_per_share := COALESCE(new_price_per_share, 0);
    
    -- Update startup_shares
    UPDATE startup_shares 
    SET 
        total_shares = new_total_shares,
        price_per_share = new_price_per_share,
        updated_at = NOW()
    WHERE startup_id = target_startup_id;
    
    -- If no startup_shares record exists, create one with safe values
    IF NOT FOUND THEN
        INSERT INTO startup_shares (
            startup_id, 
            total_shares, 
            esop_reserved_shares, 
            price_per_share, 
            updated_at
        )
        VALUES (
            target_startup_id, 
            new_total_shares, 
            10000, 
            new_price_per_share, 
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: VERIFY THE FIX
-- =====================================================

-- Check that no NULL values remain
SELECT 
    'NULL values check:' as check_type,
    COUNT(*) as null_count
FROM startup_shares 
WHERE price_per_share IS NULL;

-- Should return 0 null_count if fix worked






