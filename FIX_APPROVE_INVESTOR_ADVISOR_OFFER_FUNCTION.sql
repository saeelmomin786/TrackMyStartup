-- FIX: Update approve_investor_advisor_offer function to correctly set approval status
-- The current function sets investor_advisor_approval_status = 'approve' instead of 'approved'
-- This bug was introduced in STEP_1_DROP_AND_CREATE_INVESTOR_ADVISOR.sql
-- The working version was in FIX_APPROVAL_SYSTEM_BUGS.sql - this restores that working version

DROP FUNCTION IF EXISTS approve_investor_advisor_offer(INTEGER, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION approve_investor_advisor_offer(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    offer_record RECORD;
    new_stage INTEGER;
    new_status TEXT;
    approval_status TEXT;
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
    
    -- Set approval status correctly (FIX: 'approved' not 'approve')
    approval_status := CASE 
        WHEN p_approval_action = 'approve' THEN 'approved'
        ELSE 'rejected'
    END;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        -- Check if startup has advisor
        IF EXISTS (
            SELECT 1 FROM startups 
            WHERE id = offer_record.startup_id 
            AND investment_advisor_code IS NOT NULL
            AND investment_advisor_code != ''
        ) THEN
            new_stage := 2; -- Move to startup advisor approval
            new_status := 'pending'; -- Will be displayed as pending_startup_advisor_approval
        ELSE
            new_stage := 3; -- Skip to startup review
            new_status := 'pending'; -- Will be displayed as pending
        END IF;
    ELSE
        -- Rejection - back to stage 1
        new_stage := 1;
        new_status := 'rejected';
    END IF;
    
    -- Update the offer (FIX: Use approval_status variable, not p_approval_action)
    UPDATE investment_offers 
    SET 
        investor_advisor_approval_status = approval_status,  -- FIX: 'approved' not 'approve'
        investor_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status::offer_status,  -- Cast to enum type
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Verify update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update offer with ID %', p_offer_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Investor advisor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'investor_advisor_approval_status', approval_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;

-- Verify the function was created
SELECT 
    'Function created successfully' as status,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'approve_investor_advisor_offer' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

