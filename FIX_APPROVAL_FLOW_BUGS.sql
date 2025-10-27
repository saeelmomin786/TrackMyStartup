-- Fix approval flow bugs - Standardized functions with proper stage management
-- This script fixes all identified bugs in the approval flow

-- 1. Drop all existing approval functions (including all possible signatures)
DROP FUNCTION IF EXISTS approve_investor_advisor_offer(INTEGER, TEXT);
DROP FUNCTION IF EXISTS approve_startup_advisor_offer(INTEGER, TEXT);
DROP FUNCTION IF EXISTS approve_startup_offer(INTEGER, TEXT);

-- Drop functions with different return types if they exist
DROP FUNCTION IF EXISTS approve_investor_advisor_offer(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_startup_advisor_offer(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_startup_offer(INTEGER, TEXT) CASCADE;

-- 2. Create standardized investor advisor approval function
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
            new_status := 'pending_startup_advisor_approval';
        ELSE
            new_stage := 3; -- Skip to startup review
            new_status := 'pending_startup_review';
        END IF;
    ELSE
        -- Rejection - back to stage 1
        new_stage := 1;
        new_status := 'rejected';
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        investor_advisor_approval_status = p_approval_action,
        investor_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status,
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

-- 3. Create standardized startup advisor approval function
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
        new_status := 'pending_startup_review';
    ELSE
        -- Rejection - back to stage 2
        new_stage := 2;
        new_status := 'startup_advisor_rejected';
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        startup_advisor_approval_status = p_approval_action,
        startup_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status,
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

-- 4. Create function for startup final approval
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
        new_status := 'accepted';
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected';
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        stage = new_stage,
        status = new_status,
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

-- 6. Update existing offers to have proper stage values
UPDATE investment_offers 
SET stage = 1 
WHERE stage IS NULL;

-- 7. Add constraints to ensure data integrity
ALTER TABLE investment_offers 
ADD CONSTRAINT check_stage_range CHECK (stage >= 1 AND stage <= 4);

ALTER TABLE investment_offers 
ADD CONSTRAINT check_investor_advisor_status CHECK (
    investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')
);

ALTER TABLE investment_offers 
ADD CONSTRAINT check_startup_advisor_status CHECK (
    startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')
);
