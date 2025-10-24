-- Drop and recreate the get_investor_recommendations function to fix the ambiguous column reference
-- This script handles the parameter name change properly

-- 1. Drop the existing function first
DROP FUNCTION IF EXISTS get_investor_recommendations(UUID);

-- 2. Recreate the function with the correct parameter name
CREATE OR REPLACE FUNCTION get_investor_recommendations(p_investor_id UUID)
RETURNS TABLE (
    id INTEGER,
    startup_name TEXT,
    startup_sector TEXT,
    startup_valuation DECIMAL(15,2),
    recommended_deal_value DECIMAL(15,2),
    recommended_valuation DECIMAL(15,2),
    recommendation_notes TEXT,
    advisor_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        iar.id,
        s.name,
        s.sector,
        s.current_valuation,
        iar.recommended_deal_value,
        iar.recommended_valuation,
        iar.recommendation_notes,
        u.name as advisor_name,
        iar.status,
        iar.created_at
    FROM investment_advisor_recommendations iar
    JOIN startups s ON iar.startup_id = s.id
    JOIN users u ON iar.investment_advisor_id = u.id
    WHERE iar.investor_id = p_investor_id
    ORDER BY iar.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant permissions to the recreated function
GRANT EXECUTE ON FUNCTION get_investor_recommendations(UUID) TO authenticated;
