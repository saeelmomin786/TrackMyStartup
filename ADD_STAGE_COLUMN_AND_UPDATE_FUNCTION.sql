    -- Add stage column to investment_offers table
    ALTER TABLE public.investment_offers 
    ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1;

    -- Add investor_name column if it doesn't exist
    ALTER TABLE public.investment_offers 
    ADD COLUMN IF NOT EXISTS investor_name TEXT;

    -- Add comment to explain the stage column
    COMMENT ON COLUMN public.investment_offers.stage IS 'Investment workflow stage: 1=Investor made offer, 2=Investor advisor approved, 3=Startup advisor approved, 4=Startup approved';

    -- Update existing records to have stage 1
    UPDATE public.investment_offers 
    SET stage = 1 
    WHERE stage IS NULL;

    -- Drop the existing function
    DROP FUNCTION IF EXISTS public.create_investment_offer_with_fee(TEXT, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT);

    -- Create the updated function with investor name and stage
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
        investor_name TEXT;
    BEGIN
        -- Get investor name from users table
        SELECT name INTO investor_name
        FROM public.users
        WHERE email = p_investor_email
        LIMIT 1;
        
        -- If no name found, use email as fallback
        IF investor_name IS NULL OR investor_name = '' THEN
            investor_name := p_investor_email;
        END IF;
        
        -- Insert the offer with stage 1 (Investor made the offer)
        INSERT INTO public.investment_offers (
            investor_email,
            investor_name,
            startup_name,
            startup_id,
            offer_amount,
            equity_percentage,
            currency,
            status,
            stage,
            created_at,
            updated_at
        ) VALUES (
            p_investor_email,
            investor_name,
            p_startup_name,
            p_startup_id,
            p_offer_amount,
            p_equity_percentage,
            p_currency,
            'pending',
            1, -- Stage 1: Investor made the offer
            NOW(),
            NOW()
        ) RETURNING id INTO new_offer_id;
        
        RETURN new_offer_id;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.create_investment_offer_with_fee(TEXT, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT) TO authenticated;

    -- Create function to update stage
    CREATE OR REPLACE FUNCTION public.update_investment_offer_stage(
        p_offer_id INTEGER,
        p_new_stage INTEGER
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        UPDATE public.investment_offers
        SET stage = p_new_stage,
            updated_at = NOW()
        WHERE id = p_offer_id;
        
        RETURN TRUE;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.update_investment_offer_stage(INTEGER, INTEGER) TO authenticated;

    -- Create function to approve by investor advisor (Stage 2)
    CREATE OR REPLACE FUNCTION public.approve_investor_advisor_offer(
        p_offer_id INTEGER,
        p_approval_action TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        IF p_approval_action = 'approve' THEN
            UPDATE public.investment_offers
            SET stage = 2,
                investor_advisor_approval_status = 'approved',
                investor_advisor_approval_at = NOW(),
                updated_at = NOW()
            WHERE id = p_offer_id;
        ELSIF p_approval_action = 'reject' THEN
            UPDATE public.investment_offers
            SET stage = 1, -- Back to stage 1
                investor_advisor_approval_status = 'rejected',
                investor_advisor_approval_at = NOW(),
                status = 'rejected',
                updated_at = NOW()
            WHERE id = p_offer_id;
        END IF;
        
        RETURN TRUE;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.approve_investor_advisor_offer(INTEGER, TEXT) TO authenticated;

    -- Create function to approve by startup advisor (Stage 3)
    CREATE OR REPLACE FUNCTION public.approve_startup_advisor_offer(
        p_offer_id INTEGER,
        p_approval_action TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        IF p_approval_action = 'approve' THEN
            UPDATE public.investment_offers
            SET stage = 3,
                startup_advisor_approval_status = 'approved',
                startup_advisor_approval_at = NOW(),
                updated_at = NOW()
            WHERE id = p_offer_id;
        ELSIF p_approval_action = 'reject' THEN
            UPDATE public.investment_offers
            SET stage = 2, -- Back to stage 2
                startup_advisor_approval_status = 'rejected',
                startup_advisor_approval_at = NOW(),
                status = 'rejected',
                updated_at = NOW()
            WHERE id = p_offer_id;
        END IF;
        
        RETURN TRUE;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.approve_startup_advisor_offer(INTEGER, TEXT) TO authenticated;

    -- Create function to approve by startup (Stage 4)
    CREATE OR REPLACE FUNCTION public.approve_startup_offer(
        p_offer_id INTEGER,
        p_approval_action TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        IF p_approval_action = 'approve' THEN
            UPDATE public.investment_offers
            SET stage = 4,
                status = 'accepted',
                updated_at = NOW()
            WHERE id = p_offer_id;
        ELSIF p_approval_action = 'reject' THEN
            UPDATE public.investment_offers
            SET stage = 3, -- Back to stage 3
                status = 'rejected',
                updated_at = NOW()
            WHERE id = p_offer_id;
        END IF;
        
        RETURN TRUE;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.approve_startup_offer(INTEGER, TEXT) TO authenticated;

