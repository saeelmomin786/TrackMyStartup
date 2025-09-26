-- =====================================================
-- COMPLETE ESOP SYSTEM FIX - EXISTING + FUTURE STARTUPS
-- =====================================================
-- This script ensures ALL startups (existing and future) have correct ESOP setup
-- It fixes current issues AND prevents future issues

-- =====================================================
-- STEP 1: CREATE MISSING STARTUP_SHARES RECORDS FOR EXISTING STARTUPS
-- =====================================================

-- Insert startup_shares records for startups that don't have them
INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
SELECT 
    s.id,
    COALESCE((
        SELECT SUM(shares) 
        FROM founders 
        WHERE startup_id = s.id
    ), 0) +
    COALESCE((
        SELECT SUM(shares) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) +
    10000, -- Default ESOP reserved shares
    10000, -- ESOP reserved shares
    CASE 
        WHEN s.current_valuation > 0 AND (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = s.id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = s.id
            ), 0) +
            10000
        ) > 0 THEN s.current_valuation / (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = s.id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = s.id
            ), 0) +
            10000
        )
        ELSE 0
    END,
    NOW()
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM startup_shares ss WHERE ss.startup_id = s.id
);

-- =====================================================
-- STEP 2: FIX EXISTING STARTUPS WITH ESOP = 0 OR NULL
-- =====================================================

-- Update all startups that have ESOP reserved shares = 0 or NULL
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE esop_reserved_shares = 0 OR esop_reserved_shares IS NULL;

-- =====================================================
-- STEP 3: RECALCULATE TOTAL SHARES FOR ALL EXISTING STARTUPS
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
-- STEP 4: RECALCULATE PRICE PER SHARE FOR ALL EXISTING STARTUPS
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
-- STEP 5: CREATE COMPREHENSIVE TRIGGER SYSTEM FOR NEW STARTUPS
-- =====================================================

-- Function to initialize startup_shares with correct ESOP for NEW startups
CREATE OR REPLACE FUNCTION initialize_startup_shares_for_new_startup()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert startup_shares record with default ESOP of 10000 for NEW startups
    INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
    VALUES (NEW.id, 10000, 10000, 0, NOW());
    
    -- Log the creation
    RAISE NOTICE 'Created startup_shares record for new startup ID: % with ESOP: 10000', NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update shares when founders change
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
    
    -- Calculate new price per share
    new_price_per_share := CASE 
        WHEN new_total_shares > 0 THEN (
            SELECT s.current_valuation / new_total_shares 
            FROM startups s 
            WHERE s.id = target_startup_id
        )
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update shares when investments change
CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
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
    
    -- Calculate new price per share
    new_price_per_share := CASE 
        WHEN new_total_shares > 0 THEN (
            SELECT s.current_valuation / new_total_shares 
            FROM startups s 
            WHERE s.id = target_startup_id
        )
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

-- Function to ensure startup_shares exists when startup valuation changes
CREATE OR REPLACE FUNCTION ensure_startup_shares_on_valuation_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If startup_shares doesn't exist, create it
    IF NOT EXISTS (SELECT 1 FROM startup_shares WHERE startup_id = NEW.id) THEN
        INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
        VALUES (NEW.id, 10000, 10000, 0, NOW());
        
        RAISE NOTICE 'Created missing startup_shares record for startup ID: %', NEW.id;
    END IF;
    
    -- Update price per share if total_shares > 0
    UPDATE startup_shares 
    SET 
        price_per_share = CASE 
            WHEN total_shares > 0 THEN NEW.current_valuation / total_shares
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: DROP OLD TRIGGERS AND CREATE NEW COMPREHENSIVE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_initialize_startup_shares_with_esop ON startups;
DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_ensure_startup_shares_on_valuation_change ON startups;

-- Create comprehensive triggers for ALL scenarios
CREATE TRIGGER trigger_initialize_startup_shares_for_new_startup
    AFTER INSERT ON startups
    FOR EACH ROW EXECUTE FUNCTION initialize_startup_shares_for_new_startup();

CREATE TRIGGER trigger_update_shares_on_founder_change
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW EXECUTE FUNCTION update_shares_on_founder_change();

CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW EXECUTE FUNCTION update_shares_on_investment_change();

CREATE TRIGGER trigger_ensure_startup_shares_on_valuation_change
    AFTER UPDATE OF current_valuation ON startups
    FOR EACH ROW EXECUTE FUNCTION ensure_startup_shares_on_valuation_change();

-- =====================================================
-- STEP 7: FINAL VERIFICATION
-- =====================================================

-- Check all startups after complete system fix
SELECT 
    '=== ALL STARTUPS AFTER COMPLETE SYSTEM FIX ===' as status,
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

-- =====================================================
-- STEP 8: VERIFY TRIGGER SYSTEM IS WORKING
-- =====================================================

-- Show all triggers that are now active
SELECT 
    '=== ACTIVE TRIGGERS FOR ESOP SYSTEM ===' as status,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%startup%' OR trigger_name LIKE '%shares%'
ORDER BY event_object_table, trigger_name;
