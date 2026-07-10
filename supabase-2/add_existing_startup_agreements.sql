-- ============================================================
-- Migration: add_existing_startup_agreements
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Captures the incubation deal terms (fee/equity/agreement) for
-- manually-added startups that are NOT registered on the platform, so
-- there's no real startups.id to attach a recognition_records row to.
-- Mirrors the Recognition/Incubation fields on recognition_records
-- (see CREATE_RECOGNITION_RECORDS_TABLE.sql) but keyed off report_responses
-- (the "__existing_data__" report — see lib/existingDataService.ts) instead
-- of a startup id.

CREATE TABLE IF NOT EXISTS existing_startup_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL UNIQUE REFERENCES report_responses(id) ON DELETE CASCADE,
  incubation_type TEXT,
  fee_type TEXT CHECK (fee_type IN ('Free', 'Fees', 'Equity', 'Hybrid')),
  fee_amount NUMERIC,
  shares NUMERIC,
  price_per_share NUMERIC,
  equity_allocated NUMERIC,
  investment_amount NUMERIC,
  post_money_valuation NUMERIC,
  signed_agreement_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esa_response_id ON existing_startup_agreements(response_id);

DROP TRIGGER IF EXISTS trg_esa_updated_at ON existing_startup_agreements;
CREATE TRIGGER trg_esa_updated_at
  BEFORE UPDATE ON existing_startup_agreements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE existing_startup_agreements ENABLE ROW LEVEL SECURITY;

-- Ownership chain matches report_responses: response_id -> reports.facilitator_id
-- -> user_profiles.auth_user_id = auth.uid() (same shape as rr_* policies in
-- CREATE_REPORTS_TABLES.sql).
DROP POLICY IF EXISTS esa_select_own ON existing_startup_agreements;
CREATE POLICY esa_select_own ON existing_startup_agreements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM report_responses rr
      JOIN reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS esa_insert_own ON existing_startup_agreements;
CREATE POLICY esa_insert_own ON existing_startup_agreements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM report_responses rr
      JOIN reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS esa_update_own ON existing_startup_agreements;
CREATE POLICY esa_update_own ON existing_startup_agreements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM report_responses rr
      JOIN reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM report_responses rr
      JOIN reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS esa_delete_own ON existing_startup_agreements;
CREATE POLICY esa_delete_own ON existing_startup_agreements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM report_responses rr
      JOIN reports r ON r.id = rr.report_id
      WHERE rr.id = response_id AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = r.facilitator_id AND up.auth_user_id = auth.uid()
      )
    )
  );
