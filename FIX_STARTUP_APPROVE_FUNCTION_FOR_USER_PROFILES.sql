-- =====================================================
-- FIX approve_startup_offer FUNCTION FOR USER_PROFILES
-- =====================================================
-- The current function uses the old 'users' table instead of 'user_profiles'.
-- This fix updates it to use user_profiles and investor_id for proper lookups.
-- =====================================================

DROP FUNCTION IF EXISTS approve_startup_offer(INTEGER, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION approve_startup_offer(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    offer_record RECORD;
    new_stage INTEGER;
    new_status TEXT;
    should_reveal_contacts BOOLEAN := FALSE;
    investor_has_advisor BOOLEAN := FALSE;
    startup_has_advisor BOOLEAN := FALSE;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record 
    FROM investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check if investor has advisor using user_profiles
    -- Check both investment_advisor_code and investment_advisor_code_entered
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_profiles up
        WHERE up.auth_user_id = offer_record.investor_id
        AND up.role = 'Investor'
        AND (
            up.investment_advisor_code IS NOT NULL 
            OR up.investment_advisor_code_entered IS NOT NULL
        )
    ) INTO investor_has_advisor;
    
    -- Check if startup has advisor
    SELECT EXISTS(
        SELECT 1 
        FROM public.startups s
        WHERE s.id = offer_record.startup_id
        AND s.investment_advisor_code IS NOT NULL
        AND s.investment_advisor_code != ''
    ) INTO startup_has_advisor;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        new_stage := 4; -- Final approval
        new_status := 'accepted'; -- Use 'accepted' for final approval (valid enum value)
        
        -- Check if contact details should be revealed
        -- Reveal if neither party has an advisor (both went through without advisors)
        should_reveal_contacts := NOT investor_has_advisor AND NOT startup_has_advisor;
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected'; -- Use valid enum value
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        stage = new_stage,
        status = new_status::offer_status,  -- Explicitly cast TEXT to enum type
        contact_details_revealed = CASE 
            WHEN should_reveal_contacts AND p_approval_action = 'approve' THEN TRUE 
            ELSE contact_details_revealed 
        END,
        contact_details_revealed_at = CASE 
            WHEN should_reveal_contacts AND p_approval_action = 'approve' THEN NOW()
            ELSE contact_details_revealed_at
        END,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Verify update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update offer with ID %', p_offer_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'contacts_revealed', should_reveal_contacts,
        'investor_has_advisor', investor_has_advisor,
        'startup_has_advisor', startup_has_advisor,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_startup_offer(INTEGER, TEXT) TO authenticated;

-- Verify the function was created
SELECT 
    'Function created successfully' as status,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'approve_startup_offer' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

