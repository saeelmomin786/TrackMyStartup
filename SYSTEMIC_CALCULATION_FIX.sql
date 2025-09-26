-- =====================================================
-- SYSTEMIC CALCULATION FIX FOR ALL STARTUPS
-- =====================================================
-- This script fixes calculation issues for all existing startups
-- and ensures new startups are handled correctly

-- =====================================================
-- STEP 1: FIX ALL EXISTING STARTUPS
-- =====================================================

-- Fix ESOP reserved shares for all startups that have 0
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE esop_reserved_shares = 0 OR esop_reserved_shares IS NULL;

-- Fix total shares calculation for all startups
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

-- Fix price per share for all startups
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

-- Sync total funding for all startups
UPDATE startups 
SET 
    total_funding = (
        SELECT COALESCE(SUM(amount), 0)
        FROM investment_records 
        WHERE startup_id = startups.id
    ),
    updated_at = NOW();

-- =====================================================
-- STEP 2: CREATE TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to automatically update startup_shares when founders change
CREATE OR REPLACE FUNCTION update_startup_shares_on_founder_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total shares calculation
    UPDATE startup_shares 
    SET 
        total_shares = (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
            ), 0) +
            COALESCE(esop_reserved_shares, 0)
        ),
        price_per_share = CASE 
            WHEN (
                COALESCE((
                    SELECT SUM(shares) 
                    FROM founders 
                    WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                ), 0) +
                COALESCE((
                    SELECT SUM(shares) 
                    FROM investment_records 
                    WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                ), 0) +
                COALESCE(esop_reserved_shares, 0)
            ) > 0 THEN (
                SELECT s.current_valuation / (
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM founders 
                        WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                    ), 0) +
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM investment_records 
                        WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                    ), 0) +
                    COALESCE(esop_reserved_shares, 0)
                )
                FROM startups s 
                WHERE s.id = COALESCE(NEW.startup_id, OLD.startup_id)
            )
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update startup_shares when investment records change
CREATE OR REPLACE FUNCTION update_startup_shares_on_investment_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total shares calculation
    UPDATE startup_shares 
    SET 
        total_shares = (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
            ), 0) +
            COALESCE(esop_reserved_shares, 0)
        ),
        price_per_share = CASE 
            WHEN (
                COALESCE((
                    SELECT SUM(shares) 
                    FROM founders 
                    WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                ), 0) +
                COALESCE((
                    SELECT SUM(shares) 
                    FROM investment_records 
                    WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                ), 0) +
                COALESCE(esop_reserved_shares, 0)
            ) > 0 THEN (
                SELECT s.current_valuation / (
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM founders 
                        WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                    ), 0) +
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM investment_records 
                        WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
                    ), 0) +
                    COALESCE(esop_reserved_shares, 0)
                )
                FROM startups s 
                WHERE s.id = COALESCE(NEW.startup_id, OLD.startup_id)
            )
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Also update total_funding in startups table
    UPDATE startups 
    SET 
        total_funding = (
            SELECT COALESCE(SUM(amount), 0)
            FROM investment_records 
            WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.startup_id, OLD.startup_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update startup_shares when ESOP changes
CREATE OR REPLACE FUNCTION update_startup_shares_on_esop_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total shares calculation
    UPDATE startup_shares 
    SET 
        total_shares = (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = NEW.startup_id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = NEW.startup_id
            ), 0) +
            COALESCE(NEW.esop_reserved_shares, 0)
        ),
        price_per_share = CASE 
            WHEN (
                COALESCE((
                    SELECT SUM(shares) 
                    FROM founders 
                    WHERE startup_id = NEW.startup_id
                ), 0) +
                COALESCE((
                    SELECT SUM(shares) 
                    FROM investment_records 
                    WHERE startup_id = NEW.startup_id
                ), 0) +
                COALESCE(NEW.esop_reserved_shares, 0)
            ) > 0 THEN (
                SELECT s.current_valuation / (
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM founders 
                        WHERE startup_id = NEW.startup_id
                    ), 0) +
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM investment_records 
                        WHERE startup_id = NEW.startup_id
                    ), 0) +
                    COALESCE(NEW.esop_reserved_shares, 0)
                )
                FROM startups s 
                WHERE s.id = NEW.startup_id
            )
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = NEW.startup_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_update_shares_on_esop_change ON startup_shares;

-- Create triggers
CREATE TRIGGER trigger_update_shares_on_founder_change
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW EXECUTE FUNCTION update_startup_shares_on_founder_change();

CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW EXECUTE FUNCTION update_startup_shares_on_investment_change();

CREATE TRIGGER trigger_update_shares_on_esop_change
    AFTER UPDATE OF esop_reserved_shares ON startup_shares
    FOR EACH ROW EXECUTE FUNCTION update_startup_shares_on_esop_change();

-- =====================================================
-- STEP 4: CREATE FUNCTION FOR NEW STARTUP INITIALIZATION
-- =====================================================

-- Function to initialize startup_shares for new startups
CREATE OR REPLACE FUNCTION initialize_startup_shares()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default startup_shares record for new startup
    INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
    VALUES (NEW.id, 0, 10000, 0, NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new startups
DROP TRIGGER IF EXISTS trigger_initialize_startup_shares ON startups;
CREATE TRIGGER trigger_initialize_startup_shares
    AFTER INSERT ON startups
    FOR EACH ROW EXECUTE FUNCTION initialize_startup_shares();

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Check all startups after fixes
SELECT 
    'All startups after systemic fix:' as step,
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id) as total_investor_shares,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = s.id) as total_investment_amount
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;
