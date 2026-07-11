-- ============================================================
-- Migration: add_guest_application_status
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Lets facilitators Shortlist/Reject unregistered (guest) applications in
-- Intake Management the same way they can for registered ones. There's no
-- "Approve"/accept for a guest row — approving requires a real startup
-- account, so that action is a "send registration invite" email instead
-- (see the existing guest-application-confirmation email type in
-- lib/vercel-api/handlers/invite.ts) — the application only becomes fully
-- approvable once claimed into a real opportunity_applications row.

ALTER TABLE guest_opportunity_applications
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'shortlisted', 'rejected'));

-- Facilitators can update (Shortlist/Reject) guest rows for their own
-- opportunities. Additive alongside the existing select policy — does not
-- touch the applicant's own-email select/update policies.
DROP POLICY IF EXISTS facilitator_update_guest_applications ON guest_opportunity_applications;
CREATE POLICY facilitator_update_guest_applications ON guest_opportunity_applications
  FOR UPDATE TO authenticated
  USING (
    opportunity_id IN (
      SELECT id FROM public.incubation_opportunities WHERE facilitator_id = auth.uid()
    )
  )
  WITH CHECK (
    opportunity_id IN (
      SELECT id FROM public.incubation_opportunities WHERE facilitator_id = auth.uid()
    )
  );
