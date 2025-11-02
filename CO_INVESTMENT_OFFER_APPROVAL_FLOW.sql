-- Co-Investment Offer Approval Flow
-- This script adds support for the new co-investment offer approval flow:
-- 1. Investor Advisor (if investor has advisor)
-- 2. Lead Investor (who created the co-investment opportunity)
-- 3. Startup

-- Step 1: Add columns to investment_offers table for co-investment offer tracking
ALTER TABLE public.investment_offers 
ADD COLUMN IF NOT EXISTS co_investment_opportunity_id INTEGER REFERENCES public.co_investment_opportunities(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lead_investor_approval_status TEXT DEFAULT 'not_required' CHECK (lead_investor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS lead_investor_approval_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create function to get lead investor ID from co-investment opportunity
CREATE OR REPLACE FUNCTION public.get_lead_investor_from_co_investment(
    p_co_investment_opportunity_id INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead_investor_id UUID;
BEGIN
    SELECT listed_by_user_id INTO v_lead_investor_id
    FROM public.co_investment_opportunities
    WHERE id = p_co_investment_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_co_investment_opportunity_id;
    END IF;
    
    RETURN v_lead_investor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_investor_from_co_investment(INTEGER) TO authenticated;

-- Step 3: Create function to approve co-investment offer by investor advisor
CREATE OR REPLACE FUNCTION public.approve_co_investment_offer_investor_advisor(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offer_record RECORD;
    investor_has_advisor BOOLEAN;
    new_status TEXT;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record 
    FROM public.investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check if this is a co-investment offer
    IF offer_record.co_investment_opportunity_id IS NULL THEN
        RAISE EXCEPTION 'This is not a co-investment offer';
    END IF;
    
    -- Check current status
    IF offer_record.status != 'pending_investor_advisor_approval' THEN
        RAISE EXCEPTION 'Offer is not in pending investor advisor approval status';
    END IF;
    
    -- Update approval status
    IF p_approval_action = 'approve' THEN
        -- Move to lead investor approval
        new_status := 'pending_lead_investor_approval';
    ELSE
        -- Reject the offer
        new_status := 'investor_advisor_rejected';
    END IF;
    
    UPDATE public.investment_offers 
    SET 
        investor_advisor_approval_status = p_approval_action,
        investor_advisor_approval_at = NOW(),
        status = new_status,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN json_build_object(
        'success', true,
        'new_status', new_status,
        'message', 'Investor advisor approval processed'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_co_investment_offer_investor_advisor(INTEGER, TEXT) TO authenticated;

-- Step 4: Create function to approve co-investment offer by lead investor
CREATE OR REPLACE FUNCTION public.approve_co_investment_offer_lead_investor(
    p_offer_id INTEGER,
    p_lead_investor_id UUID,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offer_record RECORD;
    co_investment_record RECORD;
    new_status TEXT;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record 
    FROM public.investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check if this is a co-investment offer
    IF offer_record.co_investment_opportunity_id IS NULL THEN
        RAISE EXCEPTION 'This is not a co-investment offer';
    END IF;
    
    -- Get co-investment opportunity details
    SELECT * INTO co_investment_record
    FROM public.co_investment_opportunities
    WHERE id = offer_record.co_investment_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity not found';
    END IF;
    
    -- Verify the caller is the lead investor
    IF co_investment_record.listed_by_user_id != p_lead_investor_id THEN
        RAISE EXCEPTION 'Only the lead investor can approve this co-investment offer';
    END IF;
    
    -- Check current status
    IF offer_record.status != 'pending_lead_investor_approval' THEN
        RAISE EXCEPTION 'Offer is not in pending lead investor approval status';
    END IF;
    
    -- Update approval status
    IF p_approval_action = 'approve' THEN
        -- Move to startup approval
        new_status := 'pending_startup_approval';
    ELSE
        -- Reject the offer
        new_status := 'lead_investor_rejected';
    END IF;
    
    UPDATE public.investment_offers 
    SET 
        lead_investor_approval_status = p_approval_action,
        lead_investor_approval_at = NOW(),
        status = new_status,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN json_build_object(
        'success', true,
        'new_status', new_status,
        'message', 'Lead investor approval processed'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_co_investment_offer_lead_investor(INTEGER, UUID, TEXT) TO authenticated;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_investment_offers_co_investment_opportunity_id 
ON public.investment_offers(co_investment_opportunity_id);

CREATE INDEX IF NOT EXISTS idx_investment_offers_lead_investor_status 
ON public.investment_offers(lead_investor_approval_status) 
WHERE co_investment_opportunity_id IS NOT NULL;

