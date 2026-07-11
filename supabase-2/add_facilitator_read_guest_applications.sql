-- ============================================================
-- Migration: add_facilitator_read_guest_applications
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Lets facilitators see guest (not-yet-registered) applications in Intake
-- Management immediately, tagged as "Unregistered" — rather than staying
-- invisible until the applicant creates an account. Purely additive: sits
-- alongside the existing guest_apps_select_own policy (applicant reading
-- their own row by email) — Postgres ORs multiple permissive SELECT
-- policies together, so this doesn't narrow or replace that one.

DROP POLICY IF EXISTS facilitator_read_guest_applications ON guest_opportunity_applications;
CREATE POLICY facilitator_read_guest_applications ON guest_opportunity_applications
  FOR SELECT TO authenticated
  USING (
    opportunity_id IN (
      SELECT id FROM public.incubation_opportunities WHERE facilitator_id = auth.uid()
    )
  );
