-- Check and create missing parts of the recommendation system
-- This script only creates what doesn't already exist

-- 1. Check if the table exists and create if missing
CREATE TABLE IF NOT EXISTS investment_advisor_recommendations (
    id SERIAL PRIMARY KEY,
    investment_advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    startup_id INTEGER NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommended_deal_value DECIMAL(15,2),
    recommended_valuation DECIMAL(15,2),
    recommendation_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'interested', 'not_interested')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create or replace the function (this will work even if it exists)
CREATE OR REPLACE FUNCTION get_investor_recommendations(investor_id UUID)
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
    WHERE iar.investor_id = investor_id
    ORDER BY iar.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Enable RLS if not already enabled
ALTER TABLE investment_advisor_recommendations ENABLE ROW LEVEL SECURITY;

-- 4. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_advisor_id ON investment_advisor_recommendations(investment_advisor_id);
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_investor_id ON investment_advisor_recommendations(investor_id);
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_startup_id ON investment_advisor_recommendations(startup_id);
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_status ON investment_advisor_recommendations(status);

-- 5. Grant permissions if not already granted
GRANT SELECT, INSERT, UPDATE ON investment_advisor_recommendations TO authenticated;
GRANT USAGE ON SEQUENCE investment_advisor_recommendations_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_investor_recommendations(UUID) TO authenticated;
