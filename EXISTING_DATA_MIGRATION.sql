-- Existing Data Feature Migration
-- Run this in Supabase SQL Editor
-- This migration supports storing existing/historical startup data uploaded via CSV.
-- No new tables are needed — the feature reuses reports, report_questions,
-- report_responses, and report_answers with program_name = '__existing_data__'.
--
-- The only addition is a helper index for fast lookup of the special report.

-- 1. Index for fast lookup of the existing-data special report per facilitator
CREATE INDEX IF NOT EXISTS idx_reports_existing_data
  ON public.reports(facilitator_id, program_name)
  WHERE program_name = '__existing_data__';

-- 2. Index on startup_id for linking to future startup accounts (by email)
CREATE INDEX IF NOT EXISTS idx_report_responses_startup_id_text
  ON public.report_responses(startup_id);

-- 3. Optional: index to speed up lookups by program_name across all reports
CREATE INDEX IF NOT EXISTS idx_reports_program_name
  ON public.reports(facilitator_id, program_name);

-- Verification
SELECT 'Existing Data migration applied successfully!' AS status;
