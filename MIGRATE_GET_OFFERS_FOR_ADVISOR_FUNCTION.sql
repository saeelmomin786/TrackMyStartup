-- =====================================================
-- MIGRATE get_offers_for_investment_advisor FUNCTION
-- =====================================================
-- Migrates from users table to user_profiles table
-- =====================================================

DROP FUNCTION IF EXISTS get_offers_for_investment_advisor(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_offers_for_investment_advisor(
    p_advisor_id UUID
)
RETURNS TABLE (
    offer_id INTEGER,
    investor_name TEXT,
    investor_email TEXT,
    startup_name TEXT,
    offer_amount DECIMAL(15,2),
    equity_percentage DECIMAL(5,2),
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    startup_fee_paid BOOLEAN,
    investor_fee_paid BOOLEAN,
    contact_details_revealed BOOLEAN
) AS $$
DECLARE
    advisor_code TEXT;
BEGIN
    -- Get advisor code from user_profiles (MIGRATED)
    SELECT up.investment_advisor_code
    INTO advisor_code
    FROM public.user_profiles up
    WHERE up.auth_user_id = p_advisor_id
      AND up.role = 'Investment Advisor'
    LIMIT 1;
    
    -- If advisor code not found, return empty result
    IF advisor_code IS NULL THEN
        RETURN;
    END IF;
    
    -- Return offers where investor or startup has this advisor
    RETURN QUERY
    SELECT 
        io.id as offer_id,
        COALESCE(up.name, io.investor_email) as investor_name,  -- MIGRATED: Use user_profiles
        io.investor_email,
        io.startup_name,
        io.offer_amount,
        io.equity_percentage,
        io.status::TEXT,
        io.created_at,
        io.startup_scouting_fee_paid,
        io.investor_scouting_fee_paid,
        io.contact_details_revealed
    FROM public.investment_offers io
    LEFT JOIN public.user_profiles up ON io.investor_id = up.auth_user_id  -- MIGRATED: Use user_profiles
      AND up.role = 'Investor'
    LEFT JOIN public.startups s ON io.startup_id = s.id
    WHERE (
        -- Offers from investors with this advisor code
        (up.investment_advisor_code_entered = advisor_code 
         OR up.investment_advisor_code = advisor_code)
        OR
        -- Offers to startups with this advisor code
        s.investment_advisor_code = advisor_code
    )
    ORDER BY io.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_offers_for_investment_advisor(UUID) TO authenticated;

-- Verify the function was created
SELECT 
    '✅ Function migrated successfully' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'get_offers_for_investment_advisor' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


