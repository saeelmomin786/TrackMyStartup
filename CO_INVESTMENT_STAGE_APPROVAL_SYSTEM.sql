-- Co-Investment Stage-Wise Approval System
-- This script adds stage-wise approval system to co-investment opportunities
-- Following the same pattern as investment offers

-- 1. Add stage and approval columns to co_investment_opportunities table
ALTER TABLE co_investment_opportunities 
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1 CHECK (stage >= 1 AND stage <= 4),
ADD COLUMN IF NOT EXISTS lead_investor_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (lead_investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS lead_investor_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS startup_advisor_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS startup_approval_status TEXT DEFAULT 'pending' CHECK (startup_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS startup_approval_at TIMESTAMP WITH TIME ZONE;

-- 2. Add comment to explain the stage column
COMMENT ON COLUMN co_investment_opportunities.stage IS 'Co-investment workflow stage: 1=Lead investor created opportunity, 2=Lead investor advisor approved, 3=Startup advisor approved, 4=Startup approved';

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_co_investment_opportunities_stage 
ON co_investment_opportunities(stage);

CREATE INDEX IF NOT EXISTS idx_co_investment_opportunities_lead_investor_advisor_status 
ON co_investment_opportunities(lead_investor_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_co_investment_opportunities_startup_advisor_status 
ON co_investment_opportunities(startup_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_co_investment_opportunities_startup_approval_status 
ON co_investment_opportunities(startup_approval_status);

-- 4. Update existing records to have proper default values
UPDATE co_investment_opportunities 
SET 
    stage = 1,
    lead_investor_advisor_approval_status = 'not_required',
    startup_advisor_approval_status = 'not_required',
    startup_approval_status = 'pending'
WHERE 
    stage IS NULL 
    OR lead_investor_advisor_approval_status IS NULL 
    OR startup_advisor_approval_status IS NULL 
    OR startup_approval_status IS NULL;

-- 5. Create function to update co-investment opportunity stage
CREATE OR REPLACE FUNCTION update_co_investment_opportunity_stage(
    p_opportunity_id INTEGER,
    p_new_stage INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE co_investment_opportunities
    SET stage = p_new_stage,
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_co_investment_opportunity_stage(INTEGER, INTEGER) TO authenticated;

-- 6. Create function to approve co-investment opportunity by lead investor advisor
CREATE OR REPLACE FUNCTION approve_lead_investor_advisor_co_investment(
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
    SELECT * INTO opportunity_record FROM co_investment_opportunities WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        -- Check if startup has advisor
        IF EXISTS (
            SELECT 1 FROM startups 
            WHERE id = opportunity_record.startup_id 
            AND investment_advisor_code IS NOT NULL
        ) THEN
            new_stage := 2; -- Move to startup advisor approval
            new_status := 'pending_startup_advisor_approval';
        ELSE
            new_stage := 3; -- Skip to startup review
            new_status := 'pending_startup_review';
        END IF;
    ELSE
        -- Rejection - back to stage 1
        new_stage := 1;
        new_status := 'rejected';
    END IF;
    
    -- Update the opportunity
    UPDATE co_investment_opportunities 
    SET 
        stage = new_stage,
        lead_investor_advisor_approval_status = CASE 
            WHEN p_approval_action = 'approve' THEN 'approved'
            ELSE 'rejected'
        END,
        lead_investor_advisor_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
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
$$ LANGUAGE plpgsql;

-- 7. Create function to approve co-investment opportunity by startup advisor
CREATE OR REPLACE FUNCTION approve_startup_advisor_co_investment(
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
    SELECT * INTO opportunity_record FROM co_investment_opportunities WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        new_stage := 3; -- Move to startup review
        new_status := 'pending_startup_review';
    ELSE
        -- Rejection - back to stage 2
        new_stage := 2;
        new_status := 'rejected';
    END IF;
    
    -- Update the opportunity
    UPDATE co_investment_opportunities 
    SET 
        stage = new_stage,
        startup_advisor_approval_status = CASE 
            WHEN p_approval_action = 'approve' THEN 'approved'
            ELSE 'rejected'
        END,
        startup_advisor_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
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
$$ LANGUAGE plpgsql;

-- 8. Create function to approve co-investment opportunity by startup
CREATE OR REPLACE FUNCTION approve_startup_co_investment(
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
    SELECT * INTO opportunity_record FROM co_investment_opportunities WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Determine new stage and status based on action
    IF p_approval_action = 'approve' THEN
        new_stage := 4; -- Final approval
        new_status := 'approved';
    ELSE
        -- Rejection - back to stage 3
        new_stage := 3;
        new_status := 'rejected';
    END IF;
    
    -- Update the opportunity
    UPDATE co_investment_opportunities 
    SET 
        stage = new_stage,
        startup_approval_status = new_status,
        startup_approval_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
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
$$ LANGUAGE plpgsql;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION approve_lead_investor_advisor_co_investment(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_advisor_co_investment(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_startup_co_investment(INTEGER, TEXT) TO authenticated;

-- 10. Create function to handle co-investment flow logic
CREATE OR REPLACE FUNCTION handle_co_investment_flow(
    p_opportunity_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    opportunity_record RECORD;
    lead_investor_has_advisor BOOLEAN;
    startup_has_advisor BOOLEAN;
BEGIN
    -- Get opportunity details
    SELECT * INTO opportunity_record FROM co_investment_opportunities WHERE id = p_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity with ID % not found', p_opportunity_id;
    END IF;
    
    -- Check if lead investor has advisor
    SELECT (investment_advisor_code_entered IS NOT NULL) INTO lead_investor_has_advisor
    FROM users WHERE id = opportunity_record.listed_by_user_id;
    
    -- Check if startup has advisor
    SELECT (investment_advisor_code IS NOT NULL) INTO startup_has_advisor
    FROM startups WHERE id = opportunity_record.startup_id;
    
    -- Stage 1: Check if lead investor has advisor
    IF opportunity_record.stage = 1 THEN
        IF lead_investor_has_advisor THEN
            -- Keep at stage 1 for lead investor advisor approval
            UPDATE co_investment_opportunities 
            SET lead_investor_advisor_approval_status = 'pending'
            WHERE id = p_opportunity_id;
        ELSE
            -- Move to stage 2
            PERFORM update_co_investment_opportunity_stage(p_opportunity_id, 2);
        END IF;
    END IF;
    
    -- Stage 2: Check if startup has advisor
    IF opportunity_record.stage = 2 THEN
        IF startup_has_advisor THEN
            -- Keep at stage 2 for startup advisor approval
            UPDATE co_investment_opportunities 
            SET startup_advisor_approval_status = 'pending'
            WHERE id = p_opportunity_id;
        ELSE
            -- Move to stage 3
            PERFORM update_co_investment_opportunity_stage(p_opportunity_id, 3);
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_co_investment_flow(INTEGER) TO authenticated;

-- 11. Add constraints to ensure data integrity
ALTER TABLE co_investment_opportunities 
ADD CONSTRAINT check_co_investment_stage_range CHECK (stage >= 1 AND stage <= 4);

ALTER TABLE co_investment_opportunities 
ADD CONSTRAINT check_lead_investor_advisor_status CHECK (
    lead_investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')
);

ALTER TABLE co_investment_opportunities 
ADD CONSTRAINT check_startup_advisor_status_co_investment CHECK (
    startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')
);

ALTER TABLE co_investment_opportunities 
ADD CONSTRAINT check_startup_approval_status_co_investment CHECK (
    startup_approval_status IN ('pending', 'approved', 'rejected')
);

-- 12. Create trigger to automatically handle flow when opportunity is created
CREATE OR REPLACE FUNCTION trigger_handle_co_investment_flow()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle the flow logic for the new opportunity
    PERFORM handle_co_investment_flow(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS co_investment_flow_trigger ON co_investment_opportunities;
CREATE TRIGGER co_investment_flow_trigger
    AFTER INSERT ON co_investment_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_handle_co_investment_flow();

-- 13. Summary
SELECT 
    'Co-Investment Stage-Wise Approval System Setup Complete' as summary,
    'All functions, triggers, and constraints created successfully' as status;




