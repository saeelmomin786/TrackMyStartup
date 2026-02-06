-- Create reports_mandate table for report tracking
-- Stores only report metadata and target startups (no question duplication)

DROP TABLE IF EXISTS public.reports_mandate CASCADE;

CREATE TABLE IF NOT EXISTS public.reports_mandate (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facilitator_id UUID NOT NULL,
  title TEXT NOT NULL,
  program_name TEXT NOT NULL,
  program_list JSONB,
  question_ids JSONB NOT NULL,
  target_startups JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('existing', 'startup')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_mandate_facilitator_id 
ON public.reports_mandate(facilitator_id);

-- DISABLE RLS FOR NOW - APP WILL ENFORCE SECURITY
ALTER TABLE public.reports_mandate DISABLE ROW LEVEL SECURITY;

-- Re-enable with permissive policy (for testing)
ALTER TABLE public.reports_mandate ENABLE ROW LEVEL SECURITY;

-- Allow ALL authenticated users full access (app filters by facilitator_id)
CREATE POLICY "reports_mandate_all_authenticated"
ON public.reports_mandate
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
