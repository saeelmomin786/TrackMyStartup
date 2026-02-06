-- Add priority column to intake_crm_status_map table
-- This allows saving and editing priority levels for applications in the CRM board

ALTER TABLE public.intake_crm_status_map 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS idx_intake_crm_status_map_priority 
  ON public.intake_crm_status_map(facilitator_id, priority);

-- Example update to test:
-- UPDATE public.intake_crm_status_map SET priority = 'high' WHERE id = '<some-id>';
