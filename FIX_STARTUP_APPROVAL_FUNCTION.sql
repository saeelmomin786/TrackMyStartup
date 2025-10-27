-- Fix the approve_startup_offer function to use correct enum values
-- This function should set status to 'accepted' for approval, not 'approved'

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
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record FROM investment_offers WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer with ID % not found', p_offer_id;
    END IF;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        new_stage := 4; -- Final approval
        new_status := 'approved'; -- Use 'approved' for final approval (valid enum value)
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected'; -- Use valid enum value
    END IF;
    
    -- Check if contact details should be revealed (no advisors on either side)
    DECLARE
        should_reveal BOOLEAN := FALSE;
    BEGIN
        -- Check if neither investor nor startup has an advisor
        SELECT NOT EXISTS(
            SELECT 1 FROM users u1 
            WHERE u1.email = offer_record.investor_email 
            AND u1.investment_advisor_code IS NOT NULL
        ) AND NOT EXISTS(
            SELECT 1 FROM startups s 
            JOIN users u2 ON s.user_id = u2.id 
            WHERE s.id = offer_record.startup_id 
            AND u2.investment_advisor_code IS NOT NULL
        ) INTO should_reveal;
        
        -- Update the offer
        UPDATE investment_offers 
        SET 
            stage = new_stage,
            status = new_status::offer_status, -- Cast to enum type
            contact_details_revealed = CASE WHEN should_reveal AND p_approval_action = 'approve' THEN TRUE ELSE contact_details_revealed END,
            contact_details_revealed_at = CASE WHEN should_reveal AND p_approval_action = 'approve' THEN NOW() ELSE contact_details_revealed_at END,
            updated_at = NOW()
        WHERE id = p_offer_id;
    END;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_startup_offer(INTEGER, TEXT) TO authenticated;
