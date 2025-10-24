-- Create Investment Advisor Recommendations System
-- This script creates the complete recommendation system for investment advisors

-- 1. Create investment_advisor_recommendations table
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

-- 2. Create function to get recommendations for an investor
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

-- 3. Enable RLS on investment_advisor_recommendations
ALTER TABLE investment_advisor_recommendations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for investment_advisor_recommendations
-- Policy for Investment Advisors to see their own recommendations
CREATE POLICY "Investment Advisors can view their own recommendations" ON investment_advisor_recommendations
    FOR SELECT USING (
        investment_advisor_id = auth.uid()
    );

-- Policy for Investors to see recommendations made to them
CREATE POLICY "Investors can view recommendations made to them" ON investment_advisor_recommendations
    FOR SELECT USING (
        investor_id = auth.uid()
    );

-- Policy for Investment Advisors to create recommendations
CREATE POLICY "Investment Advisors can create recommendations" ON investment_advisor_recommendations
    FOR INSERT WITH CHECK (
        investment_advisor_id = auth.uid()
    );

-- Policy for updating recommendation status
CREATE POLICY "Users can update recommendation status" ON investment_advisor_recommendations
    FOR UPDATE USING (
        investor_id = auth.uid() OR
        investment_advisor_id = auth.uid()
    );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_advisor_id ON investment_advisor_recommendations(investment_advisor_id);
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_investor_id ON investment_advisor_recommendations(investor_id);
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_startup_id ON investment_advisor_recommendations(startup_id);
CREATE INDEX IF NOT EXISTS idx_investment_advisor_rec_status ON investment_advisor_recommendations(status);

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON investment_advisor_recommendations TO authenticated;
GRANT USAGE ON SEQUENCE investment_advisor_recommendations_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_investor_recommendations(UUID) TO authenticated;
