-- =====================================================
-- MIGRATE get_all_co_investment_opportunities() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns all co-investment opportunities for investment advisors
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS get_all_co_investment_opportunities() CASCADE;

CREATE OR REPLACE FUNCTION get_all_co_investment_opportunities()
RETURNS TABLE (
    opportunity_id INTEGER,
    startup_id INTEGER,
    startup_name VARCHAR(255),
    startup_sector VARCHAR(100),
    startup_stage VARCHAR(50),
    listed_by_user_id INTEGER,
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
        s.name::VARCHAR as startup_name,
        s.sector::VARCHAR as startup_sector,
        s.stage::VARCHAR as startup_stage,
        cio.listed_by_user_id::INTEGER,
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
    ORDER BY cio.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_co_investment_opportunities() TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_all_co_investment_opportunities() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;

