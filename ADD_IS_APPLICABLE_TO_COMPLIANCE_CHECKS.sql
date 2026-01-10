-- =====================================================
-- ADD IS_APPLICABLE FIELD TO COMPLIANCE_CHECKS TABLE
-- =====================================================
-- This adds a toggle field to indicate if a compliance task
-- is applicable to the startup or not
-- =====================================================

-- Add is_applicable column to compliance_checks table
-- Default to true (all existing tasks are applicable)
ALTER TABLE public.compliance_checks 
ADD COLUMN IF NOT EXISTS is_applicable BOOLEAN DEFAULT true NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_compliance_checks_is_applicable 
ON public.compliance_checks(startup_id, is_applicable);

-- Update existing records to be applicable by default
UPDATE public.compliance_checks 
SET is_applicable = true 
WHERE is_applicable IS NULL;

-- Add comment to the column
COMMENT ON COLUMN public.compliance_checks.is_applicable IS 
'Indicates whether this compliance task is applicable to the startup. If false, the task will not be counted in compliance metrics.';



