-- Create simple investment offer function without scouting fees
-- Run this in Supabase SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_startup_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_country TEXT,
    p_startup_amount_raised DECIMAL
);

-- Create a simple function without scouting fees
CREATE OR REPLACE FUNCTION public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_startup_id INTEGER,
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
BEGIN
    -- Insert the investment offer without scouting fees
    INSERT INTO public.investment_offers (
        investor_email,
        startup_name,
        startup_id,
        offer_amount,
        equity_percentage,
        currency,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_investor_email,
        p_startup_name,
        p_startup_id,
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

-- Test the function (optional - remove in production)
-- SELECT public.create_investment_offer_with_fee(
--     'test@example.com',
--     'Test Startup',
--     1,
--     100000,
--     10,
--     'USD'
-- );
