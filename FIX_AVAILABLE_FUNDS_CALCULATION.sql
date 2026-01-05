-- Fix Available Funds Calculation
-- The correct formula is: Total Funding + Total Revenue - Total Expenditure
-- Previously it was: Total Funding - Total Expenditure (missing revenue)

-- Update the get_startup_financial_summary function
CREATE OR REPLACE FUNCTION get_startup_financial_summary(
    p_startup_id INTEGER
)
RETURNS TABLE (
    total_funding DECIMAL(15,2),
    total_revenue DECIMAL(15,2),
    total_expenses DECIMAL(15,2),
    available_funds DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.total_funding,
        COALESCE(SUM(CASE WHEN fr.record_type = 'revenue' THEN fr.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN fr.record_type = 'expense' THEN fr.amount ELSE 0 END), 0) as total_expenses,
        -- Fixed: Available funds = Total Funding + Total Revenue - Total Expenditure
        s.total_funding + 
        COALESCE(SUM(CASE WHEN fr.record_type = 'revenue' THEN fr.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN fr.record_type = 'expense' THEN fr.amount ELSE 0 END), 0) as available_funds
    FROM startups s
    LEFT JOIN financial_records fr ON s.id = fr.startup_id
    WHERE s.id = p_startup_id
    GROUP BY s.total_funding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_startup_financial_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_startup_financial_summary(INTEGER) TO anon;

-- Verify the function
COMMENT ON FUNCTION get_startup_financial_summary(INTEGER) IS 
'Returns financial summary for a startup. Available funds = Total Funding + Total Revenue - Total Expenditure';


