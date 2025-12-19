-- =====================================================
-- UPDATE CO-INVESTMENT OFFER FUNCTION ONLY
-- =====================================================
-- This only updates the function, doesn't create tables
-- Run this to update create_co_investment_offer to use user_profiles
-- =====================================================

-- Update function to create co-investment offers
CREATE OR REPLACE FUNCTION public.create_co_investment_offer(
    p_co_investment_opportunity_id INTEGER,
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT DEFAULT 'USD',
    p_startup_id INTEGER DEFAULT NULL,
    p_investment_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_offer_id INTEGER;
    investor_id UUID;
    investor_name TEXT;
    final_startup_id INTEGER;
    final_investment_id INTEGER;
    investor_has_advisor BOOLEAN := FALSE;
    investor_advisor_code TEXT;
    initial_status offer_status := 'pending_lead_investor_approval';
    initial_investor_advisor_status TEXT := 'not_required';
BEGIN
    -- Validate: co_investment_opportunity_id must be provided
    IF p_co_investment_opportunity_id IS NULL THEN
        RAISE EXCEPTION 'co_investment_opportunity_id is required';
    END IF;
    
    -- Validate: Lead investor cannot make offer on their own opportunity
    DECLARE
        lead_investor_id UUID;
    BEGIN
        SELECT listed_by_user_id INTO lead_investor_id
        FROM public.co_investment_opportunities
        WHERE id = p_co_investment_opportunity_id;
        
        IF lead_investor_id IS NULL THEN
            RAISE EXCEPTION 'Co-investment opportunity not found';
        END IF;
        
        -- Get investor ID from user_profiles (complete migration)
        SELECT up.auth_user_id
        INTO investor_id
        FROM public.user_profiles up
        WHERE up.email = p_investor_email
          AND up.role = 'Investor'
        LIMIT 1;
        
        IF investor_id IS NULL THEN
            RAISE EXCEPTION 'Investor not found with email: %', p_investor_email;
        END IF;
        
        -- Check if investor is the lead investor
        IF investor_id = lead_investor_id THEN
            RAISE EXCEPTION 'Lead investor cannot make an offer on their own co-investment opportunity';
        END IF;
    END;
    
    -- Get investor details and check for advisor
    -- MIGRATED: Now only uses user_profiles table (complete migration)
    SELECT 
        up.auth_user_id,
        up.name,
        COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered) AS advisor_code,
        CASE 
            WHEN up.investment_advisor_code IS NOT NULL 
                 OR up.investment_advisor_code_entered IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS has_advisor
    INTO investor_id, investor_name, investor_advisor_code, investor_has_advisor
    FROM public.user_profiles up
    WHERE up.email = p_investor_email
      AND up.role = 'Investor'
    LIMIT 1;
    
    IF investor_id IS NULL THEN
        RAISE EXCEPTION 'Investor not found with email: %', p_investor_email;
    END IF;
    
    -- Determine final startup_id and investment_id
    IF p_investment_id IS NOT NULL THEN
        final_investment_id := p_investment_id;
        -- Try to find startup by matching name with investment name
        SELECT s.id INTO final_startup_id
        FROM public.startups s
        INNER JOIN public.new_investments ni ON s.name = ni.name
        WHERE ni.id = p_investment_id
        LIMIT 1;
    ELSIF p_startup_id IS NOT NULL THEN
        final_startup_id := p_startup_id;
        -- Try to find investment_id by matching startup name
        SELECT ni.id INTO final_investment_id
        FROM public.new_investments ni
        INNER JOIN public.startups s ON s.name = ni.name
        WHERE s.id = p_startup_id
        LIMIT 1;
    ELSE
        -- Try to find by startup name - find both startup and investment
        SELECT s.id INTO final_startup_id
        FROM public.startups s
        WHERE s.name = p_startup_name
        LIMIT 1;
        
        IF final_startup_id IS NOT NULL THEN
            SELECT ni.id INTO final_investment_id
            FROM public.new_investments ni
            WHERE ni.name = p_startup_name
            LIMIT 1;
        ELSE
            -- If startup not found by name, try to find investment by name
            SELECT ni.id INTO final_investment_id
            FROM public.new_investments ni
            WHERE ni.name = p_startup_name
            LIMIT 1;
        END IF;
    END IF;
    
    -- Set initial status based on investor advisor presence
    IF investor_has_advisor THEN
        initial_investor_advisor_status := 'pending';
        initial_status := 'pending_investor_advisor_approval';
    ELSE
        -- No investor advisor, go directly to lead investor approval
        initial_status := 'pending_lead_investor_approval';
        initial_investor_advisor_status := 'not_required';
    END IF;
    
    -- Insert the co-investment offer
    INSERT INTO public.co_investment_offers (
        co_investment_opportunity_id,
        investor_email,
        investor_id,
        investor_name,
        startup_name,
        startup_id,
        investment_id,
        offer_amount,
        equity_percentage,
        currency,
        status,
        investor_advisor_approval_status,
        lead_investor_approval_status,
        startup_approval_status,
        created_at,
        updated_at
    ) VALUES (
        p_co_investment_opportunity_id,
        p_investor_email,
        investor_id,
        investor_name,
        p_startup_name,
        final_startup_id,
        final_investment_id,
        p_offer_amount,
        p_equity_percentage,
        p_currency,
        initial_status::offer_status,
        initial_investor_advisor_status,
        'pending',  -- Lead investor approval always required
        'pending',  -- Startup approval pending
        NOW(),
        NOW()
    ) RETURNING id INTO new_offer_id;
    
    -- Return the new offer ID
    RETURN new_offer_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_co_investment_offer(
    INTEGER, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER
) TO authenticated;

