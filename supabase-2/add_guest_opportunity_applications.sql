-- ============================================================
-- Migration: add_guest_opportunity_applications
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Lets a startup fill out and submit a program application WITHOUT creating
-- an account first. If they later register with the same email, this data
-- is copied into their real application (see claim logic in
-- components/CompleteRegistrationPage.tsx) and this row is marked claimed
-- (never deleted — kept as an audit trail).

CREATE TABLE IF NOT EXISTS guest_opportunity_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.incubation_opportunities(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  startup_name TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  pitch_deck_url TEXT,
  pitch_video_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  claimed_startup_id INTEGER REFERENCES public.startups(id),
  UNIQUE(opportunity_id, email)
);

CREATE INDEX IF NOT EXISTS idx_goa_opportunity_id ON guest_opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_goa_email ON guest_opportunity_applications(email);
CREATE INDEX IF NOT EXISTS idx_goa_unclaimed ON guest_opportunity_applications(email) WHERE claimed_at IS NULL;

ALTER TABLE guest_opportunity_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including logged-out visitors) can submit an application. No
-- spam/abuse protection for this MVP — can add rate-limiting later if
-- needed.
DROP POLICY IF EXISTS guest_apps_insert ON guest_opportunity_applications;
CREATE POLICY guest_apps_insert ON guest_opportunity_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Deliberately NO update policy for anon: an anonymous request has no
-- verifiable identity, so allowing anon UPDATE (even gated on
-- claimed_at IS NULL) would let anyone overwrite someone else's pending
-- guest application. The client-side submit flow (PublicProgramView.tsx)
-- handles the UNIQUE(opportunity_id, email) constraint by catching a
-- duplicate-submission error and telling the visitor they've already
-- applied with that email, rather than silently upserting.

-- A newly-registered user can read/update only rows matching their own
-- email (via the JWT claim, not a table join), to power the
-- claim-on-registration flow in CompleteRegistrationPage.tsx.
DROP POLICY IF EXISTS guest_apps_select_own ON guest_opportunity_applications;
CREATE POLICY guest_apps_select_own ON guest_opportunity_applications
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS guest_apps_update_own ON guest_opportunity_applications;
CREATE POLICY guest_apps_update_own ON guest_opportunity_applications
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);
