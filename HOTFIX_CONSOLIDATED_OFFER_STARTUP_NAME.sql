-- HOTFIX: Fix consolidated co-investment offer insert when startup_name is NOT NULL
-- Date: 2026-02-18
-- Issue: create_consolidated_co_investment_offer inserted into co_investment_offers without startup_name,
-- causing: null value in column "startup_name" violates not-null constraint.

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
        lead_investor_id,
        lead_investor_name,
        lead_investor_email,
        lead_investor_amount,
        total_co_investment_needed,
        minimum_co_investment_amount,
        maximum_co_investment_amount,
        remaining_co_investment_amount,
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
        'pending',
        1,
        TRUE,
        v_lead_investor.id,
        v_lead_investor.name,
        v_lead_investor.email,
        v_opportunity.investment_amount,
        v_opportunity.investment_amount,
        v_opportunity.minimum_co_investment,
        v_opportunity.maximum_co_investment,
        v_remaining_amount,
        'pending',
        'pending',
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_offer_id;

    -- Fetch complete offer record to return
    SELECT * INTO v_new_offer FROM public.co_investment_offers WHERE id = v_offer_id;

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
