-- Fix create_investment_offer_with_fee function
-- This script ensures we have the correct function definition

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_startup_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT
);

DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email VARCHAR(255),
    p_startup_name VARCHAR(255),
    p_startup_id INTEGER,
    p_offer_amount DECIMAL(15,2),
    p_equity_percentage DECIMAL(5,2),
    p_country VARCHAR(100),
    p_startup_amount_raised DECIMAL(15,2)
);

-- Create the simple version that matches our frontend call
CREATE OR REPLACE FUNCTION public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_investment_id INTEGER,  -- Changed from p_startup_id
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
BEGIN
    -- Get investor ID
    SELECT id INTO investor_id FROM public.users WHERE email = p_investor_email;
    
    -- Insert the investment offer
    INSERT INTO public.investment_offers (
        investor_email,
        startup_name,
        investment_id,  -- Changed from startup_id
        investor_id,
        offer_amount,
        equity_percentage,
        currency,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_investor_email,
        p_startup_name,
        p_investment_id,  -- Changed from p_startup_id
        investor_id,
        p_offer_amount,
        p_equity_percentage,
        p_currency,
        'pending',
        NOW(),
        NOW()
    ) RETURNING id INTO new_offer_id;

    -- Return the new offer ID
    RETURN new_offer_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_investment_offer_with_fee(
    TEXT, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT
) TO authenticated;

-- Test the function
SELECT public.create_investment_offer_with_fee(
    'test@example.com',
    'Test Startup',
    1,
    100000,
    10,
    'USD'
);
