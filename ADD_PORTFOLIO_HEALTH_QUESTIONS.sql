-- =====================================================
-- PORTFOLIO HEALTH CHART QUESTIONS
-- =====================================================
-- Run this in your Supabase SQL Editor to seed the
-- questions needed for the Portfolio Health dashboard charts.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- =====================================================

INSERT INTO public.application_question_bank
  (question_text, category, question_type, status, created_by)
VALUES

  -- ── Chart 1: Employee Count ──────────────────────────────────
  -- Note: 'How many employees does your startup have?' already exists.
  -- Keeping as-is; the chart keyword-matches on 'employees'.

  -- ── Chart 2: Patents Filed ───────────────────────────────────
  ('How many patents has your startup filed?',
   'Technology', 'number', 'approved', NULL),

  -- ── Chart 3: Founder Gender Ratio ────────────────────────────
  ('How many male founders does your startup have?',
   'Team', 'number', 'approved', NULL),

  ('How many female founders does your startup have?',
   'Team', 'number', 'approved', NULL),

  -- ── Chart 4: Accumulated Growth ──────────────────────────────
  -- Answer format for YoY: {"2024": 150000, "2025": 300000, "2026": 500000}
  ('What is your year-on-year revenue growth? (JSON format: {"2024": value, "2025": value, "2026": value})',
   'Growth', 'textarea', 'approved', NULL),

  -- Answer format for MoM: {"Jan": 50000, "Feb": 60000, "Mar": 70000, ...}
  ('What is your month-on-month revenue growth? (JSON format: {"Jan": value, "Feb": value, ...})',
   'Growth', 'textarea', 'approved', NULL),

  -- ── Additional Numeric Questions (for "Add More Charts") ─────
  ('What is your monthly active user count?',
   'Growth', 'number', 'approved', NULL),

  ('How many customers do you currently serve?',
   'Market', 'number', 'approved', NULL),

  ('What is your Net Promoter Score (NPS)?',
   'Customer', 'number', 'approved', NULL),

  ('How many countries do you currently operate in?',
   'Market', 'number', 'approved', NULL),

  ('What is your customer acquisition cost (CAC) in USD?',
   'Financial', 'number', 'approved', NULL),

  ('What is your monthly recurring revenue (MRR) in USD?',
   'Financial', 'number', 'approved', NULL),

  ('What is your annual recurring revenue (ARR) in USD?',
   'Financial', 'number', 'approved', NULL),

  ('How many partnerships or MOUs have you signed?',
   'Partnerships', 'number', 'approved', NULL),

  ('What is your gross margin percentage?',
   'Financial', 'number', 'approved', NULL),

  ('How many products or SKUs does your startup offer?',
   'Product', 'number', 'approved', NULL)

ON CONFLICT DO NOTHING;

SELECT 'Portfolio Health questions added successfully!' AS status;
