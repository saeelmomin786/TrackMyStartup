-- Reports Tables Migration
-- Creates tables to persist startup reports, questions, responses, and answers
-- Run this in Supabase SQL Editor

-- 1. Reports (report definitions)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  program_name TEXT NOT NULL,
  report_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_facilitator 
  ON public.reports(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_reports_program_year 
  ON public.reports(facilitator_id, program_name, report_year);

-- 2. Report Questions (questions per report)
CREATE TABLE IF NOT EXISTS public.report_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (
    question_type IN ('text', 'textarea', 'number', 'date', 'select', 'multiselect')
  ),
  options JSONB, -- array of strings for select/multiselect
  is_from_pool BOOLEAN NOT NULL DEFAULT FALSE,
  pool_question_id TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_questions_report 
  ON public.report_questions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_questions_position 
  ON public.report_questions(report_id, position);

-- 3. Report Responses (per-startup response tracking)
CREATE TABLE IF NOT EXISTS public.report_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  startup_id TEXT NOT NULL, -- String ID from facilitator portfolio
  startup_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (
    status IN ('not_submitted', 'submitted')
  ),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, startup_id)
);

CREATE INDEX IF NOT EXISTS idx_report_responses_report 
  ON public.report_responses(report_id);
CREATE INDEX IF NOT EXISTS idx_report_responses_status 
  ON public.report_responses(report_id, status);
CREATE INDEX IF NOT EXISTS idx_report_responses_startup 
  ON public.report_responses(startup_id);

-- 4. Report Answers (answers per response/question)
CREATE TABLE IF NOT EXISTS public.report_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.report_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.report_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL, -- string or array stored as JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (response_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_report_answers_response 
  ON public.report_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_report_answers_question 
  ON public.report_answers(question_id);

-- 5. Updated_at triggers
DROP TRIGGER IF EXISTS trg_rr_updated_at ON public.report_responses;
CREATE TRIGGER trg_rr_updated_at 
  BEFORE UPDATE ON public.report_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ra_updated_at ON public.report_answers;
CREATE TRIGGER trg_ra_updated_at 
  BEFORE UPDATE ON public.report_answers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_answers ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for reports
DROP POLICY IF EXISTS rpt_select_own ON public.reports;
CREATE POLICY rpt_select_own ON public.reports 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.reports.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rpt_insert_own ON public.reports;
CREATE POLICY rpt_insert_own ON public.reports 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.reports.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rpt_update_own ON public.reports;
CREATE POLICY rpt_update_own ON public.reports 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.reports.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.reports.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rpt_delete_own ON public.reports;
CREATE POLICY rpt_delete_own ON public.reports 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.reports.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

-- 8. RLS Policies for report_questions (via parent report)
DROP POLICY IF EXISTS rq_select_own ON public.report_questions;
CREATE POLICY rq_select_own ON public.report_questions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rq_insert_own ON public.report_questions;
CREATE POLICY rq_insert_own ON public.report_questions 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rq_update_own ON public.report_questions;
CREATE POLICY rq_update_own ON public.report_questions 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rq_delete_own ON public.report_questions;
CREATE POLICY rq_delete_own ON public.report_questions 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

-- 9. RLS Policies for report_responses (via parent report)
DROP POLICY IF EXISTS rr_select_own ON public.report_responses;
CREATE POLICY rr_select_own ON public.report_responses 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rr_insert_own ON public.report_responses;
CREATE POLICY rr_insert_own ON public.report_responses 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rr_update_own ON public.report_responses;
CREATE POLICY rr_update_own ON public.report_responses 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rr_delete_own ON public.report_responses;
CREATE POLICY rr_delete_own ON public.report_responses 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

-- 10. RLS Policies for report_answers (via response → report)
DROP POLICY IF EXISTS ra_select_own ON public.report_answers;
CREATE POLICY ra_select_own ON public.report_answers 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.report_responses rr
      JOIN public.reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS ra_insert_own ON public.report_answers;
CREATE POLICY ra_insert_own ON public.report_answers 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.report_responses rr
      JOIN public.reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS ra_update_own ON public.report_answers;
CREATE POLICY ra_update_own ON public.report_answers 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.report_responses rr
      JOIN public.reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.report_responses rr
      JOIN public.reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS ra_delete_own ON public.report_answers;
CREATE POLICY ra_delete_own ON public.report_answers 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.report_responses rr
      JOIN public.reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

-- 11. Verification queries
SELECT 'Reports tables created successfully!' AS status;

SELECT 
  tablename, 
  COUNT(*) FILTER (WHERE schemaname = 'public') AS index_count
FROM pg_indexes 
WHERE tablename LIKE 'report%' 
GROUP BY tablename;

-- Sample query to test report structure
SELECT 
  r.id AS report_id,
  r.title,
  r.program_name,
  r.report_year,
  COUNT(DISTINCT rq.id) AS question_count,
  COUNT(DISTINCT rr.id) AS response_count,
  COUNT(DISTINCT rr.id) FILTER (WHERE rr.status = 'submitted') AS submitted_count
FROM public.reports r
LEFT JOIN public.report_questions rq ON rq.report_id = r.id
LEFT JOIN public.report_responses rr ON rr.report_id = r.id
WHERE r.facilitator_id = auth.uid()
GROUP BY r.id, r.title, r.program_name, r.report_year
ORDER BY r.created_at DESC;
