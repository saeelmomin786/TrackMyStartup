-- =====================================================
-- FIX approve_startup_advisor_offer FUNCTION
-- =====================================================
-- The current function sets startup_advisor_approval_status = p_approval_action
-- which sets 'approve' instead of 'approved'. This fix corrects it to use the proper enum value.
-- =====================================================

DROP FUNCTION IF EXISTS approve_startup_advisor_offer(INTEGER, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION approve_startup_advisor_offer(
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
        new_stage := 3; -- Move to startup review
        new_status := 'pending'; -- Will be displayed as pending_startup_review
    ELSE
        -- Rejection - back to stage 2
        new_stage := 2;
        new_status := 'rejected'; -- Store as text, will cast in UPDATE
    END IF;
    
    -- Update the offer with correct values
    -- IMPORTANT: Cast status to offer_status enum type in UPDATE statement
    UPDATE investment_offers 
    SET 
        startup_advisor_approval_status = approval_status,  -- FIX: Use 'approved' not 'approve'
        startup_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status::offer_status,  -- Explicitly cast TEXT to enum type
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Verify update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update offer with ID %', p_offer_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup advisor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'startup_advisor_approval_status', approval_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;

-- Verify the function was created
SELECT 
    'Function created successfully' as status,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'approve_startup_advisor_offer' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

