-- Fix the ambiguous column reference in get_investor_recommendations function
-- The issue is that the parameter name 'investor_id' conflicts with the column name 'investor_id'

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
