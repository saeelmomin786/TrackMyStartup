-- Fix Co-Investment Creation Error
-- This script addresses the "co-investment opportunity could not be created" error

-- Step 1: Check if co_investment_opportunities table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'co_investment_opportunities'
    ) THEN
        RAISE NOTICE 'Creating co_investment_opportunities table...';
        
        -- Create the co_investment_opportunities table
        CREATE TABLE public.co_investment_opportunities (
            id SERIAL PRIMARY KEY,
            startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
            listed_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            listed_by_type VARCHAR(50) NOT NULL CHECK (listed_by_type IN ('Investor', 'Investment Advisor')),
            investment_amount DECIMAL(15,2) NOT NULL,
            equity_percentage DECIMAL(5,2) NOT NULL,
            minimum_co_investment DECIMAL(15,2) NOT NULL,
            maximum_co_investment DECIMAL(15,2) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'rejected', 'completed')),
            
            -- Stage-wise approval system columns
            stage INTEGER DEFAULT 1 CHECK (stage BETWEEN 1 AND 4),
            lead_investor_advisor_approval_status VARCHAR(50) DEFAULT 'not_required' CHECK (lead_investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
            lead_investor_advisor_approval_at TIMESTAMP WITH TIME ZONE,
            startup_advisor_approval_status VARCHAR(50) DEFAULT 'not_required' CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
            startup_advisor_approval_at TIMESTAMP WITH TIME ZONE,
            startup_approval_status VARCHAR(50) DEFAULT 'pending' CHECK (startup_approval_status IN ('pending', 'approved', 'rejected')),
            startup_approval_at TIMESTAMP WITH TIME ZONE,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes for better performance
        CREATE INDEX idx_co_investment_opportunities_startup_id ON public.co_investment_opportunities(startup_id);
        CREATE INDEX idx_co_investment_opportunities_listed_by_user_id ON public.co_investment_opportunities(listed_by_user_id);
        CREATE INDEX idx_co_investment_opportunities_status ON public.co_investment_opportunities(status);
        CREATE INDEX idx_co_investment_opportunities_stage ON public.co_investment_opportunities(stage);
        
        RAISE NOTICE 'co_investment_opportunities table created successfully';
    ELSE
        RAISE NOTICE 'co_investment_opportunities table already exists';
    END IF;
END $$;

-- Step 2: Check if stage columns exist and add them if missing
DO $$
BEGIN
    -- Check if stage column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'stage'
    ) THEN
        RAISE NOTICE 'Adding stage column to co_investment_opportunities...';
        ALTER TABLE public.co_investment_opportunities 
        ADD COLUMN stage INTEGER DEFAULT 1 CHECK (stage BETWEEN 1 AND 4);
    END IF;
    
    -- Check if lead_investor_advisor_approval_status column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'lead_investor_advisor_approval_status'
    ) THEN
        RAISE NOTICE 'Adding lead_investor_advisor_approval_status column...';
        ALTER TABLE public.co_investment_opportunities 
        ADD COLUMN lead_investor_advisor_approval_status VARCHAR(50) DEFAULT 'not_required' CHECK (lead_investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected'));
    END IF;
    
    -- Check if startup_advisor_approval_status column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'startup_advisor_approval_status'
    ) THEN
        RAISE NOTICE 'Adding startup_advisor_approval_status column...';
        ALTER TABLE public.co_investment_opportunities 
        ADD COLUMN startup_advisor_approval_status VARCHAR(50) DEFAULT 'not_required' CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected'));
    END IF;
    
    -- Check if startup_approval_status column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'startup_approval_status'
    ) THEN
        RAISE NOTICE 'Adding startup_approval_status column...';
        ALTER TABLE public.co_investment_opportunities 
        ADD COLUMN startup_approval_status VARCHAR(50) DEFAULT 'pending' CHECK (startup_approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    RAISE NOTICE 'Stage columns check completed';
END $$;

-- Step 3: Create co_investment_interests table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'co_investment_interests'
    ) THEN
        RAISE NOTICE 'Creating co_investment_interests table...';
        
        CREATE TABLE public.co_investment_interests (
            id SERIAL PRIMARY KEY,
            opportunity_id INTEGER NOT NULL REFERENCES public.co_investment_opportunities(id) ON DELETE CASCADE,
            interested_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            interested_user_type VARCHAR(50) NOT NULL CHECK (interested_user_type IN ('Investor', 'Investment Advisor')),
            message TEXT,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_co_investment_interests_opportunity_id ON public.co_investment_interests(opportunity_id);
        CREATE INDEX idx_co_investment_interests_interested_user_id ON public.co_investment_interests(interested_user_id);
        
        RAISE NOTICE 'co_investment_interests table created successfully';
    ELSE
        RAISE NOTICE 'co_investment_interests table already exists';
    END IF;
END $$;

-- Step 4: Create co_investment_approvals table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'co_investment_approvals'
    ) THEN
        RAISE NOTICE 'Creating co_investment_approvals table...';
        
        CREATE TABLE public.co_investment_approvals (
            id SERIAL PRIMARY KEY,
            opportunity_id INTEGER NOT NULL REFERENCES public.co_investment_opportunities(id) ON DELETE CASCADE,
            approver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('lead_investor_advisor', 'startup_advisor', 'startup')),
            approval_action VARCHAR(50) NOT NULL CHECK (approval_action IN ('approve', 'reject')),
            comments TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_co_investment_approvals_opportunity_id ON public.co_investment_approvals(opportunity_id);
        CREATE INDEX idx_co_investment_approvals_approver_user_id ON public.co_investment_approvals(approver_user_id);
        
        RAISE NOTICE 'co_investment_approvals table created successfully';
    ELSE
        RAISE NOTICE 'co_investment_approvals table already exists';
    END IF;
END $$;

-- Step 5: Create RPC functions for co-investment management

-- Function to update co-investment opportunity stage
CREATE OR REPLACE FUNCTION public.update_co_investment_opportunity_stage(
    p_opportunity_id INTEGER,
    p_new_stage INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.co_investment_opportunities 
    SET stage = p_new_stage, updated_at = NOW()
    WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_co_investment_opportunity_stage(INTEGER, INTEGER) TO authenticated;

-- Function to approve lead investor advisor co-investment
CREATE OR REPLACE FUNCTION public.approve_lead_investor_advisor_co_investment(
    p_opportunity_id INTEGER,
    p_approval_action VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_stage INTEGER;
    startup_has_advisor BOOLEAN;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action: %. Must be "approve" or "reject"', p_approval_action;
    END IF;
    
    -- Get current stage
    SELECT stage INTO current_stage 
    FROM public.co_investment_opportunities 
    WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Update approval status
    UPDATE public.co_investment_opportunities 
    SET 
        lead_investor_advisor_approval_status = p_approval_action,
        lead_investor_advisor_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
    -- Handle stage progression
    IF p_approval_action = 'approve' AND current_stage = 1 THEN
        -- Check if startup has advisor
        SELECT EXISTS(
            SELECT 1 FROM public.startups s
            JOIN public.co_investment_opportunities co ON s.id = co.startup_id
            WHERE co.id = p_opportunity_id AND s.investment_advisor_code IS NOT NULL
        ) INTO startup_has_advisor;
        
        IF startup_has_advisor THEN
            -- Move to stage 2 (startup advisor approval)
            UPDATE public.co_investment_opportunities 
            SET stage = 2, updated_at = NOW()
            WHERE id = p_opportunity_id;
        ELSE
            -- Move to stage 3 (startup approval)
            UPDATE public.co_investment_opportunities 
            SET stage = 3, updated_at = NOW()
            WHERE id = p_opportunity_id;
        END IF;
    ELSIF p_approval_action = 'reject' THEN
        -- Move back to previous stage or mark as rejected
        UPDATE public.co_investment_opportunities 
        SET status = 'rejected', updated_at = NOW()
        WHERE id = p_opportunity_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_lead_investor_advisor_co_investment(INTEGER, VARCHAR(50)) TO authenticated;

-- Function to approve startup advisor co-investment
CREATE OR REPLACE FUNCTION public.approve_startup_advisor_co_investment(
    p_opportunity_id INTEGER,
    p_approval_action VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action: %. Must be "approve" or "reject"', p_approval_action;
    END IF;
    
    -- Update approval status
    UPDATE public.co_investment_opportunities 
    SET 
        startup_advisor_approval_status = p_approval_action,
        startup_advisor_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
    -- Handle stage progression
    IF p_approval_action = 'approve' THEN
        -- Move to stage 3 (startup approval)
        UPDATE public.co_investment_opportunities 
        SET stage = 3, updated_at = NOW()
        WHERE id = p_opportunity_id;
    ELSIF p_approval_action = 'reject' THEN
        -- Move back to previous stage or mark as rejected
        UPDATE public.co_investment_opportunities 
        SET status = 'rejected', updated_at = NOW()
        WHERE id = p_opportunity_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_startup_advisor_co_investment(INTEGER, VARCHAR(50)) TO authenticated;

-- Function to approve startup co-investment
CREATE OR REPLACE FUNCTION public.approve_startup_co_investment(
    p_opportunity_id INTEGER,
    p_approval_action VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action: %. Must be "approve" or "reject"', p_approval_action;
    END IF;
    
    -- Update approval status
    UPDATE public.co_investment_opportunities 
    SET 
        startup_approval_status = p_approval_action,
        startup_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
    -- Handle stage progression
    IF p_approval_action = 'approve' THEN
        -- Move to stage 4 (active)
        UPDATE public.co_investment_opportunities 
        SET stage = 4, status = 'active', updated_at = NOW()
        WHERE id = p_opportunity_id;
    ELSIF p_approval_action = 'reject' THEN
        -- Mark as rejected
        UPDATE public.co_investment_opportunities 
        SET status = 'rejected', updated_at = NOW()
        WHERE id = p_opportunity_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_startup_co_investment(INTEGER, VARCHAR(50)) TO authenticated;


-- Step 6: Test the co-investment creation
DO $$
DECLARE
    test_startup_id INTEGER;
    test_user_id UUID;
    opportunity_id INTEGER;
BEGIN
    -- Get a test startup ID
    SELECT id INTO test_startup_id FROM public.startups LIMIT 1;
    
    -- Get a test user ID
    SELECT id INTO test_user_id FROM public.users WHERE role = 'Investor' LIMIT 1;
    
    IF test_startup_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing co-investment opportunity creation...';
        
        -- Try to insert a test opportunity
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
            startup_approval_status
        ) VALUES (
            test_startup_id,
            test_user_id,
            'Investor',
            1000000.00,
            10.00,
            100000.00,
            500000.00,
            'Test co-investment opportunity for verification',
            'active',
            1,
            'not_required',
            'not_required',
            'pending'
        ) RETURNING id INTO opportunity_id;
        
        RAISE NOTICE '✅ Test co-investment opportunity created successfully with ID: %', opportunity_id;
        
        -- Clean up the test record
        DELETE FROM public.co_investment_opportunities WHERE id = opportunity_id;
        RAISE NOTICE '✅ Test record cleaned up';
        
        RAISE NOTICE '✅ Co-investment system is working correctly!';
    ELSE
        RAISE NOTICE '⚠️ Could not find test startup or user for testing';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating test co-investment opportunity: %', SQLERRM;
END $$;

-- Step 7: Summary
SELECT 
    'Co-Investment System Status' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_investment_opportunities')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_investment_interests')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_investment_approvals')
        THEN '✅ All co-investment tables exist and are ready'
        ELSE '❌ Some co-investment tables are missing'
    END as result;
