-- Improved Co-Investment Creation with Better Error Handling
-- This provides a more robust co-investment creation function

CREATE OR REPLACE FUNCTION public.create_co_investment_opportunity_safe(
    p_startup_name VARCHAR(255),
    p_listed_by_user_id UUID,
    p_listed_by_type VARCHAR(50),
    p_investment_amount DECIMAL(15,2),
    p_equity_percentage DECIMAL(5,2),
    p_minimum_co_investment DECIMAL(15,2),
    p_maximum_co_investment DECIMAL(15,2),
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    startup_id INTEGER;
    opportunity_id INTEGER;
    result JSON;
BEGIN
    -- Validate inputs
    IF p_startup_name IS NULL OR p_startup_name = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Startup name is required'
        );
    END IF;
    
    IF p_listed_by_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Listed by user ID is required'
        );
    END IF;
    
    IF p_investment_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Investment amount must be greater than 0'
        );
    END IF;
    
    IF p_minimum_co_investment <= 0 OR p_maximum_co_investment <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Minimum and maximum co-investment amounts must be greater than 0'
        );
    END IF;
    
    IF p_minimum_co_investment > p_maximum_co_investment THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Minimum co-investment cannot be greater than maximum co-investment'
        );
    END IF;
    
    -- Find startup by name
    SELECT id INTO startup_id 
    FROM public.startups 
    WHERE name = p_startup_name 
    LIMIT 1;
    
    IF startup_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Startup "' || p_startup_name || '" not found'
        );
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_listed_by_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if co-investment opportunity already exists for this startup and user
    IF EXISTS (
        SELECT 1 FROM public.co_investment_opportunities 
        WHERE startup_id = startup_id 
        AND listed_by_user_id = p_listed_by_user_id 
        AND status = 'active'
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Co-investment opportunity already exists for this startup'
        );
    END IF;
    
    -- Create the co-investment opportunity
    BEGIN
        INSERT INTO public.co_investment_opportunities (
            startup_id,
            listed_by_user_id,
            listed_by_type,
            investment_amount,
            equity_percentage,
            minimum_co_investment,
            maximum_co_investment,
            description,
            status,
            stage,
            lead_investor_advisor_approval_status,
            startup_advisor_approval_status,
            startup_approval_status,
            created_at,
            updated_at
        ) VALUES (
            startup_id,
            p_listed_by_user_id,
            p_listed_by_type,
            p_investment_amount,
            p_equity_percentage,
            p_minimum_co_investment,
            p_maximum_co_investment,
            p_description,
            'active',
            1,
            'not_required',
            'not_required',
            'pending',
            NOW(),
            NOW()
        ) RETURNING id INTO opportunity_id;
        
        -- Return success with opportunity details
        RETURN json_build_object(
            'success', true,
            'opportunity_id', opportunity_id,
            'startup_id', startup_id,
            'message', 'Co-investment opportunity created successfully'
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Database error: ' || SQLERRM
            );
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_co_investment_opportunity_safe(
    VARCHAR(255), UUID, VARCHAR(50), DECIMAL(15,2), DECIMAL(5,2), 
    DECIMAL(15,2), DECIMAL(15,2), TEXT
) TO authenticated;

-- Test the function
DO $$
DECLARE
    test_result JSON;
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM public.users WHERE role = 'Investor' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test with a real startup name
        SELECT public.create_co_investment_opportunity_safe(
            'Track My Startup_Startup',
            test_user_id,
            'Investor',
            1000000.00,
            10.00,
            100000.00,
            500000.00,
            'Test co-investment opportunity'
        ) INTO test_result;
        
        RAISE NOTICE 'Test result: %', test_result;
        
        -- Clean up if test was successful
        IF (test_result->>'success')::boolean THEN
            DELETE FROM public.co_investment_opportunities 
            WHERE id = (test_result->>'opportunity_id')::integer;
            RAISE NOTICE 'Test record cleaned up';
        END IF;
    ELSE
        RAISE NOTICE 'No test user found';
    END IF;
END $$;






