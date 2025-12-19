-- =====================================================
-- MIGRATE get_co_investment_opportunities_for_user() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function gets co-investment opportunities for a user based on advisor relationship
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS get_co_investment_opportunities_for_user(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_co_investment_opportunities_for_user(p_user_id UUID)
RETURNS TABLE (
    opportunity_id INTEGER,
    startup_id INTEGER,
    startup_name VARCHAR(255),
    startup_sector VARCHAR(100),
    startup_stage VARCHAR(50),
    listed_by_user_id UUID,
    listed_by_name VARCHAR(255),
    listed_by_type VARCHAR(20),
    investment_amount DECIMAL(15,2),
    equity_percentage DECIMAL(5,2),
    minimum_co_investment DECIMAL(15,2),
    maximum_co_investment DECIMAL(15,2),
    description TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cio.id as opportunity_id,
        cio.startup_id,
        s.name as startup_name,
        s.sector as startup_sector,
        s.stage::VARCHAR as startup_stage,
        cio.listed_by_user_id,
        up_listed.name::VARCHAR as listed_by_name,
        cio.listed_by_type,
        cio.investment_amount,
        cio.equity_percentage,
        cio.minimum_co_investment,
        cio.maximum_co_investment,
        cio.description,
        cio.status,
        cio.created_at
    FROM co_investment_opportunities cio
    JOIN startups s ON cio.startup_id = s.id
    -- MIGRATED: Join with user_profiles instead of users (get most recent profile)
    LEFT JOIN LATERAL (
        SELECT name
        FROM user_profiles
        WHERE auth_user_id = cio.listed_by_user_id
        ORDER BY created_at DESC
        LIMIT 1
    ) up_listed ON true
    WHERE cio.status = 'active'
    AND (
        -- MIGRATED: Check if user has investment advisor using user_profiles
        (EXISTS (
            SELECT 1 FROM user_profiles up_check
            WHERE up_check.auth_user_id = p_user_id
            AND up_check.role = 'Investor'
            AND (
                up_check.investment_advisor_code IS NOT NULL
                OR up_check.investment_advisor_code_entered IS NOT NULL
            )
            LIMIT 1
        ) AND EXISTS (
            SELECT 1 FROM co_investment_approvals cia
            WHERE cia.opportunity_id = cio.id
            AND cia.investor_id = p_user_id
            AND cia.approved = true
        ))
        OR
        -- MIGRATED: If user doesn't have investment advisor, show all opportunities
        (NOT EXISTS (
            SELECT 1 FROM user_profiles up_check
            WHERE up_check.auth_user_id = p_user_id
            AND up_check.role = 'Investor'
            AND (
                up_check.investment_advisor_code IS NOT NULL
                OR up_check.investment_advisor_code_entered IS NOT NULL
            )
            LIMIT 1
        ))
    )
    ORDER BY cio.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_co_investment_opportunities_for_user(UUID) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_co_investment_opportunities_for_user() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;

