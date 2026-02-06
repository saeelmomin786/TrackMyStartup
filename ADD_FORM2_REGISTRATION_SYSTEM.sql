-- =====================================================
-- ADD FORM 2 REGISTRATION SYSTEM
-- =====================================================
-- Two-stage application process:
-- Form 1 (Initial Application) → Shortlist → Form 2 (Detailed Registration) → Final Approval

-- =====================================================
-- STEP 1: Add Form 2 configuration to opportunities
-- =====================================================

-- Add columns to incubation_opportunities table
ALTER TABLE public.incubation_opportunities
ADD COLUMN IF NOT EXISTS has_form2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS form2_title TEXT,
ADD COLUMN IF NOT EXISTS form2_description TEXT,
ADD COLUMN IF NOT EXISTS form2_created_at TIMESTAMPTZ;

COMMENT ON COLUMN public.incubation_opportunities.has_form2 
IS 'Indicates if this opportunity requires a second registration form for shortlisted applicants';

COMMENT ON COLUMN public.incubation_opportunities.form2_title 
IS 'Title/name of the Form 2 (e.g., "Detailed Registration Form", "Due Diligence Questionnaire")';

COMMENT ON COLUMN public.incubation_opportunities.form2_description 
IS 'Instructions/description shown to startups when they need to fill Form 2';

-- =====================================================
-- STEP 2: Create Form 2 Questions Table (same structure as application questions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.incubation_opportunity_form2_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.incubation_opportunities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.application_question_bank(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT TRUE,
  selection_type TEXT, -- 'single' | 'multiple' | null
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(opportunity_id, question_id)
);

COMMENT ON TABLE public.incubation_opportunity_form2_questions 
IS 'Form 2 questions for shortlisted applicants (same structure as initial application questions)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form2_questions_opportunity 
  ON public.incubation_opportunity_form2_questions(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_form2_questions_order 
  ON public.incubation_opportunity_form2_questions(opportunity_id, display_order);

-- =====================================================
-- STEP 3: Track Form 2 status in applications
-- =====================================================

ALTER TABLE public.opportunity_applications
ADD COLUMN IF NOT EXISTS form2_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS form2_status TEXT DEFAULT 'not_requested', 
  -- 'not_requested' | 'pending' | 'submitted' | 'under_review'
ADD COLUMN IF NOT EXISTS form2_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS form2_submitted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.opportunity_applications.form2_requested 
IS 'Whether Form 2 has been sent to this startup';

COMMENT ON COLUMN public.opportunity_applications.form2_status 
IS 'Status of Form 2: not_requested (default), pending (sent but not submitted), submitted (startup filled it), under_review (facilitator reviewing)';

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_applications_form2_pending 
  ON public.opportunity_applications(opportunity_id, form2_status) 
  WHERE form2_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_applications_form2_submitted 
  ON public.opportunity_applications(opportunity_id, form2_status) 
  WHERE form2_status = 'submitted';

-- =====================================================
-- STEP 4: Create Form 2 Responses Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.opportunity_form2_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.application_question_bank(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id, question_id) -- One answer per question per application
);

COMMENT ON TABLE public.opportunity_form2_responses 
IS 'Responses to Form 2 questions submitted by shortlisted startups';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form2_responses_application 
  ON public.opportunity_form2_responses(application_id);

CREATE INDEX IF NOT EXISTS idx_form2_responses_question 
  ON public.opportunity_form2_responses(question_id);

-- =====================================================
-- STEP 5: Add RLS Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.incubation_opportunity_form2_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_form2_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Facilitators can manage Form 2 questions for their opportunities
CREATE POLICY "Facilitators can manage form2 questions"
  ON public.incubation_opportunity_form2_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.incubation_opportunities io
      WHERE io.id = incubation_opportunity_form2_questions.opportunity_id
        AND io.facilitator_id = auth.uid()
    )
  );

-- Policy: Startups can view Form 2 questions if they have been requested
CREATE POLICY "Startups can view their form2 questions"
  ON public.incubation_opportunity_form2_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunity_applications oa
      JOIN public.startups s ON oa.startup_id = s.id
      WHERE oa.opportunity_id = incubation_opportunity_form2_questions.opportunity_id
        AND s.user_id = auth.uid()
        AND oa.form2_requested = TRUE
    )
  );

-- Policy: Facilitators can view all Form 2 responses for their opportunities
CREATE POLICY "Facilitators can view form2 responses"
  ON public.opportunity_form2_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.opportunity_applications oa
      JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
      WHERE oa.id = opportunity_form2_responses.application_id
        AND io.facilitator_id = auth.uid()
    )
  );

-- Policy: Startups can insert/update their own Form 2 responses
CREATE POLICY "Startups can manage their form2 responses"
  ON public.opportunity_form2_responses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM public.opportunity_applications oa
      JOIN public.startups s ON oa.startup_id = s.id
      WHERE oa.id = opportunity_form2_responses.application_id
        AND s.user_id = auth.uid()
        AND oa.form2_requested = TRUE
    )
  );

-- =====================================================
-- STEP 6: Create helper functions
-- =====================================================

-- Function to send Form 2 to shortlisted applications
CREATE OR REPLACE FUNCTION public.send_form2_to_shortlisted(
  p_opportunity_id UUID
)
RETURNS TABLE (
  updated_count INTEGER,
  application_ids UUID[]
) AS $$
DECLARE
  v_count INTEGER;
  v_ids UUID[];
BEGIN
  -- Update all shortlisted pending applications
  WITH updated AS (
    UPDATE public.opportunity_applications
    SET 
      form2_requested = TRUE,
      form2_status = 'pending',
      form2_requested_at = NOW()
    WHERE opportunity_id = p_opportunity_id
      AND is_shortlisted = TRUE
      AND status = 'pending'
      AND form2_requested = FALSE
    RETURNING id
  )
  SELECT COUNT(*), ARRAY_AGG(id)
  INTO v_count, v_ids
  FROM updated;
  
  RETURN QUERY SELECT v_count, v_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.send_form2_to_shortlisted 
IS 'Sends Form 2 to all shortlisted applications for a given opportunity';

-- Function to get Form 2 statistics for an opportunity
CREATE OR REPLACE FUNCTION public.get_form2_statistics(
  p_opportunity_id UUID
)
RETURNS TABLE (
  total_shortlisted INTEGER,
  form2_sent INTEGER,
  form2_pending INTEGER,
  form2_submitted INTEGER,
  form2_under_review INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_shortlisted,
    COUNT(CASE WHEN form2_requested = TRUE THEN 1 END)::INTEGER AS form2_sent,
    COUNT(CASE WHEN form2_status = 'pending' THEN 1 END)::INTEGER AS form2_pending,
    COUNT(CASE WHEN form2_status = 'submitted' THEN 1 END)::INTEGER AS form2_submitted,
    COUNT(CASE WHEN form2_status = 'under_review' THEN 1 END)::INTEGER AS form2_under_review
  FROM public.opportunity_applications
  WHERE opportunity_id = p_opportunity_id
    AND is_shortlisted = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Verification Queries
-- =====================================================

-- Check if columns were added to incubation_opportunities
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'incubation_opportunities'
  AND column_name IN ('has_form2', 'form2_title', 'form2_description');

-- Check if columns were added to opportunity_applications
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'opportunity_applications'
  AND column_name IN ('form2_requested', 'form2_status', 'form2_requested_at', 'form2_submitted_at');

-- Verify new tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('incubation_opportunity_form2_questions', 'opportunity_form2_responses');

-- Check indexes
SELECT 
  indexname, 
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND (tablename LIKE '%form2%' OR indexname LIKE '%form2%');

-- Check RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual IS NOT NULL as has_using_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('opportunity_form2_questions', 'opportunity_form2_responses');

-- =====================================================
-- STEP 8: Sample Data Structure
-- =====================================================

-- Sample: How to create Form 2 questions for an opportunity
-- (Uncomment and modify with actual opportunity_id to test)

/*
-- Example: Add Form 2 to an opportunity
UPDATE public.incubation_opportunities
SET 
  has_form2 = TRUE,
  form2_title = 'Detailed Registration Form',
  form2_description = 'Please provide detailed information for final evaluation',
  form2_created_at = NOW()
WHERE id = 'YOUR_OPPORTUNITY_ID';

-- Example: Add Form 2 questions
INSERT INTO public.incubation_opportunity_form2_questions 
  (opportunity_id, question_id, is_required, selection_type, display_order)
VALUES
  ('YOUR_OPPORTUNITY_ID', 'QUESTION_ID_1', TRUE, NULL, 1),
  ('YOUR_OPPORTUNITY_ID', 'QUESTION_ID_2', TRUE, NULL, 2),
  ('YOUR_OPPORTUNITY_ID', 'QUESTION_ID_3', TRUE, NULL, 3);
*/

-- =====================================================
-- STEP 9: Usage Examples
-- =====================================================

-- Query: Get all Form 2 questions for an opportunity
/*
SELECT 
  q.id,
  qb.question_text,
  qb.question_type,
  q.is_required,
  q.display_order
FROM public.incubation_opportunity_form2_questions q
JOIN public.application_question_bank qb ON q.question_id = qb.id
WHERE opportunity_id = 'YOUR_OPPORTUNITY_ID'
ORDER BY display_order;
*/

-- Query: Send Form 2 to all shortlisted startups
/*
SELECT * FROM public.send_form2_to_shortlisted('YOUR_OPPORTUNITY_ID');
*/

-- Query: Get Form 2 statistics
/*
SELECT * FROM public.get_form2_statistics('YOUR_OPPORTUNITY_ID');
*/

-- Query: Get all applications waiting for Form 2 submission
/*
SELECT 
  oa.id,
  s.name as startup_name,
  oa.form2_status,
  oa.form2_requested_at,
  DATE_PART('day', NOW() - oa.form2_requested_at) as days_pending
FROM public.opportunity_applications oa
JOIN public.startups s ON oa.startup_id = s.id
WHERE oa.opportunity_id = 'YOUR_OPPORTUNITY_ID'
  AND oa.form2_status = 'pending'
ORDER BY oa.form2_requested_at;
*/

-- Query: Get Form 2 responses for a specific application
/*
SELECT 
  q.question_text,
  q.question_type,
  r.answer_text,
  r.answer_file_url,
  r.created_at as answered_at
FROM public.opportunity_form2_responses r
JOIN public.opportunity_form2_questions q ON r.question_id = q.id
WHERE r.application_id = 'YOUR_APPLICATION_ID'
ORDER BY q.order_index;
*/

-- =====================================================
-- STEP 10: Summary Report
-- =====================================================

SELECT 
  '✅ FORM 2 SYSTEM CREATED' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%form2%') as new_tables_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE column_name LIKE '%form2%') as new_columns_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE '%form2%') as new_indexes_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE '%form2%') as rls_policies_count;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- Uncomment only if you need to remove everything

/*
-- Drop functions
DROP FUNCTION IF EXISTS public.send_form2_to_shortlisted(UUID);
DROP FUNCTION IF EXISTS public.get_form2_statistics(UUID);

-- Drop tables (CASCADE will remove dependent objects)
DROP TABLE IF EXISTS public.opportunity_form2_responses CASCADE;
DROP TABLE IF EXISTS public.incubation_opportunity_form2_questions CASCADE;

-- Remove columns from opportunity_applications
ALTER TABLE public.opportunity_applications 
  DROP COLUMN IF EXISTS form2_requested,
  DROP COLUMN IF EXISTS form2_status,
  DROP COLUMN IF EXISTS form2_requested_at,
  DROP COLUMN IF EXISTS form2_submitted_at;

-- Remove columns from incubation_opportunities
ALTER TABLE public.incubation_opportunities
  DROP COLUMN IF EXISTS has_form2,
  DROP COLUMN IF EXISTS form2_title,
  DROP COLUMN IF EXISTS form2_description,
  DROP COLUMN IF EXISTS form2_created_at;

-- Drop indexes (if not already dropped with tables)
DROP INDEX IF EXISTS idx_form2_questions_opportunity;
DROP INDEX IF EXISTS idx_form2_questions_order;
DROP INDEX IF EXISTS idx_applications_form2_pending;
DROP INDEX IF EXISTS idx_applications_form2_submitted;
DROP INDEX IF EXISTS idx_form2_responses_application;
DROP INDEX IF EXISTS idx_form2_responses_question;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
