-- =====================================================
-- MIGRATE accept_investment_offer_with_fee FUNCTION
-- =====================================================
-- Migrates from users table to user_profiles table
-- =====================================================

DROP FUNCTION IF EXISTS accept_investment_offer_with_fee(INTEGER, VARCHAR, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION accept_investment_offer_with_fee(
    p_offer_id INTEGER,
    p_country VARCHAR(100),
    p_startup_amount_raised DECIMAL(15,2)
) RETURNS BOOLEAN AS $$
DECLARE
    offer_record RECORD;
    investor_fee DECIMAL(15,2);
    has_advisor BOOLEAN := false;
BEGIN
    -- Get the offer details
    SELECT * INTO offer_record FROM public.investment_offers WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if either startup or investor has an investment advisor
    -- MIGRATED: Use user_profiles instead of users table
    SELECT EXISTS(
        -- Check startup advisor
        SELECT 1 FROM public.startups s
        WHERE s.id = offer_record.startup_id 
        AND s.investment_advisor_code IS NOT NULL
        AND s.investment_advisor_code != ''
    ) OR EXISTS(
        -- Check investor advisor using user_profiles
        SELECT 1 FROM public.user_profiles up
        WHERE up.email = offer_record.investor_email
        AND up.role = 'Investor'
        AND (
            up.investment_advisor_code IS NOT NULL 
            OR up.investment_advisor_code_entered IS NOT NULL
        )
    ) INTO has_advisor;
    
    -- Calculate investor scouting fee
    SELECT investor_fee INTO investor_fee
    FROM calculate_scouting_fee(p_country, 'Startup', offer_record.offer_amount)
    LIMIT 1;
    
    -- Update the offer
    UPDATE public.investment_offers
    SET 
        country = p_country,
        startup_amount_raised = p_startup_amount_raised,
        investor_scouting_fee_amount = investor_fee,
        startup_scouting_fee_amount = investor_fee * 0.3, -- 30% of investor fee
        status = CASE 
            WHEN has_advisor THEN 'pending_advisor_approval'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_investment_offer_with_fee(INTEGER, VARCHAR, DECIMAL) TO authenticated;

-- Verify the function was created
SELECT 
    '✅ Function migrated successfully' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'accept_investment_offer_with_fee' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

