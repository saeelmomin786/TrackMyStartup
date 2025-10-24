-- Add missing approval columns to investment_offers table
-- These columns are needed for the approval workflow

-- 1. Add investor advisor approval columns
ALTER TABLE investment_offers 
ADD COLUMN IF NOT EXISTS investor_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS investor_advisor_approval_at TIMESTAMP WITH TIME ZONE;

-- 2. Add startup advisor approval columns  
ALTER TABLE investment_offers 
ADD COLUMN IF NOT EXISTS startup_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (startup_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS startup_advisor_approval_at TIMESTAMP WITH TIME ZONE;

-- 3. Add stage column for workflow management
ALTER TABLE investment_offers 
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1 CHECK (stage >= 1 AND stage <= 4);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investment_offers_investor_advisor_status 
ON investment_offers(investor_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_investment_offers_startup_advisor_status 
ON investment_offers(startup_advisor_approval_status);

CREATE INDEX IF NOT EXISTS idx_investment_offers_stage 
ON investment_offers(stage);

-- 5. Update existing records to have proper default values
UPDATE investment_offers 
SET 
    investor_advisor_approval_status = 'not_required',
    startup_advisor_approval_status = 'not_required',
    stage = 1
WHERE 
    investor_advisor_approval_status IS NULL 
    OR startup_advisor_approval_status IS NULL 
    OR stage IS NULL;
