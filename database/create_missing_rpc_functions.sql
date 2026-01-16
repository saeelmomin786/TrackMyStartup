-- =====================================================
-- CREATE MISSING RPC FUNCTIONS
-- =====================================================
-- This script creates the missing RPC functions that are causing 404 errors
-- These functions will work even if the underlying tables don't exist
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE get_valuation_history FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_valuation_history(p_startup_id INTEGER)
RETURNS TABLE (
    round_name TEXT,
    valuation DECIMAL(15,2),
    investment_amount DECIMAL(15,2),
    date DATE
) AS $$
BEGIN
    -- Check if valuation_history table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'valuation_history') THEN
        RETURN QUERY
        SELECT 
            COALESCE(vh.round_type::TEXT, 'Unknown') as round_name,
            COALESCE(vh.valuation, 0) as valuation,
            COALESCE(vh.investment_amount, 0) as investment_amount,
            COALESCE(vh.date, CURRENT_DATE) as date
        FROM public.valuation_history vh
        WHERE vh.startup_id = p_startup_id
        ORDER BY vh.date ASC;
    ELSE
        -- If table doesn't exist, return empty result set
        RETURN QUERY
        SELECT 
            'Unknown'::TEXT as round_name,
            0::DECIMAL(15,2) as valuation,
            0::DECIMAL(15,2) as investment_amount,
            CURRENT_DATE::DATE as date
        WHERE FALSE; -- This ensures no rows are returned
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_valuation_history(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_valuation_history(INTEGER) TO anon;

-- =====================================================
-- 2. CREATE get_equity_distribution FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_equity_distribution(p_startup_id INTEGER)
RETURNS TABLE (
    holder_type TEXT,
    equity_percentage DECIMAL(5,2),
    total_amount DECIMAL(15,2)
) AS $$
BEGIN
    -- Check if equity_holdings table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equity_holdings') THEN
        RETURN QUERY
        SELECT 
            COALESCE(eh.holder_type::TEXT, 'Unknown') as holder_type,
            COALESCE(eh.equity_percentage, 0) as equity_percentage,
            COALESCE(SUM(ir.amount), 0) as total_amount
        FROM public.equity_holdings eh
        LEFT JOIN public.investment_records ir ON ir.startup_id = eh.startup_id 
            AND ir.investor_name = eh.holder_name
        WHERE eh.startup_id = p_startup_id
        GROUP BY eh.holder_type, eh.equity_percentage
        ORDER BY eh.equity_percentage DESC;
    ELSE
        -- If table doesn't exist, try to calculate from investment_records
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investment_records') THEN
            RETURN QUERY
            SELECT 
                COALESCE(ir.investor_type::TEXT, 'Investor') as holder_type,
                COALESCE(ir.equity_allocated, 0) as equity_percentage,
                COALESCE(SUM(ir.amount), 0) as total_amount
            FROM public.investment_records ir
            WHERE ir.startup_id = p_startup_id
            GROUP BY ir.investor_type, ir.equity_allocated
            ORDER BY ir.equity_allocated DESC;
        ELSE
            -- If neither table exists, return empty result set
            RETURN QUERY
            SELECT 
                'Unknown'::TEXT as holder_type,
                0::DECIMAL(5,2) as equity_percentage,
                0::DECIMAL(15,2) as total_amount
            WHERE FALSE; -- This ensures no rows are returned
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_equity_distribution(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_equity_distribution(INTEGER) TO anon;

-- =====================================================
-- 3. VERIFY CREATION
-- =====================================================

-- Check if functions were created successfully
SELECT 
    routine_name,
    routine_type,
    '✅ CREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_valuation_history', 'get_equity_distribution')
ORDER BY routine_name;

-- Test the functions (they should return empty results if tables don't exist, but not error)
SELECT 'Testing get_valuation_history...' as test;
SELECT * FROM get_valuation_history(1) LIMIT 1;

SELECT 'Testing get_equity_distribution...' as test;
SELECT * FROM get_equity_distribution(1) LIMIT 1;
