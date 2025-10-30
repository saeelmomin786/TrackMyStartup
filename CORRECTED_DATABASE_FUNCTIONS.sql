-- CORRECTED Database Functions with Proper Enum Values
-- This script fixes all approval functions to use correct offer_status enum values

-- 1. Drop all existing approval functions
DROP FUNCTION IF EXISTS approve_investor_advisor_offer(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_startup_advisor_offer(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_startup_offer(INTEGER, TEXT) CASCADE;

-- 2. Create corrected investor advisor approval function
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
        -- Check if startup has advisor
        IF EXISTS (
            SELECT 1 FROM startups 
            WHERE id = offer_record.startup_id 
            AND investment_advisor_code IS NOT NULL
        ) THEN
            new_stage := 2; -- Move to startup advisor approval
            new_status := 'pending'; -- Use valid enum value
        ELSE
            new_stage := 3; -- Skip to startup review
            new_status := 'pending'; -- Use valid enum value
        END IF;
    ELSE
        -- Rejection - back to stage 1
        new_stage := 1;
        new_status := 'rejected'; -- Use valid enum value
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        investor_advisor_approval_status = p_approval_action,
        investor_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status::offer_status, -- Cast to enum type
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Investor advisor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Create corrected startup advisor approval function
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
        new_stage := 3; -- Move to startup review
        new_status := 'pending'; -- Use valid enum value
    ELSE
        -- Rejection - back to stage 2
        new_stage := 2;
        new_status := 'rejected'; -- Use valid enum value
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        startup_advisor_approval_status = p_approval_action,
        startup_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status::offer_status, -- Cast to enum type
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup advisor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Create corrected startup final approval function
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
        new_status := 'approved'; -- Use valid enum value
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected'; -- Use valid enum value
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        stage = new_stage,
        status = new_status::offer_status, -- Cast to enum type
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
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_offer(INTEGER, TEXT) TO authenticated;








