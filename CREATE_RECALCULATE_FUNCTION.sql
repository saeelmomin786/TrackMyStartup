-- =====================================================
-- CREATE RECALCULATE_STARTUP_SHARES FUNCTION
-- =====================================================
-- This script creates the missing recalculate_startup_shares function
-- that is being called by capTableService.ts

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

-- Verify the function was created
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'recalculate_startup_shares' 
AND routine_schema = 'public';
