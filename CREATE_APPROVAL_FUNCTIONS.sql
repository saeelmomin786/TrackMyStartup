-- Create missing approval functions for investment offers
-- These functions handle the approval/rejection workflow for investment advisors

-- 1. Function to approve/reject offers by investor advisor
CREATE OR REPLACE FUNCTION approve_investor_advisor_offer(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Update the offer with investor advisor approval
    UPDATE investment_offers 
    SET 
        investor_advisor_approval_status = p_approval_action,
        investor_advisor_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer with ID % not found', p_offer_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Investor advisor approval updated successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to approve/reject offers by startup advisor
CREATE OR REPLACE FUNCTION approve_startup_advisor_offer(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Update the offer with startup advisor approval
    UPDATE investment_offers 
    SET 
        startup_advisor_approval_status = p_approval_action,
        startup_advisor_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer with ID % not found', p_offer_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup advisor approval updated successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;
