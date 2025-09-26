-- =====================================================
-- SAFE TRIGGERS AND FUNCTIONS (RUN AFTER DATA FIX)
-- =====================================================
-- Run this script AFTER running SAFE_CALCULATION_FIX.sql

-- =====================================================
-- STEP 1: CREATE HELPER FUNCTIONS (NO LOCKS)
-- =====================================================

-- Function to recalculate shares for a specific startup
CREATE OR REPLACE FUNCTION recalculate_startup_shares(startup_id_param INTEGER)
RETURNS TABLE(
    startup_id INTEGER,
    total_founder_shares BIGINT,
    total_investor_shares BIGINT,
    esop_reserved_shares NUMERIC,
    calculated_total_shares NUMERIC,
    current_valuation NUMERIC,
    calculated_price_per_share NUMERIC
) AS $$
BEGIN
    -- Update the startup_shares record
    UPDATE startup_shares 
    SET 
        total_shares = (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = startup_id_param
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = startup_id_param
            ), 0) +
            COALESCE(esop_reserved_shares, 0)
        ),
        price_per_share = CASE 
            WHEN (
                COALESCE((
                    SELECT SUM(shares) 
                    FROM founders 
                    WHERE startup_id = startup_id_param
                ), 0) +
                COALESCE((
                    SELECT SUM(shares) 
                    FROM investment_records 
                    WHERE startup_id = startup_id_param
                ), 0) +
                COALESCE(esop_reserved_shares, 0)
            ) > 0 THEN (
                SELECT s.current_valuation / (
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM founders 
                        WHERE startup_id = startup_id_param
                    ), 0) +
                    COALESCE((
                        SELECT SUM(shares) 
                        FROM investment_records 
                        WHERE startup_id = startup_id_param
                    ), 0) +
                    COALESCE(esop_reserved_shares, 0)
                )
                FROM startups s 
                WHERE s.id = startup_id_param
            )
            ELSE 0
        END,
        updated_at = NOW()
    WHERE startup_id = startup_id_param;
    
    -- Update total_funding in startups table
    UPDATE startups 
    SET 
        total_funding = (
            SELECT COALESCE(SUM(amount), 0)
            FROM investment_records 
            WHERE startup_id = startup_id_param
        ),
        updated_at = NOW()
    WHERE id = startup_id_param;
    
    -- Return the calculated values
    RETURN QUERY
    SELECT 
        startup_id_param,
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = startup_id_param
        ), 0) as total_founder_shares,
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = startup_id_param
        ), 0) as total_investor_shares,
        ss.esop_reserved_shares,
        ss.total_shares as calculated_total_shares,
        s.current_valuation,
        ss.price_per_share as calculated_price_per_share
    FROM startups s
    JOIN startup_shares ss ON s.id = ss.startup_id
    WHERE s.id = startup_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get cap table data
CREATE OR REPLACE FUNCTION get_cap_table_data(startup_id_param INTEGER)
RETURNS TABLE(
    startup_id INTEGER,
    startup_name TEXT,
    total_funding NUMERIC,
    current_valuation NUMERIC,
    total_shares NUMERIC,
    esop_reserved_shares NUMERIC,
    price_per_share NUMERIC,
    total_founder_shares BIGINT,
    total_investor_shares BIGINT,
    founder_equity_percentage NUMERIC,
    investor_equity_percentage NUMERIC,
    esop_equity_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.total_funding,
        s.current_valuation,
        ss.total_shares,
        ss.esop_reserved_shares,
        ss.price_per_share,
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = startup_id_param
        ), 0) as total_founder_shares,
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = startup_id_param
        ), 0) as total_investor_shares,
        CASE 
            WHEN ss.total_shares > 0 THEN 
                (COALESCE((
                    SELECT SUM(shares) 
                    FROM founders 
                    WHERE startup_id = startup_id_param
                ), 0) * 100.0 / ss.total_shares)
            ELSE 0
        END as founder_equity_percentage,
        CASE 
            WHEN ss.total_shares > 0 THEN 
                (COALESCE((
                    SELECT SUM(shares) 
                    FROM investment_records 
                    WHERE startup_id = startup_id_param
                ), 0) * 100.0 / ss.total_shares)
            ELSE 0
        END as investor_equity_percentage,
        CASE 
            WHEN ss.total_shares > 0 THEN 
                (ss.esop_reserved_shares * 100.0 / ss.total_shares)
            ELSE 0
        END as esop_equity_percentage
    FROM startups s
    JOIN startup_shares ss ON s.id = ss.startup_id
    WHERE s.id = startup_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get financial data
CREATE OR REPLACE FUNCTION get_financial_data(startup_id_param INTEGER)
RETURNS TABLE(
    startup_id INTEGER,
    total_funding NUMERIC,
    total_revenue NUMERIC,
    total_expenses NUMERIC,
    available_funds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        startup_id_param,
        s.total_funding,
        COALESCE((
            SELECT SUM(amount) 
            FROM financial_records 
            WHERE startup_id = startup_id_param AND record_type = 'revenue'
        ), 0) as total_revenue,
        COALESCE((
            SELECT SUM(amount) 
            FROM financial_records 
            WHERE startup_id = startup_id_param AND record_type = 'expense'
        ), 0) as total_expenses,
        COALESCE((
            SELECT SUM(amount) 
            FROM financial_records 
            WHERE startup_id = startup_id_param AND record_type = 'revenue'
        ), 0) - COALESCE((
            SELECT SUM(amount) 
            FROM financial_records 
            WHERE startup_id = startup_id_param AND record_type = 'expense'
        ), 0) as available_funds
    FROM startups s
    WHERE s.id = startup_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: CREATE TRIGGER FUNCTIONS (NO LOCKS)
-- =====================================================

-- Function to update shares when founders change
CREATE OR REPLACE FUNCTION update_startup_shares_on_founder_change()
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

-- Function to update shares when investments change
CREATE OR REPLACE FUNCTION update_startup_shares_on_investment_change()
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

-- =====================================================
-- STEP 3: CREATE TRIGGERS (MINIMAL LOCKS)
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_shares_on_founder_change ON founders;
DROP TRIGGER IF EXISTS trigger_update_shares_on_investment_change ON investment_records;
DROP TRIGGER IF EXISTS trigger_initialize_startup_shares ON startups;

-- Create triggers
CREATE TRIGGER trigger_update_shares_on_founder_change
    AFTER INSERT OR UPDATE OR DELETE ON founders
    FOR EACH ROW EXECUTE FUNCTION update_startup_shares_on_founder_change();

CREATE TRIGGER trigger_update_shares_on_investment_change
    AFTER INSERT OR UPDATE OR DELETE ON investment_records
    FOR EACH ROW EXECUTE FUNCTION update_startup_shares_on_investment_change();

CREATE TRIGGER trigger_initialize_startup_shares
    AFTER INSERT ON startups
    FOR EACH ROW EXECUTE FUNCTION initialize_startup_shares();

-- =====================================================
-- STEP 4: VERIFY FUNCTIONS AND TRIGGERS
-- =====================================================

-- Test the recalculate function (replace 89 with your actual startup ID)
-- SELECT * FROM recalculate_startup_shares(89);

-- Test the cap table data function (replace 89 with your actual startup ID)
-- SELECT * FROM get_cap_table_data(89);

-- Test the financial data function (replace 89 with your actual startup ID)
-- SELECT * FROM get_financial_data(89);
