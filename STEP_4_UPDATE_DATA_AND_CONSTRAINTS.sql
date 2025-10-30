-- STEP 4: Update existing data and add constraints
-- Update existing offers to have proper stage values
UPDATE investment_offers 
SET stage = 1 
WHERE stage IS NULL;

-- Add constraints to ensure data integrity (only if they don't exist)
DO $$ 
BEGIN
    -- Add stage range constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_stage_range'
    ) THEN
        ALTER TABLE investment_offers 
        ADD CONSTRAINT check_stage_range CHECK (stage >= 1 AND stage <= 4);
    END IF;
    
    -- Add investor advisor status constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_investor_advisor_status'
    ) THEN
        ALTER TABLE investment_offers 
        ADD CONSTRAINT check_investor_advisor_status CHECK (
            investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')
        );
    END IF;
    
    -- Add startup advisor status constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_startup_advisor_status'
    ) THEN
        ALTER TABLE investment_offers 
        ADD CONSTRAINT check_startup_advisor_status CHECK (
            startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')
        );
    END IF;
END $$;








