-- Consolidate Co-Investment: Single Combined Offer in co_investment_offers Table
-- This script modifies the co_investment_offers table ONLY
-- investment_offers table remains completely unchanged
-- All co-investment consolidation happens in co_investment_offers table

-- Step 1: Add new columns to co_investment_offers table for consolidation
ALTER TABLE public.co_investment_offers
ADD COLUMN IF NOT EXISTS lead_investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lead_investor_name TEXT,
ADD COLUMN IF NOT EXISTS lead_investor_email TEXT,
ADD COLUMN IF NOT EXISTS lead_investor_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_co_investment_needed DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS minimum_co_investment_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS maximum_co_investment_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS remaining_co_investment_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS co_investor_advisor_approval_status TEXT DEFAULT 'pending' CHECK (co_investor_advisor_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS co_investor_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_advisor_approval_status TEXT DEFAULT 'pending' CHECK (startup_advisor_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS startup_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_approval_status TEXT DEFAULT 'pending' CHECK (startup_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS startup_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1 CHECK (stage >= 1 AND stage <= 3),
ADD COLUMN IF NOT EXISTS is_consolidated BOOLEAN DEFAULT FALSE;

-- Step 2: Add comments explaining new fields
COMMENT ON COLUMN public.co_investment_offers.lead_investor_id IS 'ID of the lead investor who created the opportunity';
COMMENT ON COLUMN public.co_investment_offers.lead_investor_name IS 'Name of lead investor (denormalized for display)';
COMMENT ON COLUMN public.co_investment_offers.lead_investor_email IS 'Email of lead investor (denormalized for display)';
COMMENT ON COLUMN public.co_investment_offers.lead_investor_amount IS 'Amount committed by lead investor';
COMMENT ON COLUMN public.co_investment_offers.total_co_investment_needed IS 'Total investment amount for the opportunity';
COMMENT ON COLUMN public.co_investment_offers.minimum_co_investment_amount IS 'Minimum amount this co-investor must commit';
COMMENT ON COLUMN public.co_investment_offers.maximum_co_investment_amount IS 'Maximum amount this co-investor can commit';
COMMENT ON COLUMN public.co_investment_offers.remaining_co_investment_amount IS 'Amount remaining for other co-investors';
COMMENT ON COLUMN public.co_investment_offers.co_investor_advisor_approval_status IS 'Co-investor advisor approval status (Stage 1)';
COMMENT ON COLUMN public.co_investment_offers.startup_advisor_approval_status IS 'Startup advisor approval status (Stage 2)';
COMMENT ON COLUMN public.co_investment_offers.startup_approval_status IS 'Startup founder approval status (Stage 3)';
COMMENT ON COLUMN public.co_investment_offers.stage IS 'Approval stage (1-3: Co-investor Advisor → Startup Advisor → Startup Founder)';
COMMENT ON COLUMN public.co_investment_offers.is_consolidated IS 'Flag indicating this is a consolidated co-investment offer';

-- Step 3: Create function to create consolidated co-investment offer in co_investment_offers table
-- This creates ONE offer in co_investment_offers table with all co-investment details
CREATE OR REPLACE FUNCTION public.create_consolidated_co_investment_offer(
    p_investor_id UUID,
    p_investor_email TEXT,
    p_investor_name TEXT,
    p_startup_id INTEGER,
    p_co_investment_opportunity_id INTEGER,
    p_offer_amount DECIMAL(15,2),
    p_equity_percentage DECIMAL(5,2),
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_opportunity RECORD;
    v_lead_investor RECORD;
    v_startup_name TEXT;
    v_effective_startup_id INTEGER;
    v_offer_id INTEGER;
    v_remaining_amount DECIMAL(15,2);
    v_new_offer RECORD;
BEGIN
    -- Get co-investment opportunity details
    SELECT * INTO v_opportunity
    FROM public.co_investment_opportunities
    WHERE id = p_co_investment_opportunity_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_co_investment_opportunity_id;
    END IF;
    
    -- Resolve startup details for NOT NULL startup_name insert requirement
    v_effective_startup_id := COALESCE(p_startup_id, v_opportunity.startup_id);

    IF v_effective_startup_id IS NULL THEN
        RAISE EXCEPTION 'Startup ID is required for consolidated co-investment offer';
    END IF;

    SELECT s.name INTO v_startup_name
    FROM public.startups s
    WHERE s.id = v_effective_startup_id
    LIMIT 1;

    IF v_startup_name IS NULL THEN
        RAISE EXCEPTION 'Startup name not found for startup ID %', v_effective_startup_id;
    END IF;

    -- Validate offer amount is within min/max
    IF p_offer_amount < v_opportunity.minimum_co_investment THEN
        RAISE EXCEPTION 'Offer amount % is below minimum co-investment amount %', 
            p_offer_amount, v_opportunity.minimum_co_investment;
    END IF;
    
    IF p_offer_amount > v_opportunity.maximum_co_investment THEN
        RAISE EXCEPTION 'Offer amount % exceeds maximum co-investment amount %', 
            p_offer_amount, v_opportunity.maximum_co_investment;
    END IF;
    
    -- Get lead investor details (from latest profile)
    SELECT up.auth_user_id AS id, up.email, up.name INTO v_lead_investor
    FROM public.user_profiles up
    WHERE up.auth_user_id = v_opportunity.listed_by_user_id
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead investor user record not found';
    END IF;
    
    -- Calculate remaining amount available for other co-investors
    v_remaining_amount := v_opportunity.maximum_co_investment - p_offer_amount;
    
    -- Create SINGLE consolidated co-investment offer in co_investment_offers table
    INSERT INTO public.co_investment_offers (
        investor_id,
        investor_email,
        investor_name,
        startup_name,
        startup_id,
        co_investment_opportunity_id,
        offer_amount,
        equity_percentage,
        currency,
        status,
        stage,
        is_consolidated,
        -- Lead investor fields
        lead_investor_id,
        lead_investor_name,
        lead_investor_email,
        lead_investor_amount,
        total_co_investment_needed,
        minimum_co_investment_amount,
        maximum_co_investment_amount,
        remaining_co_investment_amount,
        -- Approval fields (3-stage flow)
        co_investor_advisor_approval_status,
        startup_advisor_approval_status,
        startup_approval_status,
        created_at,
        updated_at
    ) VALUES (
        p_investor_id,
        p_investor_email,
        p_investor_name,
        v_startup_name,
        v_effective_startup_id,
        p_co_investment_opportunity_id,
        p_offer_amount,
        p_equity_percentage,
        p_currency,
        'pending', -- Initial status
        1, -- Start at stage 1
        TRUE, -- Mark as consolidated
        -- Lead investor info
        v_lead_investor.id,
        v_lead_investor.name,
        v_lead_investor.email,
        v_opportunity.investment_amount,
        v_opportunity.investment_amount,
        v_opportunity.minimum_co_investment,
        v_opportunity.maximum_co_investment,
        v_remaining_amount,
        -- Approval statuses (3-stage: co-investor → startup advisor → startup founder)
        'pending',
        'pending',
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_offer_id;
    
    -- Fetch complete offer record to return
    SELECT * INTO v_new_offer FROM public.co_investment_offers WHERE id = v_offer_id;
    
    -- Return success with offer details
    RETURN json_build_object(
        'success', true,
        'offer_id', v_offer_id,
        'message', 'Consolidated co-investment offer created successfully',
        'offer', row_to_json(v_new_offer),
        'approval_flow', json_build_object(
            'stage_1', 'Co-investor Investment Advisor Approval',
            'stage_2', 'Startup Investment Advisor Approval',
            'stage_3', 'Startup Founder Final Approval'
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_consolidated_co_investment_offer(UUID, TEXT, TEXT, INTEGER, INTEGER, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- Step 4: Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_co_investment_offers_consolidated 
ON public.co_investment_offers(is_consolidated);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_lead_investor_id 
ON public.co_investment_offers(lead_investor_id);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_co_investor_advisor_status 
ON public.co_investment_offers(co_investor_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_startup_advisor_status 
ON public.co_investment_offers(startup_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_stage 
ON public.co_investment_offers(stage);

-- Step 5: Update existing co-investment offers with lead investor details (if any exist)
-- This ensures all existing offers get the consolidated fields populated
UPDATE public.co_investment_offers cio
SET 
    is_consolidated = TRUE,
    lead_investor_id = cio_opp.listed_by_user_id,
    lead_investor_amount = cio_opp.investment_amount,
    total_co_investment_needed = cio_opp.investment_amount,
    minimum_co_investment_amount = cio_opp.minimum_co_investment,
    maximum_co_investment_amount = cio_opp.maximum_co_investment,
    remaining_co_investment_amount = cio_opp.maximum_co_investment - cio.offer_amount,
    co_investor_advisor_approval_status = 'pending',
    startup_advisor_approval_status = 'pending',
    startup_approval_status = 'pending',
    stage = CASE WHEN cio.stage IS NULL THEN 1 ELSE cio.stage END
FROM public.co_investment_opportunities cio_opp
WHERE cio.co_investment_opportunity_id = cio_opp.id
AND cio.is_consolidated = FALSE;

-- Step 6: Populate lead investor name and email from user_profiles table for existing offers
UPDATE public.co_investment_offers cio
SET 
    lead_investor_name = up_latest.name,
    lead_investor_email = up_latest.email
FROM (
    SELECT DISTINCT ON (up.auth_user_id)
        up.auth_user_id,
        up.name,
        up.email
    FROM public.user_profiles up
    ORDER BY up.auth_user_id, up.created_at DESC
) up_latest
WHERE up_latest.auth_user_id = cio.lead_investor_id
    AND cio.is_consolidated = TRUE
    AND cio.lead_investor_name IS NULL;

-- Step 7: Create view for investor advisor to see consolidated co-investment offers
CREATE OR REPLACE VIEW public.investor_advisor_consolidated_co_investment_offers AS
SELECT 
    cio.id,
    cio.investor_id,
    cio.investor_email,
    cio.investor_name,
    cio.startup_id,
    s.name AS startup_name,
    cio.offer_amount,
    cio.equity_percentage,
    cio.currency,
    cio.status,
    cio.stage,
    cio.co_investor_advisor_approval_status,
    -- Co-investment context
    cio.co_investment_opportunity_id,
    cio.lead_investor_id,
    cio.lead_investor_name,
    cio.lead_investor_email,
    cio.lead_investor_amount,
    cio.total_co_investment_needed,
    cio.offer_amount AS this_investor_amount,
    cio.remaining_co_investment_amount AS remaining_for_others,
    cio.minimum_co_investment_amount,
    cio.maximum_co_investment_amount,
    cio.created_at,
    cio.updated_at
FROM public.co_investment_offers cio
JOIN public.startups s ON cio.startup_id = s.id
WHERE cio.is_consolidated = TRUE;

-- Step 8: Create view for startup to see consolidated co-investment offers with lead investor context
CREATE OR REPLACE VIEW public.startup_consolidated_co_investment_offers AS
SELECT 
    cio.id,
    cio.investor_id,
    cio.investor_email,
    cio.investor_name,
    cio.startup_id,
    s.name AS startup_name,
    cio.offer_amount AS co_investor_amount,
    cio.equity_percentage AS co_investor_equity,
    cio.currency,
    cio.status,
    cio.stage,
    -- Lead investor context
    cio.lead_investor_id,
    cio.lead_investor_name,
    cio.lead_investor_email,
    cio.lead_investor_amount,
    cio.total_co_investment_needed,
    -- Combined investment view
    (cio.lead_investor_amount + cio.offer_amount) AS total_committed_so_far,
    cio.offer_amount AS new_co_investor_amount,
    cio.remaining_co_investment_amount AS still_available,
    cio.created_at,
    cio.updated_at,
    -- Display as: "Co-Investment Round - Lead: [Name] ($X), This Investor: ($Y), Remaining: ($Z)"
    CONCAT(
        'Co-Investment Round - Lead: ',
        COALESCE(cio.lead_investor_name, 'Unknown'),
        ' (',
        cio.currency,
        ' ',
        TO_CHAR(cio.lead_investor_amount, 'FM999,999,999.99'),
        '), This Investor: ',
        cio.currency,
        ' ',
        TO_CHAR(cio.offer_amount, 'FM999,999,999.99'),
        ', Remaining Available: ',
        cio.currency,
        ' ',
        TO_CHAR(cio.remaining_co_investment_amount, 'FM999,999,999.99')
    ) AS display_summary
FROM public.co_investment_offers cio
JOIN public.startups s ON cio.startup_id = s.id
WHERE cio.is_consolidated = TRUE;

-- Grant permissions
GRANT SELECT ON public.investor_advisor_consolidated_co_investment_offers TO authenticated;
GRANT SELECT ON public.startup_consolidated_co_investment_offers TO authenticated;

-- Step 9: Create approval function for co-investor advisor (Stage 1)
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_offer_co_investor_advisor(
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
    
    -- Check current status (should be pending at stage 1)
    IF v_offer.stage != 1 OR v_offer.status::TEXT != 'pending' THEN
        RAISE EXCEPTION 'Offer is not waiting for co-investor advisor approval. Current stage: %, status: %', v_offer.stage, v_offer.status;
    END IF;
    
    -- Determine new status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'pending_startup_advisor_approval';
    ELSE
        v_new_status := 'rejected';
    END IF;
    
    -- Update offer
    UPDATE public.co_investment_offers
    SET 
        co_investor_advisor_approval_status = CASE 
            WHEN p_approval_action = 'approve' THEN 'approved'
            WHEN p_approval_action = 'reject' THEN 'rejected'
        END,
        co_investor_advisor_approval_at = NOW(),
        status = v_new_status::offer_status,
        stage = CASE WHEN p_approval_action = 'approve' THEN 2 ELSE 1 END,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'stage', CASE WHEN p_approval_action = 'approve' THEN 2 ELSE 1 END,
        'new_status', v_new_status,
        'message', CASE 
            WHEN p_approval_action = 'approve' THEN 'Offer approved by co-investor advisor. Moving to startup advisor review.'
            ELSE 'Offer rejected by co-investor advisor.'
        END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_offer_co_investor_advisor(INTEGER, TEXT) TO authenticated;

-- Step 10: Create function to show offer approval context for startup
CREATE OR REPLACE FUNCTION public.get_consolidated_co_investment_offer_summary(
    p_offer_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
BEGIN
    SELECT * INTO v_offer
    FROM public.co_investment_offers
    WHERE id = p_offer_id AND is_consolidated = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consolidated co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    RETURN json_build_object(
        'offer_id', v_offer.id,
        'co_investor', json_build_object(
            'name', v_offer.investor_name,
            'email', v_offer.investor_email,
            'amount', v_offer.offer_amount,
            'equity_percentage', v_offer.equity_percentage,
            'currency', v_offer.currency
        ),
        'lead_investor', json_build_object(
            'name', v_offer.lead_investor_name,
            'email', v_offer.lead_investor_email,
            'amount', v_offer.lead_investor_amount,
            'user_id', v_offer.lead_investor_id
        ),
        'co_investment_summary', json_build_object(
            'total_needed', v_offer.total_co_investment_needed,
            'lead_investor_commitment', v_offer.lead_investor_amount,
            'this_co_investor_commitment', v_offer.offer_amount,
            'total_so_far', (v_offer.lead_investor_amount + v_offer.offer_amount),
            'remaining_available', v_offer.remaining_co_investment_amount,
            'minimum_per_investor', v_offer.minimum_co_investment_amount,
            'maximum_per_investor', v_offer.maximum_co_investment_amount
        ),
        'approval_status', json_build_object(
            'current_stage', v_offer.stage,
            'current_status', v_offer.status,
            'stage_1_co_investor_advisor', v_offer.co_investor_advisor_approval_status,
            'stage_2_startup_advisor', v_offer.startup_advisor_approval_status,
            'stage_3_startup_founder', v_offer.startup_approval_status
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_consolidated_co_investment_offer_summary(INTEGER) TO authenticated;

-- Step 11: Create approval function for startup advisor (Stage 2)
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_offer_startup_advisor(
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
    
    -- Check current status (should be pending_startup_advisor_approval at stage 2)
    IF v_offer.stage != 2 OR v_offer.status != 'pending_startup_advisor_approval' THEN
        RAISE EXCEPTION 'Offer is not waiting for startup advisor approval. Current stage: %, status: %', v_offer.stage, v_offer.status;
    END IF;
    
    -- Determine new status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'pending_startup_approval';
    ELSE
        v_new_status := 'rejected';
    END IF;
    
    -- Update offer
    UPDATE public.co_investment_offers
    SET 
        startup_advisor_approval_status = CASE 
            WHEN p_approval_action = 'approve' THEN 'approved'
            WHEN p_approval_action = 'reject' THEN 'rejected'
        END,
        startup_advisor_approval_at = NOW(),
        status = v_new_status::offer_status,
        stage = CASE WHEN p_approval_action = 'approve' THEN 3 ELSE 2 END,
        updated_at = NOW()
    WHERE id = p_offer_id;
    
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'stage', CASE WHEN p_approval_action = 'approve' THEN 3 ELSE 2 END,
        'new_status', v_new_status,
        'message', CASE 
            WHEN p_approval_action = 'approve' THEN 'Offer approved by startup advisor. Sending to startup founder for final decision.'
            ELSE 'Offer rejected by startup advisor.'
        END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_offer_startup_advisor(INTEGER, TEXT) TO authenticated;

-- Step 12: Create approval function for startup founder (Stage 3 - Final)
CREATE OR REPLACE FUNCTION public.approve_consolidated_co_investment_offer_startup_founder(
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
    
    -- Check current status (should be pending_startup_approval at stage 3)
    IF v_offer.stage != 3 OR v_offer.status != 'pending_startup_approval' THEN
        RAISE EXCEPTION 'Offer is not waiting for startup founder approval. Current stage: %, status: %', v_offer.stage, v_offer.status;
    END IF;
    
    -- Determine final status based on action
    IF p_approval_action = 'approve' THEN
        v_new_status := 'approved';
    ELSE
        v_new_status := 'rejected';
    END IF;
    
    -- Update offer (Stage 3 is final)
    UPDATE public.co_investment_offers
    SET 
        startup_approval_status = CASE 
            WHEN p_approval_action = 'approve' THEN 'approved'
            WHEN p_approval_action = 'reject' THEN 'rejected'
        END,
        startup_approval_at = NOW(),
        status = v_new_status::offer_status,
        stage = 3, -- Final stage
        updated_at = NOW()
    WHERE id = p_offer_id;

    -- Keep parent co-investment opportunity in sync for Discover Co-Investment visibility
    -- (Legacy Discover screens read startup_approval_status/stage from co_investment_opportunities)
    UPDATE public.co_investment_opportunities
    SET
        startup_approval_status = CASE
            WHEN p_approval_action = 'approve' THEN 'approved'
            WHEN p_approval_action = 'reject' THEN 'rejected'
        END,
        stage = 3,
        updated_at = NOW()
    WHERE id = v_offer.co_investment_opportunity_id;
    
    RETURN json_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'stage', 3,
        'new_status', v_new_status,
        'message', CASE 
            WHEN p_approval_action = 'approve' THEN 'Co-investment offer approved by startup founder. Offer is now active.'
            ELSE 'Co-investment offer rejected by startup founder.'
        END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_consolidated_co_investment_offer_startup_founder(INTEGER, TEXT) TO authenticated;

-- Summary of changes:
-- 1. Co-investment_offers table now contains all co-investment details in ONE record
-- 2. investment_offers table remains COMPLETELY UNCHANGED
-- 3. Lead investor information is denormalized in co_investment_offers for easy display
-- 4. Remaining amounts are calculated and stored for each co-investment offer
-- 5. 3-Stage Approval Flow (all on same offer):
--    Stage 1: Co-investor Investment Advisor approval
--    Stage 2: Startup Investment Advisor approval (reviews in Active Investments tab)
--    Stage 3: Startup Founder final decision
-- 6. Views provide investor advisor and startup with tailored displays
-- 7. is_consolidated flag identifies new vs old offers during transition period
-- 8. Functions: approve_consolidated_co_investment_offer_co_investor_advisor (Stage 1)
--              approve_consolidated_co_investment_offer_startup_advisor (Stage 2)
--              approve_consolidated_co_investment_offer_startup_founder (Stage 3)
