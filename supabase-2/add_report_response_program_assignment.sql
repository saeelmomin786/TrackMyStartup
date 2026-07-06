-- ============================================================
-- Migration: add_report_response_program_assignment
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Lets a manually-added / bulk-uploaded startup (stored under the special
-- "__existing_data__" report — see lib/existingDataService.ts) be assigned
-- to a real program. Once assigned, its uploaded data is merged into that
-- program's "+ Create Report" output alongside live-tracked portfolio startups.

ALTER TABLE report_responses
  ADD COLUMN IF NOT EXISTS assigned_program text;

CREATE INDEX IF NOT EXISTS idx_rr_assigned_program
  ON report_responses(assigned_program);

-- No new RLS policy needed: report_responses already has an UPDATE policy
-- (rr_update_own, see CREATE_REPORTS_TABLES.sql) scoped to the facilitator
-- who owns the parent report, which covers updates to this new column.
