-- =====================================================
-- MIGRATE should_reveal_contact_details FUNCTION
-- =====================================================
-- Migrates from users table to user_profiles table
-- =====================================================

DROP FUNCTION IF EXISTS should_reveal_contact_details(INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION should_reveal_contact_details(
    p_offer_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    offer_record RECORD;
    has_investment_advisor BOOLEAN := FALSE;
    investor_advisor_code TEXT;
    startup_advisor_code TEXT;
BEGIN
    -- Get offer details
    SELECT 
        io.*,
        s.investment_advisor_code as startup_advisor_code_found
    INTO offer_record
    FROM public.investment_offers io
    LEFT JOIN public.startups s ON io.startup_id = s.id
    WHERE io.id = p_offer_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Get investor advisor code from user_profiles (MIGRATED)
    SELECT COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered)
    INTO investor_advisor_code
    FROM public.user_profiles up
    WHERE up.auth_user_id = offer_record.investor_id
      AND up.role = 'Investor'
    LIMIT 1;
    
    -- Get startup advisor code (already from startups table)
    startup_advisor_code := offer_record.startup_advisor_code_found;
    
    -- Check if either startup or investor has an investment advisor
    has_investment_advisor := (
        startup_advisor_code IS NOT NULL 
        OR investor_advisor_code IS NOT NULL
    );
    
    -- Contact details should be revealed if:
    -- 1. Offer is accepted AND
    -- 2. Either startup or investor has an investment advisor OR
    -- 3. Neither has an investment advisor (direct contact)
    RETURN (
        offer_record.status = 'accepted' AND
        (has_investment_advisor OR (startup_advisor_code IS NULL AND investor_advisor_code IS NULL))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION should_reveal_contact_details(INTEGER) TO authenticated;

-- Verify the function was created
SELECT 
    '✅ Function migrated successfully' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'should_reveal_contact_details' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

