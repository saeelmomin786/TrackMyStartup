-- CREATE_MISSING_RPC_FUNCTIONS.sql
-- Create the missing RPC functions that are causing 404 errors

-- 1. Create the get_recommended_co_investment_opportunities function
CREATE OR REPLACE FUNCTION get_recommended_co_investment_opportunities(p_investor_id UUID)
RETURNS TABLE (
    id INTEGER,
    startup_id INTEGER,
    startup_name TEXT,
    startup_sector TEXT,
    startup_stage TEXT,
    listed_by_user_id UUID,
    listed_by_name TEXT,
    listed_by_type TEXT,
    investment_amount DECIMAL(15,2),
    equity_percentage DECIMAL(5,2),
    minimum_co_investment DECIMAL(15,2),
    maximum_co_investment DECIMAL(15,2),
    description TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- For now, return empty results since co-investment functionality is not fully implemented
    -- This prevents the 404 error while the feature is being developed
    RETURN QUERY
    SELECT 
        NULL::INTEGER as id,
        NULL::INTEGER as startup_id,
        NULL::TEXT as startup_name,
        NULL::TEXT as startup_sector,
        NULL::TEXT as startup_stage,
        NULL::UUID as listed_by_user_id,
        NULL::TEXT as listed_by_name,
        NULL::TEXT as listed_by_type,
        NULL::DECIMAL(15,2) as investment_amount,
        NULL::DECIMAL(5,2) as equity_percentage,
        NULL::DECIMAL(15,2) as minimum_co_investment,
        NULL::DECIMAL(15,2) as maximum_co_investment,
        NULL::TEXT as description,
        NULL::TEXT as status,
        NULL::TIMESTAMP WITH TIME ZONE as created_at
    WHERE FALSE; -- This ensures no rows are returned
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_recommended_co_investment_opportunities(UUID) TO authenticated;

-- 3. Test the function
SELECT '=== TESTING RPC FUNCTION ===' as info;
SELECT * FROM get_recommended_co_investment_opportunities('00000000-0000-0000-0000-000000000000'::UUID);

-- 4. Verify the function was created
SELECT '=== VERIFYING FUNCTION CREATION ===' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_recommended_co_investment_opportunities'
    AND routine_schema = 'public';