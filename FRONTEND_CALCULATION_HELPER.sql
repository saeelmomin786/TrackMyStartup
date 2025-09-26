-- =====================================================
-- FRONTEND CALCULATION HELPER FUNCTIONS
-- =====================================================
-- These functions can be called from the frontend to ensure
-- calculations are always correct

-- Function to recalculate all shares for a specific startup
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

-- Function to get accurate cap table data for frontend
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

-- Function to get accurate financial data for frontend
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
-- USAGE EXAMPLES
-- =====================================================

-- Example: Recalculate shares for startup ID 89
-- SELECT * FROM recalculate_startup_shares(89);

-- Example: Get cap table data for startup ID 89
-- SELECT * FROM get_cap_table_data(89);

-- Example: Get financial data for startup ID 89
-- SELECT * FROM get_financial_data(89);
