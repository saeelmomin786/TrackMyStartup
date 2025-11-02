-- Fix function overload issue - Drop ALL old signatures and keep only the correct one
-- There are multiple function signatures causing ambiguity

-- Drop ALL existing versions of create_investment_offer_with_fee
-- This ensures no function signature conflicts

-- Drop version with TEXT types (positional order: TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER)
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER
);

-- Drop version with TEXT types (named parameters)
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT,
    p_startup_id INTEGER,
    p_investment_id INTEGER
);

-- Drop old version with CHARACTER VARYING (positional order: VARCHAR, VARCHAR, INTEGER, DECIMAL, DECIMAL, VARCHAR, DECIMAL)
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    CHARACTER VARYING, CHARACTER VARYING, INTEGER, DECIMAL, DECIMAL, CHARACTER VARYING, DECIMAL
);

-- Drop old version with named CHARACTER VARYING parameters
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email CHARACTER VARYING,
    p_startup_name CHARACTER VARYING,
    p_startup_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_country CHARACTER VARYING,
    p_startup_amount_raised DECIMAL
);

-- Drop any other variations
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_investment_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT
);

-- Now create ONLY the correct function with proper advisor logic
CREATE OR REPLACE FUNCTION public.create_investment_offer_with_fee(
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
    final_startup_id INTEGER;
    final_investment_id INTEGER;
    investor_has_advisor BOOLEAN := FALSE;
    startup_has_advisor BOOLEAN := FALSE;
    investor_advisor_code TEXT;
    startup_advisor_code TEXT;
    initial_stage INTEGER := 1;  -- Always start at stage 1
    initial_investor_advisor_status TEXT := 'not_required';
    initial_startup_advisor_status TEXT := 'not_required';
    initial_status offer_status := 'pending'::offer_status;  -- Cast to enum type
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
    
    -- Validate required parameters
    IF p_offer_amount IS NULL OR p_offer_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid offer amount: %', p_offer_amount;
    END IF;
    
    IF p_equity_percentage IS NULL OR p_equity_percentage <= 0 OR p_equity_percentage > 100 THEN
        RAISE EXCEPTION 'Invalid equity percentage: %', p_equity_percentage;
    END IF;
    
    IF p_startup_name IS NULL OR p_startup_name = '' THEN
        RAISE EXCEPTION 'Startup name is required';
    END IF;
    
    -- Check if investor has advisor (check both fields)
    IF investor_advisor_code IS NOT NULL AND investor_advisor_code != '' THEN
        investor_has_advisor := TRUE;
        initial_investor_advisor_status := 'pending';  -- Needs advisor approval
        RAISE NOTICE 'Investor % has advisor code: %, setting status to pending', p_investor_email, investor_advisor_code;
    ELSE
        RAISE NOTICE 'Investor % has no advisor code, setting status to not_required', p_investor_email;
    END IF;
    
    -- Find startup_id - use provided p_startup_id if available, otherwise find from investment_id or name
    IF p_startup_id IS NOT NULL THEN
        final_startup_id := p_startup_id;
    ELSIF p_investment_id IS NOT NULL THEN
        -- Try to find startup_id from investment_id
        -- The investment_id in new_investments should match the startup id
        SELECT s.id INTO final_startup_id
        FROM startups s
        WHERE s.id = p_investment_id  -- investment_id typically matches startup_id
        LIMIT 1;
        
        -- If still not found, try to find from new_investments table by name
        IF final_startup_id IS NULL THEN
            SELECT s.id INTO final_startup_id
            FROM startups s
            INNER JOIN new_investments ni ON s.name = ni.name
            WHERE ni.id = p_investment_id
            LIMIT 1;
        END IF;
    END IF;
    
    -- If still not found, try to find by startup name
    IF final_startup_id IS NULL THEN
        SELECT s.id INTO final_startup_id
        FROM startups s
        WHERE s.name = p_startup_name
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
    
    -- Ensure we have investment_id - if not provided, try to find it from startup
    final_investment_id := p_investment_id;
    
    IF final_investment_id IS NULL AND final_startup_id IS NOT NULL THEN
        SELECT id INTO final_investment_id
        FROM new_investments
        WHERE id = final_startup_id  -- investment_id typically matches startup_id
        OR name = p_startup_name
        LIMIT 1;
    END IF;
    
    -- Insert the investment offer with proper initial values
    BEGIN
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
            final_startup_id,  -- Can be NULL if not found
            final_investment_id,  -- Can be NULL if not found
            investor_id,
            p_offer_amount,
            p_equity_percentage,
            p_currency,
            initial_status::offer_status,  -- Explicitly cast to enum type
            initial_stage,
            initial_investor_advisor_status,
            initial_startup_advisor_status,
            NOW(),
            NOW()
        ) RETURNING id INTO new_offer_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to create investment offer: %', SQLERRM;
    END;
    
    IF new_offer_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create investment offer: INSERT did not return an ID';
    END IF;
    
    RAISE NOTICE 'Created offer ID: %, investor_has_advisor: %, investor_advisor_status: %', 
        new_offer_id, investor_has_advisor, initial_investor_advisor_status;
    
    -- Return the new offer ID
    RETURN new_offer_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_investment_offer_with_fee(
    TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER
) TO authenticated;

-- Verify only ONE function exists now
SELECT 
    'Function signature check' as status,
    COUNT(*) as function_count,
    STRING_AGG(DISTINCT routine_name::text, ', ') as function_names
FROM information_schema.routines
WHERE routine_name = 'create_investment_offer_with_fee';

-- Show the function parameters to confirm correct signature
SELECT 
    parameter_name,
    data_type,
    parameter_default,
    ordinal_position
FROM information_schema.parameters
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'create_investment_offer_with_fee'
)
ORDER BY ordinal_position;

