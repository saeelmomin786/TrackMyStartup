-- =====================================================
-- FUNDRAISING ONE-PAGER FIELDS
-- =====================================================
-- This script adds columns to store the fundraising one‑pager
-- answers directly in the fundraising_details table.
-- Idempotent: safe to run multiple times.
-- =====================================================

ALTER TABLE public.fundraising_details
  ADD COLUMN IF NOT EXISTS one_pager_date DATE,
  ADD COLUMN IF NOT EXISTS one_pager_one_liner TEXT,
  ADD COLUMN IF NOT EXISTS problem_statement TEXT,
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS growth_challenge TEXT,
  ADD COLUMN IF NOT EXISTS usp TEXT,
  ADD COLUMN IF NOT EXISTS competition TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS tam TEXT,
  ADD COLUMN IF NOT EXISTS sam TEXT,
  ADD COLUMN IF NOT EXISTS som TEXT,
  ADD COLUMN IF NOT EXISTS traction TEXT,
  ADD COLUMN IF NOT EXISTS ask_utilization TEXT,
  ADD COLUMN IF NOT EXISTS revenue_this_year TEXT,
  ADD COLUMN IF NOT EXISTS revenue_last_year TEXT,
  ADD COLUMN IF NOT EXISTS revenue_next_month TEXT,
  ADD COLUMN IF NOT EXISTS gross_profit_margin TEXT,
  ADD COLUMN IF NOT EXISTS net_profit_margin TEXT,
  ADD COLUMN IF NOT EXISTS fixed_cost_last_3_months TEXT;


