-- Updated Approval Flows for Consolidated Co-Investment Offers
-- These functions work with the new single combined offer structure

-- Step 1: Create improved investor advisor approval function for combined offers
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_investor_advisor(
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
    v_new_stage INTEGER;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details (from investment_offers table, not co_investment_offers)
    SELECT * INTO v_offer
    FROM public.investment_offers
    WHERE id = p_offer_id 
    AND is_co_investment = true
    AND co_investment_opportunity_id IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Combined co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check current status
    IF v_offer.status NOT IN ('pending_investor_advisor_approval') THEN
        RAISE EXCEPTION 'Offer is not pending investor advisor approval. Current status: %', v_offer.status;
    END IF;
    
    -- Determine new status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'pending_lead_investor_approval';
        v_new_stage := 2; -- Move to stage 2 (lead investor approval)
    ELSE
        v_new_status := 'investor_advisor_rejected';
        v_new_stage := v_offer.stage; -- Stay at current stage
    END IF;
    
    -- Update offer
    UPDATE public.investment_offers
    SET 
        investor_advisor_approval_status = p_approval_action,
        investor_advisor_approval_at = NOW(),
        status = v_new_status,
        stage = v_new_stage,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success with offer context
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'new_status', v_new_status,
        'new_stage', v_new_stage,
        'message', CASE 
            WHEN p_approval_action = 'approve' 
                THEN 'Offer approved by investor advisor. Now pending lead investor approval.'
            ELSE 'Offer rejected by investor advisor. Co-investor application declined.'
        END,
        'offer_context', json_build_object(
            'co_investor_name', v_offer.investor_name,
            'co_investor_email', v_offer.investor_email,
            'co_investor_amount', v_offer.offer_amount,
            'co_investor_equity', v_offer.equity_percentage,
            'lead_investor_name', v_offer.lead_investor_name,
            'lead_investor_amount', v_offer.lead_investor_amount,
            'remaining_available', v_offer.remaining_co_investment_amount,
            'total_needed', v_offer.total_co_investment_needed
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_investor_advisor(INTEGER, TEXT) TO authenticated;

-- Step 2: Create improved lead investor approval function for combined offers
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_lead_investor(
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
    v_new_stage INTEGER;
    v_lead_investor_id UUID;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO v_offer
    FROM public.investment_offers
    WHERE id = p_offer_id 
    AND is_co_investment = true
    AND co_investment_opportunity_id IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Combined co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check current status
    IF v_offer.status NOT IN ('pending_lead_investor_approval') THEN
        RAISE EXCEPTION 'Offer is not pending lead investor approval. Current status: %', v_offer.status;
    END IF;
    
    -- Check if startup has advisor
    DECLARE
        v_startup_has_advisor BOOLEAN;
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM public.startups 
            WHERE id = v_offer.startup_id 
            AND investment_advisor_code IS NOT NULL
        ) INTO v_startup_has_advisor;
    END;
    
    -- Determine new status and stage based on action and startup advisor existence
    IF p_approval_action = 'approve' THEN
        IF v_startup_has_advisor THEN
            v_new_status := 'pending_startup_advisor_approval';
            v_new_stage := 3; -- Move to stage 3 (startup advisor approval)
        ELSE
            v_new_status := 'pending_startup_approval';
            v_new_stage := 4; -- Move to stage 4 (startup founder approval)
        END IF;
    ELSE
        v_new_status := 'lead_investor_rejected';
        v_new_stage := v_offer.stage; -- Stay at current stage
    END IF;
    
    -- Update offer
    UPDATE public.investment_offers
    SET 
        lead_investor_approval_status = p_approval_action,
        lead_investor_approval_at = NOW(),
        status = v_new_status,
        stage = v_new_stage,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success with offer context
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'new_status', v_new_status,
        'new_stage', v_new_stage,
        'message', CASE 
            WHEN p_approval_action = 'approve' 
                THEN CASE 
                    WHEN v_startup_has_advisor 
                        THEN 'Offer approved by lead investor. Now pending startup advisor approval.'
                    ELSE 'Offer approved by lead investor. Now pending startup founder approval.'
                END
            ELSE 'Offer rejected by lead investor. Co-investor application declined.'
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

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_lead_investor(INTEGER, TEXT) TO authenticated;

-- Step 3: Create startup advisor approval function for combined offers
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_startup_advisor(
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
    v_new_stage INTEGER;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO v_offer
    FROM public.investment_offers
    WHERE id = p_offer_id 
    AND is_co_investment = true
    AND co_investment_opportunity_id IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Combined co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check current status
    IF v_offer.status NOT IN ('pending_startup_advisor_approval') THEN
        RAISE EXCEPTION 'Offer is not pending startup advisor approval. Current status: %', v_offer.status;
    END IF;
    
    -- Determine new status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'pending_startup_approval';
        v_new_stage := 4; -- Move to stage 4 (startup founder approval)
    ELSE
        v_new_status := 'startup_advisor_rejected';
        v_new_stage := v_offer.stage; -- Stay at current stage
    END IF;
    
    -- Update offer
    UPDATE public.investment_offers
    SET 
        startup_advisor_approval_status = p_approval_action,
        startup_advisor_approval_at = NOW(),
        status = v_new_status,
        stage = v_new_stage,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success with offer context
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'new_status', v_new_status,
        'new_stage', v_new_stage,
        'message', CASE 
            WHEN p_approval_action = 'approve' 
                THEN 'Offer approved by startup advisor. Now pending startup founder approval.'
            ELSE 'Offer rejected by startup advisor. Co-investor application declined.'
        END,
        'offer_context', json_build_object(
            'co_investor_name', v_offer.investor_name,
            'co_investor_amount', v_offer.offer_amount,
            'lead_investor_name', v_offer.lead_investor_name,
            'lead_investor_amount', v_offer.lead_investor_amount,
            'total_investment', (v_offer.lead_investor_amount + v_offer.offer_amount)
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_startup_advisor(INTEGER, TEXT) TO authenticated;

-- Step 4: Create startup founder approval function for combined offers
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_startup(
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
    
    -- Get offer details
    SELECT * INTO v_offer
    FROM public.investment_offers
    WHERE id = p_offer_id 
    AND is_co_investment = true
    AND co_investment_opportunity_id IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Combined co-investment offer with ID % not found', p_offer_id;
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
    UPDATE public.investment_offers
    SET 
        status = v_new_status,
        stage = 4, -- Final stage
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    -- Return success with offer context
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

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_startup(INTEGER, TEXT) TO authenticated;

-- Step 5: Create helper function to get consolidated offer display details
CREATE OR REPLACE FUNCTION public.get_consolidated_co_investment_display(
    p_offer_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_startup_name TEXT;
BEGIN
    -- Get offer details
    SELECT * INTO v_offer
    FROM public.investment_offers
    WHERE id = p_offer_id 
    AND is_co_investment = true
    AND co_investment_opportunity_id IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Combined co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Get startup name
    SELECT name INTO v_startup_name FROM public.startups WHERE id = v_offer.startup_id;
    
    -- Return structured display data for UI
    RETURN json_build_object(
        'offer_id', v_offer.id,
        'startup_name', v_startup_name,
        'status', v_offer.status,
        'stage', v_offer.stage,
        
        -- Co-investor details
        'co_investor', json_build_object(
            'name', v_offer.investor_name,
            'email', v_offer.investor_email,
            'amount', v_offer.offer_amount,
            'equity_percentage', v_offer.equity_percentage,
            'currency', v_offer.currency
        ),
        
        -- Lead investor context (shown to all stakeholders)
        'lead_investor', json_build_object(
            'name', v_offer.lead_investor_name,
            'email', v_offer.lead_investor_email,
            'amount', v_offer.lead_investor_amount,
            'user_id', v_offer.lead_investor_id
        ),
        
        -- Co-investment round summary
        'round_summary', json_build_object(
            'total_round_size', v_offer.total_co_investment_needed,
            'lead_investor_commitment', v_offer.lead_investor_amount,
            'this_co_investor_commitment', v_offer.offer_amount,
            'total_committed_so_far', (v_offer.lead_investor_amount + v_offer.offer_amount),
            'remaining_open_for_others', v_offer.remaining_co_investment_amount,
            'minimum_per_investor', v_offer.minimum_co_investment_amount,
            'maximum_per_investor', v_offer.maximum_co_investment_amount
        ),
        
        -- Approval chain
        'approval_chain', json_build_object(
            'stage_1_investor_advisor', json_build_object(
                'status', v_offer.investor_advisor_approval_status,
                'timestamp', v_offer.investor_advisor_approval_at,
                'description', 'Investor Advisor Review'
            ),
            'stage_2_lead_investor', json_build_object(
                'status', v_offer.lead_investor_approval_status,
                'timestamp', v_offer.lead_investor_approval_at,
                'description', 'Lead Investor Approval'
            ),
            'stage_3_startup_advisor', json_build_object(
                'status', v_offer.startup_advisor_approval_status,
                'timestamp', v_offer.startup_advisor_approval_at,
                'description', 'Startup Advisor Review'
            ),
            'stage_4_startup_founder', json_build_object(
                'status', v_offer.status,
                'description', 'Founder Final Decision'
            )
        ),
        
        -- Display text for UI
        'display_title', CONCAT(
            'Co-Investment Round - ',
            v_offer.investor_name,
            ' joining lead by ',
            v_offer.lead_investor_name
        ),
        'display_subtitle', CONCAT(
            v_offer.currency,
            ' ',
            TO_CHAR(v_offer.lead_investor_amount, 'FM999,999,999.99'),
            ' (Lead) + ',
            v_offer.currency,
            ' ',
            TO_CHAR(v_offer.offer_amount, 'FM999,999,999.99'),
            ' (This Investor) = ',
            v_offer.currency,
            ' ',
            TO_CHAR((v_offer.lead_investor_amount + v_offer.offer_amount), 'FM999,999,999.99')
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_consolidated_co_investment_display(INTEGER) TO authenticated;

-- Summary of consolidated approval flow:
-- =====================================
-- 1. Co-investor applies with single combined offer
-- 2. Investor Advisor (if exists): Reviews single offer with all context
-- 3. Lead Investor: Reviews & approves the co-investor
-- 4. Startup Advisor (if exists): Reviews investment fit with lead investor context
-- 5. Startup Founder: Makes final decision - ACCEPT or REJECT
--
-- All stakeholders see the same consolidated offer with:
-- - Co-investor amount + lead investor amount
-- - Remaining available for other co-investors
-- - Full investment round context
-- - No duplicate approvals or offers
