-- Fix create_investment_offer_with_fee function to properly handle advisor approval logic
-- This ensures offers with investor advisors stay at Stage 1 for advisor approval

-- Drop existing function
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_investment_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT
);

DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    TEXT, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT
);

DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER
);

-- Create the fixed function with proper advisor logic
CREATE OR REPLACE FUNCTION public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_investment_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_offer_id INTEGER;
    investor_id UUID;
    final_startup_id INTEGER;
    investor_has_advisor BOOLEAN := FALSE;
    startup_has_advisor BOOLEAN := FALSE;
    investor_advisor_code TEXT;
    startup_advisor_code TEXT;
    initial_stage INTEGER := 1;  -- Always start at stage 1
    initial_investor_advisor_status TEXT := 'not_required';
    initial_startup_advisor_status TEXT := 'not_required';
    initial_status TEXT := 'pending';
BEGIN
    -- Get investor ID and check if investor has advisor
    -- Check both investment_advisor_code and investment_advisor_code_entered
    SELECT 
        id,
        COALESCE(investment_advisor_code, investment_advisor_code_entered) as advisor_code
    INTO 
        investor_id,
        investor_advisor_code
    FROM public.users 
    WHERE email = p_investor_email
    LIMIT 1;
    
    IF investor_id IS NULL THEN
        RAISE EXCEPTION 'Investor with email % not found', p_investor_email;
    END IF;
    
    -- Check if investor has advisor (check both fields)
    IF investor_advisor_code IS NOT NULL AND investor_advisor_code != '' THEN
        investor_has_advisor := TRUE;
        initial_investor_advisor_status := 'pending';  -- Needs advisor approval
        RAISE NOTICE 'Investor % has advisor code: %, setting status to pending', p_investor_email, investor_advisor_code;
    ELSE
        RAISE NOTICE 'Investor % has no advisor code, setting status to not_required', p_investor_email;
    END IF;
    
    -- Find startup_id from investment_id
    -- The investment_id in new_investments should match the startup id
    SELECT s.id INTO final_startup_id
    FROM startups s
    WHERE s.id = p_investment_id  -- investment_id typically matches startup_id
    OR s.name = p_startup_name
    LIMIT 1;
    
    -- If still not found, try to find from new_investments table
    IF final_startup_id IS NULL THEN
        SELECT s.id INTO final_startup_id
        FROM startups s
        INNER JOIN new_investments ni ON s.name = ni.name
        WHERE ni.id = p_investment_id
        LIMIT 1;
    END IF;
    
    -- If startup_id found, check if startup has advisor
    IF final_startup_id IS NOT NULL THEN
        SELECT investment_advisor_code INTO startup_advisor_code
        FROM startups
        WHERE id = final_startup_id;
        
        IF startup_advisor_code IS NOT NULL AND startup_advisor_code != '' THEN
            startup_has_advisor := TRUE;
            initial_startup_advisor_status := 'not_required';  -- Will be set to pending later if needed
        END IF;
    END IF;
    
    -- Insert the investment offer with proper initial values
    INSERT INTO public.investment_offers (
        investor_email,
        startup_name,
        startup_id,
        investment_id,
        investor_id,
        offer_amount,
        equity_percentage,
        currency,
        status,
        stage,
        investor_advisor_approval_status,
        startup_advisor_approval_status,
        created_at,
        updated_at
    ) VALUES (
        p_investor_email,
        p_startup_name,
        final_startup_id,
        p_investment_id,
        investor_id,
        p_offer_amount,
        p_equity_percentage,
        p_currency,
        initial_status,
        initial_stage,
        initial_investor_advisor_status,
        initial_startup_advisor_status,
        NOW(),
        NOW()
    ) RETURNING id INTO new_offer_id;
    
    RAISE NOTICE 'Created offer ID: %, investor_has_advisor: %, investor_advisor_status: %', 
        new_offer_id, investor_has_advisor, initial_investor_advisor_status;
    
    -- Return the new offer ID
    RETURN new_offer_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_investment_offer_with_fee(
    TEXT, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT
) TO authenticated;

-- Verify the function was created
SELECT 
    'Function created successfully' as status,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'create_investment_offer_with_fee';

