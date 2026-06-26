-- ============================================================
-- Migration: add_report_answer_history
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Create the history table (skipped if already exists)
CREATE TABLE IF NOT EXISTS report_answer_history (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id  uuid        NOT NULL REFERENCES report_responses(id) ON DELETE CASCADE,
  question_id  uuid        NOT NULL REFERENCES report_questions(id) ON DELETE CASCADE,
  answer       text        NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes for fast look-ups (skipped if already exist)
CREATE INDEX IF NOT EXISTS idx_rah_response_id  ON report_answer_history(response_id);
CREATE INDEX IF NOT EXISTS idx_rah_question_id  ON report_answer_history(question_id);
CREATE INDEX IF NOT EXISTS idx_rah_submitted_at ON report_answer_history(submitted_at);

-- 3. Enable Row Level Security (safe to run again)
ALTER TABLE report_answer_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: facilitators can read history for reports they own
--    Drop first so re-running this file never errors
DROP POLICY IF EXISTS "facilitators can read answer history" ON report_answer_history;
CREATE POLICY "facilitators can read answer history"
  ON report_answer_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM report_responses rr
      JOIN reports r ON r.id = rr.report_id
      WHERE rr.id = report_answer_history.response_id
        AND r.facilitator_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 5. RLS Policy: any authenticated user can insert
DROP POLICY IF EXISTS "authenticated users can insert answer history" ON report_answer_history;
CREATE POLICY "authenticated users can insert answer history"
  ON report_answer_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
