-- Fix Co-Investment Approval Functions
-- This ensures the functions have the correct signature and return types

-- Step 1: Add missing timestamp columns if they don't exist
ALTER TABLE public.co_investment_opportunities 
ADD COLUMN IF NOT EXISTS lead_investor_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_approval_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Ensure all approval status columns exist and are TEXT type (not enum)
-- First, add columns if they don't exist
ALTER TABLE public.co_investment_opportunities 
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1 CHECK (stage >= 1 AND stage <= 4),
ADD COLUMN IF NOT EXISTS lead_investor_advisor_approval_status TEXT DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS startup_advisor_approval_status TEXT DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS startup_approval_status TEXT DEFAULT 'pending';

-- Convert enum columns to TEXT if they exist as enum type
DO $$
BEGIN
    -- Check and convert lead_investor_advisor_approval_status
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'lead_investor_advisor_approval_status'
        AND data_type = 'USER-DEFINED'  -- This indicates an enum type
    ) THEN
        ALTER TABLE public.co_investment_opportunities 
        ALTER COLUMN lead_investor_advisor_approval_status TYPE TEXT 
        USING lead_investor_advisor_approval_status::TEXT;
    END IF;
    
    -- Check and convert startup_advisor_approval_status
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'startup_advisor_approval_status'
        AND data_type = 'USER-DEFINED'  -- This indicates an enum type
    ) THEN
        ALTER TABLE public.co_investment_opportunities 
        ALTER COLUMN startup_advisor_approval_status TYPE TEXT 
        USING startup_advisor_approval_status::TEXT;
    END IF;
    
    -- Check and convert startup_approval_status
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'co_investment_opportunities' 
        AND column_name = 'startup_approval_status'
        AND data_type = 'USER-DEFINED'  -- This indicates an enum type
    ) THEN
        ALTER TABLE public.co_investment_opportunities 
        ALTER COLUMN startup_approval_status TYPE TEXT 
        USING startup_approval_status::TEXT;
    END IF;
END $$;

-- Step 3: Drop existing constraints if they exist, then add new ones
DO $$
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_lead_investor_advisor_status'
        AND conrelid = 'public.co_investment_opportunities'::regclass
    ) THEN
        ALTER TABLE public.co_investment_opportunities 
        DROP CONSTRAINT chk_lead_investor_advisor_status;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_startup_advisor_status'
        AND conrelid = 'public.co_investment_opportunities'::regclass
    ) THEN
        ALTER TABLE public.co_investment_opportunities 
        DROP CONSTRAINT chk_startup_advisor_status;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_startup_approval_status'
        AND conrelid = 'public.co_investment_opportunities'::regclass
    ) THEN
        ALTER TABLE public.co_investment_opportunities 
        DROP CONSTRAINT chk_startup_approval_status;
    END IF;
END $$;

-- Step 4: Add CHECK constraints to ensure valid values
ALTER TABLE public.co_investment_opportunities 
ADD CONSTRAINT chk_lead_investor_advisor_status 
CHECK (lead_investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD CONSTRAINT chk_startup_advisor_status 
CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD CONSTRAINT chk_startup_approval_status 
CHECK (startup_approval_status IN ('pending', 'approved', 'rejected'));

-- Drop all existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.approve_lead_investor_advisor_co_investment(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.approve_lead_investor_advisor_co_investment(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS public.approve_lead_investor_advisor_co_investment(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.approve_lead_investor_advisor_co_investment(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS public.approve_startup_advisor_co_investment(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.approve_startup_advisor_co_investment(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS public.approve_startup_advisor_co_investment(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.approve_startup_advisor_co_investment(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS public.approve_startup_co_investment(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.approve_startup_co_investment(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS public.approve_startup_co_investment(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.approve_startup_co_investment(VARCHAR, INTEGER);

-- Create function to approve co-investment opportunity by lead investor advisor
-- IMPORTANT: Parameter order: p_opportunity_id FIRST, p_approval_action SECOND
CREATE OR REPLACE FUNCTION public.approve_lead_investor_advisor_co_investment(
    p_opportunity_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    opportunity_record RECORD;
    new_stage INTEGER;
    new_status TEXT;
    startup_has_advisor BOOLEAN;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get opportunity details
    SELECT * INTO opportunity_record 
    FROM public.co_investment_opportunities 
    WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Set approval status
    IF p_approval_action = 'approve' THEN
        -- Check if startup has advisor to determine next stage
        SELECT (investment_advisor_code IS NOT NULL AND investment_advisor_code != '') 
        INTO startup_has_advisor
        FROM public.startups 
        WHERE id = opportunity_record.startup_id;
        
        IF startup_has_advisor THEN
            -- Move to stage 2 (startup advisor approval)
            new_stage := 2;
            new_status := 'pending';
        ELSE
            -- Move to stage 3 (startup review, no advisors)
            new_stage := 3;
            new_status := 'pending';
        END IF;
        
        -- Update the opportunity
        UPDATE public.co_investment_opportunities 
        SET 
            lead_investor_advisor_approval_status = 'approved',
            lead_investor_advisor_approval_at = NOW(),
            stage = new_stage,
            startup_advisor_approval_status = CASE 
                WHEN new_stage = 2 THEN 'pending'
                ELSE 'not_required'
            END,
            updated_at = NOW()
        WHERE id = p_opportunity_id;
    ELSE
        -- Rejection - stay at stage 1
        new_stage := 1;
        new_status := 'rejected';
        
        UPDATE public.co_investment_opportunities 
        SET 
            lead_investor_advisor_approval_status = 'rejected',
            lead_investor_advisor_approval_at = NOW(),
            updated_at = NOW()
        WHERE id = p_opportunity_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Lead investor advisor approval processed successfully',
        'opportunity_id', p_opportunity_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve co-investment opportunity by startup advisor
-- IMPORTANT: Parameter order: p_opportunity_id FIRST, p_approval_action SECOND
CREATE OR REPLACE FUNCTION public.approve_startup_advisor_co_investment(
    p_opportunity_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    opportunity_record RECORD;
    new_stage INTEGER;
    new_status TEXT;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get opportunity details
    SELECT * INTO opportunity_record 
    FROM public.co_investment_opportunities 
    WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Set approval status
    IF p_approval_action = 'approve' THEN
        -- Move to stage 3 (startup review)
        new_stage := 3;
        new_status := 'pending';
        
        UPDATE public.co_investment_opportunities 
        SET 
            startup_advisor_approval_status = 'approved',
            startup_advisor_approval_at = NOW(),
            stage = new_stage,
            updated_at = NOW()
        WHERE id = p_opportunity_id;
    ELSE
        -- Rejection - stay at stage 2
        new_stage := 2;
        new_status := 'rejected';
        
        UPDATE public.co_investment_opportunities 
        SET 
            startup_advisor_approval_status = 'rejected',
            startup_advisor_approval_at = NOW(),
            updated_at = NOW()
        WHERE id = p_opportunity_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup advisor approval processed successfully',
        'opportunity_id', p_opportunity_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve co-investment opportunity by startup
-- IMPORTANT: Parameter order: p_opportunity_id FIRST, p_approval_action SECOND
CREATE OR REPLACE FUNCTION public.approve_startup_co_investment(
    p_opportunity_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    opportunity_record RECORD;
    new_stage INTEGER;
    new_status TEXT;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get opportunity details
    SELECT * INTO opportunity_record 
    FROM public.co_investment_opportunities 
    WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Set approval status
    IF p_approval_action = 'approve' THEN
        -- Move to stage 4 (final approval)
        new_stage := 4;
        new_status := 'approved';
        
        -- Update the opportunity to Stage 4 with approved status
        -- IMPORTANT: Set status to 'active' to make it visible in public dashboards
        UPDATE public.co_investment_opportunities 
        SET 
            stage = new_stage,
            startup_approval_status = new_status,
            startup_approval_at = NOW(),
            status = 'active',  -- Ensure status is 'active' for visibility
            updated_at = NOW()
        WHERE id = p_opportunity_id;
    ELSE
        -- Rejection - stay at stage 3
        new_stage := 3;
        new_status := 'rejected';
        
        UPDATE public.co_investment_opportunities 
        SET 
            startup_approval_status = new_status,
            startup_approval_at = NOW(),
            updated_at = NOW()
        WHERE id = p_opportunity_id;
    END IF;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Startup approval processed successfully',
        'opportunity_id', p_opportunity_id,
        'action', p_approval_action,
        'new_stage', new_stage,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.approve_lead_investor_advisor_co_investment(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_startup_advisor_co_investment(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_startup_co_investment(INTEGER, TEXT) TO authenticated;

-- Verify functions were created
SELECT 
    'Function created successfully' as status,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'approve_lead_investor_advisor_co_investment',
        'approve_startup_advisor_co_investment',
        'approve_startup_co_investment'
    );

