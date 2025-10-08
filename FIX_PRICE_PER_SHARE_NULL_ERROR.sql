-- =====================================================
-- FIX PRICE_PER_SHARE NULL ERROR IN STARTUP_SHARES
-- =====================================================
-- This script fixes the null value error in price_per_share column
-- The issue occurs when the function tries to calculate price_per_share
-- but gets NULL values from the calculation

-- =====================================================
-- STEP 1: FIX THE UPDATE_SHARES_ON_FOUNDER_CHANGE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_founder_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    startup_valuation DECIMAL;
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
    
    -- Get startup valuation safely
    SELECT COALESCE(current_valuation, 0) INTO startup_valuation
    FROM startups 
    WHERE id = target_startup_id;
    
    -- Calculate new price per share with proper null handling
    new_price_per_share := CASE 
        WHEN new_total_shares > 0 AND startup_valuation > 0 THEN 
            startup_valuation / new_total_shares
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
            COALESCE(new_price_per_share, 0), 
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: FIX THE UPDATE_SHARES_ON_INVESTMENT_CHANGE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    startup_valuation DECIMAL;
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
    
    -- Get startup valuation safely
    SELECT COALESCE(current_valuation, 0) INTO startup_valuation
    FROM startups 
    WHERE id = target_startup_id;
    
    -- Calculate new price per share with proper null handling
    new_price_per_share := CASE 
        WHEN new_total_shares > 0 AND startup_valuation > 0 THEN 
            startup_valuation / new_total_shares
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
            COALESCE(new_price_per_share, 0), 
            NOW()
        );
    END IF;
    
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

-- =====================================================
-- STEP 3: FIX EXISTING NULL VALUES IN STARTUP_SHARES
-- =====================================================

-- Update any existing records with NULL price_per_share
UPDATE startup_shares 
SET price_per_share = CASE 
    WHEN total_shares > 0 AND EXISTS (
        SELECT 1 FROM startups s 
        WHERE s.id = startup_shares.startup_id 
        AND s.current_valuation > 0
    ) THEN (
        SELECT s.current_valuation / startup_shares.total_shares
        FROM startups s 
        WHERE s.id = startup_shares.startup_id
    )
    ELSE 0
END
WHERE price_per_share IS NULL;

-- =====================================================
-- STEP 4: ADD SAFE DEFAULT CONSTRAINT
-- =====================================================

-- Ensure price_per_share column has a proper default
ALTER TABLE startup_shares 
ALTER COLUMN price_per_share SET DEFAULT 0;

-- Update the column to be NOT NULL with default
ALTER TABLE startup_shares 
ALTER COLUMN price_per_share SET NOT NULL;

-- =====================================================
-- STEP 5: CREATE SAFE INITIALIZATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_startup_shares_for_new_startup()
RETURNS TRIGGER AS $$
DECLARE
    safe_price_per_share DECIMAL;
BEGIN
    -- Calculate safe price per share
    safe_price_per_share := CASE 
        WHEN NEW.current_valuation > 0 THEN NEW.current_valuation / 10000
        ELSE 0
    END;
    
    -- Insert startup_shares record with safe values
    INSERT INTO startup_shares (
        startup_id, 
        total_shares, 
        esop_reserved_shares, 
        price_per_share, 
        updated_at
    )
    VALUES (
        NEW.id, 
        10000, 
        10000, 
        COALESCE(safe_price_per_share, 0), 
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

-- Check for any remaining NULL values
SELECT 
    'NULL price_per_share check:' as check_type,
    COUNT(*) as null_count
FROM startup_shares 
WHERE price_per_share IS NULL;

-- Check for any negative or invalid values
SELECT 
    'Invalid price_per_share check:' as check_type,
    COUNT(*) as invalid_count
FROM startup_shares 
WHERE price_per_share < 0;

-- Show current startup_shares data
SELECT 
    'Current startup_shares data:' as info,
    startup_id,
    total_shares,
    esop_reserved_shares,
    price_per_share,
    updated_at
FROM startup_shares 
ORDER BY startup_id;






