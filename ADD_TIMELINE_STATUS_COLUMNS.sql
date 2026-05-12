-- Add facilitator-managed timeline and startup_status columns to opportunity_applications
-- Run this once in your Supabase SQL editor

ALTER TABLE opportunity_applications
  ADD COLUMN IF NOT EXISTS timeline TEXT,
  ADD COLUMN IF NOT EXISTS startup_status TEXT CHECK (startup_status IN ('active', 'graduated'));

-- Optional: add an index if you plan to filter/sort by these
CREATE INDEX IF NOT EXISTS idx_opp_apps_timeline       ON opportunity_applications (timeline);
CREATE INDEX IF NOT EXISTS idx_opp_apps_startup_status ON opportunity_applications (startup_status);
