-- SAFE FIX: Update function to handle both startup_id and investment_id
-- This approach maintains backward compatibility

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_startup_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT
);

DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_investment_id INTEGER,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT
);

-- Create a function that handles both cases
CREATE OR REPLACE FUNCTION public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT DEFAULT 'USD',
    p_startup_id INTEGER DEFAULT NULL,  -- For backward compatibility
    p_investment_id INTEGER DEFAULT NULL  -- For new investments
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
BEGIN
    -- Get investor ID
    SELECT id INTO investor_id FROM public.users WHERE email = p_investor_email;
    
    -- Determine startup_id and investment_id
    IF p_startup_id IS NOT NULL THEN
        -- Use provided startup_id (backward compatibility)
        final_startup_id := p_startup_id;
        
        -- Find corresponding investment_id by startup name
        SELECT ni.id INTO final_investment_id 
        FROM new_investments ni 
        WHERE ni.name = p_startup_name 
        LIMIT 1;
    ELSIF p_investment_id IS NOT NULL THEN
        -- Use provided investment_id (new approach)
        final_investment_id := p_investment_id;
        
        -- Find corresponding startup_id by name
        SELECT s.id INTO final_startup_id 
        FROM startups s 
        WHERE s.name = p_startup_name 
        LIMIT 1;
    ELSE
        -- Try to find both by startup name
        SELECT s.id INTO final_startup_id 
        FROM startups s 
        WHERE s.name = p_startup_name 
        LIMIT 1;
        
        SELECT ni.id INTO final_investment_id 
        FROM new_investments ni 
        WHERE ni.name = p_startup_name 
        LIMIT 1;
    END IF;
    
    -- Insert the investment offer with both IDs
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
        created_at,
        updated_at
    ) VALUES (
        p_investor_email,
        p_startup_name,
        final_startup_id,
        final_investment_id,
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
    TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER
) TO authenticated;

-- Test the function with both approaches
-- SELECT public.create_investment_offer_with_fee(
--     'test@example.com',
--     'Test Startup',
--     100000,
--     10,
--     'USD',
--     NULL,  -- startup_id
--     1      -- investment_id
-- );
