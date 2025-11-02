-- Update create_investment_offer_with_fee function to support co_investment_opportunity_id
-- This allows the function to store co-investment opportunity ID directly during offer creation
-- 
-- SAFETY: This update is backward compatible because:
-- 1. The new parameter p_co_investment_opportunity_id has DEFAULT NULL (optional)
-- 2. It's added at the END of the parameter list
-- 3. Existing code calling without this parameter will work (uses default NULL)
-- 4. The function is only called from lib/database.ts with named parameters, so parameter order doesn't matter
-- 5. This only affects the create_investment_offer_with_fee function, no other functions are changed
--
-- VERIFICATION: Checked that:
-- - Function is only called from lib/database.ts (line 828)
-- - All calls use named parameters (safe with new optional parameter)
-- - No triggers or other functions depend on this function
-- - New parameter defaults to NULL (backward compatible)

-- Step 1: Add missing enum values to offer_status if they don't exist
DO $$ 
BEGIN
    -- Add pending_investor_advisor_approval if it doesn't exist (for regular flow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pending_investor_advisor_approval' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'pending_investor_advisor_approval';
    END IF;
    
    -- Add pending_startup_advisor_approval if it doesn't exist (for regular flow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pending_startup_advisor_approval' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'pending_startup_advisor_approval';
    END IF;
    
    -- Add investor_advisor_approved if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'investor_advisor_approved' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'investor_advisor_approved';
    END IF;
    
    -- Add startup_advisor_approved if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'startup_advisor_approved' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'startup_advisor_approved';
    END IF;
    
    -- Add investor_advisor_rejected if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'investor_advisor_rejected' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'investor_advisor_rejected';
    END IF;
    
    -- Add pending_lead_investor_approval if it doesn't exist (for co-investment flow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pending_lead_investor_approval' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'pending_lead_investor_approval';
    END IF;
    
    -- Add lead_investor_rejected if it doesn't exist (for co-investment flow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'lead_investor_rejected' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'lead_investor_rejected';
    END IF;
    
    -- Add pending_startup_approval if it doesn't exist (for co-investment flow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pending_startup_approval' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
        ALTER TYPE offer_status ADD VALUE 'pending_startup_approval';
    END IF;
END $$;

-- Step 2: Drop existing function variations
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
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT,
    p_startup_id INTEGER,
    p_investment_id INTEGER
);

-- Create updated function with co_investment_opportunity_id parameter
CREATE OR REPLACE FUNCTION public.create_investment_offer_with_fee(
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT DEFAULT 'USD',
    p_startup_id INTEGER DEFAULT NULL,
    p_investment_id INTEGER DEFAULT NULL,
    p_co_investment_opportunity_id INTEGER DEFAULT NULL  -- NEW: Support for co-investment offers
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
    initial_status TEXT := 'pending';
BEGIN
    -- Get investor ID and check if investor has advisor
    SELECT 
        u.id,
        COALESCE(u.investment_advisor_code, u.investment_advisor_code_entered) AS advisor_code,
        CASE 
            WHEN u.investment_advisor_code IS NOT NULL OR u.investment_advisor_code_entered IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS has_advisor
    INTO investor_id, investor_advisor_code, investor_has_advisor
    FROM public.users u
    WHERE u.email = p_investor_email;
    
    IF investor_id IS NULL THEN
        RAISE EXCEPTION 'Investor not found with email: %', p_investor_email;
    END IF;
    
    -- Determine final investment_id (startup_id might not exist, so we work with investment_id)
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
    
    -- Check if startup has advisor (only if startup_id is known)
    -- Use startup_name to find startup if final_startup_id is not available
    IF final_startup_id IS NOT NULL THEN
        SELECT 
            investment_advisor_code,
            CASE 
                WHEN investment_advisor_code IS NOT NULL THEN TRUE
                ELSE FALSE
            END
        INTO startup_advisor_code, startup_has_advisor
        FROM public.startups
        WHERE id = final_startup_id;
    ELSIF final_startup_id IS NULL THEN
        -- Try to find startup by name for advisor check
        SELECT 
            investment_advisor_code,
            CASE 
                WHEN investment_advisor_code IS NOT NULL THEN TRUE
                ELSE FALSE
            END
        INTO startup_advisor_code, startup_has_advisor
        FROM public.startups
        WHERE name = p_startup_name
        LIMIT 1;
    END IF;
    
    -- Set initial status and advisor approval status based on advisor presence
    -- Handle co-investment offers differently from regular offers
    IF p_co_investment_opportunity_id IS NOT NULL THEN
        -- CO-INVESTMENT FLOW: Investor Advisor → Lead Investor → Startup
        -- For co-investment offers, set status directly (handleInvestmentFlow is not used)
        IF investor_has_advisor THEN
            initial_investor_advisor_status := 'pending';
            initial_status := 'pending_investor_advisor_approval';
        ELSE
            -- No investor advisor, go directly to lead investor approval
            initial_status := 'pending_lead_investor_approval';
        END IF;
    ELSE
        -- REGULAR OFFER FLOW: Always start with 'pending' and stage 1
        -- handleInvestmentFlow() in JavaScript will process the flow and set proper status/stage
        -- DO NOT set status here - let handleInvestmentFlow handle it
        initial_status := 'pending';
        initial_stage := 1;
        initial_investor_advisor_status := 'not_required';
        initial_startup_advisor_status := 'not_required';
        -- handleInvestmentFlow will check advisors and set status accordingly
    END IF;
    
    -- Insert the investment offer with co_investment_opportunity_id
    -- IMPORTANT: Include startup_id so handleInvestmentFlow can fetch startup data
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
        co_investment_opportunity_id,  -- NEW: Store co-investment opportunity ID
        created_at,
        updated_at
    ) VALUES (
        p_investor_email,
        p_startup_name,
        final_startup_id,  -- Set startup_id so handleInvestmentFlow can work
        final_investment_id,
        investor_id,
        p_offer_amount,
        p_equity_percentage,
        p_currency,
        initial_status::offer_status,
        initial_stage,
        initial_investor_advisor_status,
        initial_startup_advisor_status,
        p_co_investment_opportunity_id,  -- NEW: Include co-investment opportunity ID
        NOW(),
        NOW()
    ) RETURNING id INTO new_offer_id;
    
    -- Return the new offer ID
    RETURN new_offer_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_investment_offer_with_fee(
    TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER, INTEGER
) TO authenticated;

