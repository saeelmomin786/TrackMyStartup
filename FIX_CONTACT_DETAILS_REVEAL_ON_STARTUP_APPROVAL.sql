-- Fix the approve_startup_offer function to automatically reveal contact details
-- when both advisors have approved AND startup accepts the offer (stage 4)
-- Previously, contact details were only revealed when there were no advisors

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
    should_reveal BOOLEAN := FALSE;
    investor_has_advisor BOOLEAN := FALSE;
    startup_has_advisor BOOLEAN := FALSE;
    both_advisors_approved BOOLEAN := FALSE;
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
        new_status := 'accepted'; -- Use 'accepted' for final approval (valid enum value)
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected'; -- Use valid enum value
    END IF;
    
    -- Check if contact details should be revealed
    -- Only reveal on approval, not rejection
    IF p_approval_action = 'approve' THEN
        -- Check if investor has advisor
        SELECT EXISTS(
            SELECT 1 FROM users u1 
            WHERE u1.email = offer_record.investor_email 
            AND (u1.investment_advisor_code IS NOT NULL AND u1.investment_advisor_code != '')
        ) INTO investor_has_advisor;
        
        -- Check if startup has advisor
        SELECT EXISTS(
            SELECT 1 FROM startups s 
            JOIN users u2 ON s.user_id = u2.id 
            WHERE s.id = offer_record.startup_id 
            AND (u2.investment_advisor_code IS NOT NULL AND u2.investment_advisor_code != '')
        ) INTO startup_has_advisor;
        
        -- Check if both advisors have approved
        both_advisors_approved := 
            (offer_record.investor_advisor_approval_status = 'approved' OR offer_record.investor_advisor_approval_status = 'not_required') AND
            (offer_record.startup_advisor_approval_status = 'approved' OR offer_record.startup_advisor_approval_status = 'not_required');
        
        -- Reveal contact details if:
        -- 1. No advisors on either side (automatic reveal)
        -- 2. OR both advisors have approved AND startup accepts (all approvals complete)
        should_reveal := 
            (NOT investor_has_advisor AND NOT startup_has_advisor) OR
            (both_advisors_approved AND new_stage = 4);
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        stage = new_stage,
        status = new_status::offer_status, -- Cast to enum type
        contact_details_revealed = CASE WHEN should_reveal THEN TRUE ELSE contact_details_revealed END,
        contact_details_revealed_at = CASE WHEN should_reveal THEN NOW() ELSE contact_details_revealed_at END,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'contact_details_revealed', should_reveal,
        'both_advisors_approved', both_advisors_approved,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_startup_offer(INTEGER, TEXT) TO authenticated;

-- Fix existing offers that should have contact details revealed
-- Update offers where both advisors approved and startup accepted (stage 4)
UPDATE investment_offers 
SET 
    contact_details_revealed = TRUE,
    contact_details_revealed_at = COALESCE(contact_details_revealed_at, updated_at, NOW())
WHERE stage = 4 
AND status IN ('accepted', 'approved')
AND (
    (investor_advisor_approval_status = 'approved' AND startup_advisor_approval_status = 'approved') OR
    (investor_advisor_approval_status = 'not_required' AND startup_advisor_approval_status = 'approved') OR
    (investor_advisor_approval_status = 'approved' AND startup_advisor_approval_status = 'not_required') OR
    (investor_advisor_approval_status = 'not_required' AND startup_advisor_approval_status = 'not_required')
)
AND contact_details_revealed = FALSE;









