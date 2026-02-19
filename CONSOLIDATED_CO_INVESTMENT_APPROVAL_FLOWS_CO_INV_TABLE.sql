-- Consolidated Co-Investment Approval Flows - co_investment_offers Table Only
-- These functions handle approval workflow for consolidated co-investment offers stored in co_investment_offers table
-- investment_offers table is NOT modified

-- Step 1: Create improved investor advisor approval function for consolidated offers
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_offer_lead_investor(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_new_status TEXT;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details from co_investment_offers table
    SELECT * INTO v_offer
    FROM public.co_investment_offers
    WHERE id = p_offer_id AND is_consolidated = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consolidated co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check current status
    IF v_offer.status NOT IN ('pending_lead_investor_approval') THEN
        RAISE EXCEPTION 'Offer is not pending lead investor approval. Current status: %', v_offer.status;
    END IF;
    
    -- Determine new status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'pending_startup_approval';
    ELSE
        v_new_status := 'lead_investor_rejected';
    END IF;
    
    -- Update offer
    UPDATE public.co_investment_offers
    SET 
        lead_investor_approval_status = p_approval_action,
        lead_investor_approval_at = NOW(),
        status = v_new_status,
        stage = CASE WHEN p_approval_action = 'approve' THEN 3 ELSE 2 END,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'new_status', v_new_status,
        'message', CASE 
            WHEN p_approval_action = 'approve' THEN 'Offer approved by lead investor. Moving to startup approval.'
            ELSE 'Offer rejected by lead investor.'
        END,
        'offer_context', json_build_object(
            'co_investor_name', v_offer.investor_name,
            'co_investor_email', v_offer.investor_email,
            'co_investor_amount', v_offer.offer_amount,
            'co_investor_equity', v_offer.equity_percentage,
            'startup_name', (SELECT name FROM public.startups WHERE id = v_offer.startup_id),
            'investment_summary', json_build_object(
                'lead_investor_amount', v_offer.lead_investor_amount,
                'total_needed', v_offer.total_co_investment_needed,
                'this_investor_amount', v_offer.offer_amount,
                'remaining_available', v_offer.remaining_co_investment_amount
            )
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_offer_lead_investor(INTEGER, TEXT) TO authenticated;

-- Step 2: Create startup approval function for consolidated offers
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_offer_startup(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_new_status TEXT;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details from co_investment_offers table
    SELECT * INTO v_offer
    FROM public.co_investment_offers
    WHERE id = p_offer_id AND is_consolidated = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consolidated co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check current status
    IF v_offer.status NOT IN ('pending_startup_approval') THEN
        RAISE EXCEPTION 'Offer is not pending startup approval. Current status: %', v_offer.status;
    END IF;
    
    -- Determine new status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'approved';
    ELSE
        v_new_status := 'rejected';
    END IF;
    
    -- Update offer
    UPDATE public.co_investment_offers
    SET 
        startup_approval_status = p_approval_action,
        startup_approval_at = NOW(),
        status = v_new_status,
        stage = 4, -- Final stage
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'new_status', v_new_status,
        'message', CASE 
            WHEN p_approval_action = 'approve' 
                THEN 'Co-investment offer ACCEPTED! The co-investor has been successfully added to the round.'
            ELSE 'Co-investment offer REJECTED. Co-investor application has been declined.'
        END,
        'offer_summary', json_build_object(
            'co_investor_name', v_offer.investor_name,
            'co_investor_email', v_offer.investor_email,
            'co_investor_amount', v_offer.offer_amount,
            'co_investor_equity', v_offer.equity_percentage,
            'lead_investor_name', v_offer.lead_investor_name,
            'total_investment', (v_offer.lead_investor_amount + v_offer.offer_amount),
            'startup_name', (SELECT name FROM public.startups WHERE id = v_offer.startup_id)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_offer_startup(INTEGER, TEXT) TO authenticated;

-- Summary of Consolidated Approval Flow
-- ======================================
-- 1. Co-investor applies with single consolidated offer in co_investment_offers table
-- 2. Investor Advisor (if exists): Reviews single offer with all context
-- 3. Lead Investor: Reviews & approves the co-investor
-- 4. Startup Founder: Makes final decision - ACCEPT or REJECT
--
-- All operations are on co_investment_offers table ONLY
-- investment_offers table remains completely unchanged
-- is_consolidated flag = TRUE for new consolidated offers
