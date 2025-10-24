-- Fix approval constraints and ensure proper values
-- This script fixes the CHECK constraint violations

-- 1. Drop the existing CHECK constraints that are too restrictive
ALTER TABLE investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_advisor_approval_status_check,
DROP CONSTRAINT IF EXISTS investment_offers_startup_advisor_approval_status_check,
DROP CONSTRAINT IF EXISTS investment_offers_stage_check;

-- 2. Add more flexible CHECK constraints
ALTER TABLE investment_offers 
ADD CONSTRAINT investment_offers_investor_advisor_approval_status_check 
CHECK (investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'approve', 'reject'));

ALTER TABLE investment_offers 
ADD CONSTRAINT investment_offers_startup_advisor_approval_status_check 
CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'approve', 'reject'));

ALTER TABLE investment_offers 
ADD CONSTRAINT investment_offers_stage_check 
CHECK (stage >= 1 AND stage <= 4);

-- 3. Update the approval functions to handle the constraint properly
CREATE OR REPLACE FUNCTION approve_investor_advisor_offer(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    approval_status TEXT;
BEGIN
    -- Validate action and map to proper status
    IF p_approval_action = 'approve' THEN
        approval_status := 'approved';
    ELSIF p_approval_action = 'reject' THEN
        approval_status := 'rejected';
    ELSE
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Update the offer with investor advisor approval
    UPDATE investment_offers 
    SET 
        investor_advisor_approval_status = approval_status,
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
        'status', approval_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Update startup advisor approval function
CREATE OR REPLACE FUNCTION approve_startup_advisor_offer(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    approval_status TEXT;
BEGIN
    -- Validate action and map to proper status
    IF p_approval_action = 'approve' THEN
        approval_status := 'approved';
    ELSIF p_approval_action = 'reject' THEN
        approval_status := 'rejected';
    ELSE
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Update the offer with startup advisor approval
    UPDATE investment_offers 
    SET 
        startup_advisor_approval_status = approval_status,
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
        'status', approval_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;
