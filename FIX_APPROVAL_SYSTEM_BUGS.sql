-- Fix Approval System Bugs - Complete Fix
-- This script fixes all bugs in the approval flow system

-- 1. Drop all existing approval functions
DROP FUNCTION IF EXISTS approve_investor_advisor_offer(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_startup_advisor_offer(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_startup_offer(INTEGER, TEXT) CASCADE;

-- 2. Create fixed investor advisor approval function
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
    
    -- Debug: Log startup advisor check
    RAISE NOTICE 'Offer ID: %, startup_id: %, startup_name: %, startup_has_advisor: %, advisor_code: %', 
        p_offer_id, offer_record.startup_id, offer_record.startup_name, 
        offer_record.startup_has_advisor, offer_record.startup_advisor_code_found;
    
    -- Set approval status correctly
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
        investor_advisor_approval_status = approval_status,
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

-- 3. Create fixed startup advisor approval function
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
    
    -- Set approval status correctly
    approval_status := CASE 
        WHEN p_approval_action = 'approve' THEN 'approved'
        ELSE 'rejected'
    END;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        new_stage := 3; -- Move to startup review
        new_status := 'pending'; -- Use valid enum value
    ELSE
        -- Rejection - back to stage 2
        new_stage := 2;
        new_status := 'pending'; -- Keep pending, just marked as rejected by advisor
    END IF;
    
    -- Update the offer with correct values
    UPDATE investment_offers 
    SET 
        startup_advisor_approval_status = approval_status,
        startup_advisor_approval_at = NOW(),
        stage = new_stage,
        status = new_status::offer_status,  -- Explicitly cast TEXT to enum type
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

-- 4. Create fixed startup final approval function
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
    investor_has_advisor BOOLEAN;
    startup_has_advisor BOOLEAN;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details with advisor checks
    SELECT 
        io.*,
        CASE WHEN inv.investment_advisor_code IS NOT NULL THEN TRUE ELSE FALSE END as investor_has_advisor,
        CASE WHEN s.investment_advisor_code IS NOT NULL THEN TRUE ELSE FALSE END as startup_has_advisor
    INTO offer_record
    FROM investment_offers io
    LEFT JOIN users inv ON io.investor_email = inv.email
    LEFT JOIN startups s ON io.startup_id = s.id
    WHERE io.id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer with ID % not found', p_offer_id;
    END IF;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        new_stage := 4; -- Final approval
        new_status := 'approved'; -- Use valid enum value (offer_status enum only has: 'pending', 'approved', 'rejected')
        
        -- Check if contact details should be revealed
        -- Reveal if neither party has an advisor (both went through without advisors)
        should_reveal_contacts := NOT offer_record.investor_has_advisor AND NOT offer_record.startup_has_advisor;
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected';
    END IF;
    
    -- Update the offer
    UPDATE investment_offers 
    SET 
        stage = new_stage,
        status = new_status::offer_status,  -- Explicitly cast TEXT to enum type
        contact_details_revealed = CASE 
            WHEN should_reveal_contacts THEN TRUE 
            ELSE contact_details_revealed 
        END,
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
        'contacts_revealed', should_reveal_contacts,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_offer(INTEGER, TEXT) TO authenticated;

-- 6. Fix existing offers with incorrect status values
UPDATE investment_offers 
SET 
    investor_advisor_approval_status = CASE 
        WHEN investor_advisor_approval_status = 'approve' THEN 'approved'
        WHEN investor_advisor_approval_status = 'reject' THEN 'rejected'
        ELSE investor_advisor_approval_status
    END,
    startup_advisor_approval_status = CASE 
        WHEN startup_advisor_approval_status = 'approve' THEN 'approved'
        WHEN startup_advisor_approval_status = 'reject' THEN 'rejected'
        ELSE startup_advisor_approval_status
    END
WHERE 
    investor_advisor_approval_status IN ('approve', 'reject')
    OR startup_advisor_approval_status IN ('approve', 'reject');

-- 7. Fix existing offers with invalid status values
-- We need to handle invalid enum values by casting to text first, then updating to valid enum
-- This uses a temporary column approach to safely update invalid enum values
DO $$
DECLARE
    invalid_count INTEGER;
    valid_count INTEGER;
BEGIN
    -- First, check if there are offers with potentially invalid status values
    -- We'll use a subquery to safely check text representation
    SELECT COUNT(*) INTO invalid_count
    FROM investment_offers
    WHERE status::text NOT IN ('pending', 'approved', 'rejected');
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % offers with potentially invalid status values', invalid_count;
        RAISE NOTICE 'Attempting to fix by casting to text and updating to valid enum values...';
        
        -- Try to fix invalid status values by casting to text, checking, then updating
        -- This approach uses a CASE statement to safely convert invalid values
        -- Note: offer_status enum only has: 'pending', 'approved', 'rejected'
        UPDATE investment_offers
        SET status = CASE 
            WHEN status::text IN ('pending_startup_advisor_approval', 'pending_startup_review', 'pending_investor_advisor_approval') THEN 'pending'::offer_status
            WHEN status::text IN ('investor_advisor_approved', 'startup_advisor_approved', 'accepted', 'completed') THEN 'approved'::offer_status
            WHEN status::text IN ('investor_advisor_rejected', 'startup_advisor_rejected') THEN 'rejected'::offer_status
            ELSE status  -- Keep valid enum values as-is
        END
        WHERE status::text NOT IN ('pending', 'approved', 'rejected');
        
        GET DIAGNOSTICS valid_count = ROW_COUNT;
        RAISE NOTICE 'Fixed % offers with invalid status values', valid_count;
    ELSE
        RAISE NOTICE 'No offers with invalid status values found';
    END IF;
END $$;

-- Ensure offers at stage < 3 have pending status (if they're not already approved/rejected)
UPDATE investment_offers 
SET status = 'pending'
WHERE stage < 3 
  AND status NOT IN ('approved', 'rejected')
  AND status::text IN ('pending', 'approved', 'rejected');  -- Only update valid enum values

-- 8. Ensure all offers have proper stage values
UPDATE investment_offers 
SET stage = 1 
WHERE stage IS NULL;

-- Verify the fix
SELECT 
    'Approval functions fixed' as status,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN stage IS NOT NULL THEN 1 END) as offers_with_stage,
    COUNT(CASE WHEN investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected') THEN 1 END) as valid_investor_status,
    COUNT(CASE WHEN startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected') THEN 1 END) as valid_startup_status,
    COUNT(CASE WHEN status IN ('pending', 'approved', 'rejected') THEN 1 END) as valid_status
FROM investment_offers;

