-- ============================================================
-- Migration: add_pitch_deck_viewed_at
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Lets facilitators see when they last viewed a startup's pitch deck in
-- Intake Management, so they can tell which applications they've already
-- reviewed.

ALTER TABLE opportunity_applications
  ADD COLUMN IF NOT EXISTS pitch_deck_viewed_at timestamptz;
