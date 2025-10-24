-- Complete approval system setup
-- This script adds missing columns and creates approval functions

-- 1. Add missing approval columns to investment_offers table
ALTER TABLE investment_offers 
ADD COLUMN IF NOT EXISTS investor_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS investor_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS startup_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1 CHECK (stage >= 1 AND stage <= 4);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investment_offers_investor_advisor_status 
ON investment_offers(investor_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_investment_offers_startup_advisor_status 
ON investment_offers(startup_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_investment_offers_stage 
ON investment_offers(stage);

-- 3. Update existing records to have proper default values
UPDATE investment_offers 
SET 
    investor_advisor_approval_status = 'not_required',
    startup_advisor_approval_status = 'not_required',
    stage = 1
WHERE 
    investor_advisor_approval_status IS NULL 
    OR startup_advisor_approval_status IS NULL 
    OR stage IS NULL;

-- 4. Drop existing functions if they exist
DROP FUNCTION IF EXISTS approve_investor_advisor_offer(INTEGER, TEXT);
DROP FUNCTION IF EXISTS approve_startup_advisor_offer(INTEGER, TEXT);

-- 5. Create function to approve/reject offers by investor advisor
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

-- 6. Create function to approve/reject offers by startup advisor
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

-- 7. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;
