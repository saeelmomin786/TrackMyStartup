-- RESTORE WORKING VERSION: approve_investor_advisor_offer function
-- This restores the working version from FIX_APPROVAL_SYSTEM_BUGS.sql
-- The buggy version in STEP_1_DROP_AND_CREATE_INVESTOR_ADVISOR.sql was setting
-- investor_advisor_approval_status = p_approval_action ('approve') instead of 'approved'

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
    startup_has_advisor BOOLEAN;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details with startup advisor check
    -- Check both by startup_id and by startup_name (in case startup_id is NULL)
    SELECT 
        io.*,
        CASE 
            WHEN s1.investment_advisor_code IS NOT NULL AND s1.investment_advisor_code != '' THEN TRUE
            WHEN s2.investment_advisor_code IS NOT NULL AND s2.investment_advisor_code != '' THEN TRUE
            ELSE FALSE 
        END as startup_has_advisor,
        COALESCE(s1.investment_advisor_code, s2.investment_advisor_code) as startup_advisor_code_found
    INTO offer_record
    FROM investment_offers io
    LEFT JOIN startups s1 ON io.startup_id = s1.id
    LEFT JOIN startups s2 ON io.startup_name = s2.name AND io.startup_id IS NULL
    WHERE io.id = p_offer_id;
    
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
        -- Check if startup has advisor (use the flag we set above)
        IF offer_record.startup_has_advisor = TRUE THEN
            RAISE NOTICE 'Startup has advisor, moving to Stage 2 for startup advisor approval';
            new_stage := 2; -- Move to startup advisor approval
            new_status := 'pending'; -- Store as text, will cast in UPDATE
        ELSE
            RAISE NOTICE 'Startup has NO advisor, moving to Stage 3 for startup review';
            new_stage := 3; -- Skip to startup review
            new_status := 'pending'; -- Store as text, will cast in UPDATE
        END IF;
    ELSE
        -- Rejection - back to stage 1
        new_stage := 1;
        new_status := 'rejected'; -- Store as text, will cast in UPDATE
    END IF;
    
    -- Update the offer with correct values
    -- IMPORTANT: Cast status to offer_status enum type in UPDATE statement
    UPDATE investment_offers 
    SET 
        investor_advisor_approval_status = approval_status,  -- FIX: Use 'approved' not 'approve'
        investor_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status::offer_status,  -- Explicitly cast TEXT to enum type
        -- Set startup advisor status if moving to stage 2
        startup_advisor_approval_status = CASE 
            WHEN new_stage = 2 THEN 'pending'
            WHEN new_stage = 3 THEN 'not_required'
            ELSE startup_advisor_approval_status
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

-- Verify the function was created correctly
SELECT 
    '✅ Function restored successfully' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'approve_investor_advisor_offer' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

