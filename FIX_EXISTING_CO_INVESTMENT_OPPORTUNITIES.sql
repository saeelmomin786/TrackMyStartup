-- Fix existing co-investment opportunities that may have incorrect stage/approval status
-- This script ensures all existing co-investment opportunities are properly set based on advisor presence

-- First, update opportunities where lead investor has advisor but status is 'not_required'
UPDATE co_investment_opportunities
SET 
    lead_investor_advisor_approval_status = 'pending',
    stage = 1
WHERE 
    stage = 1
    AND lead_investor_advisor_approval_status = 'not_required'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = co_investment_opportunities.listed_by_user_id
        AND (
            users.investment_advisor_code_entered IS NOT NULL 
            OR users.investment_advisor_code IS NOT NULL
        )
    );

-- Update opportunities that incorrectly progressed to stage 2/3 when lead investor has advisor
UPDATE co_investment_opportunities
SET 
    lead_investor_advisor_approval_status = 'pending',
    stage = 1
WHERE 
    stage IN (2, 3)
    AND lead_investor_advisor_approval_status = 'not_required'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = co_investment_opportunities.listed_by_user_id
        AND (
            users.investment_advisor_code_entered IS NOT NULL 
            OR users.investment_advisor_code IS NOT NULL
        )
    )
    AND lead_investor_advisor_approval_status != 'approved';

-- Verify the results
SELECT 
    id,
    startup_id,
    listed_by_user_id,
    stage,
    lead_investor_advisor_approval_status,
    startup_advisor_approval_status,
    startup_approval_status,
    status,
    created_at
FROM co_investment_opportunities
WHERE status = 'active'
ORDER BY created_at DESC;

