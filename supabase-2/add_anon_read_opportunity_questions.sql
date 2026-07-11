-- ============================================================
-- Migration: add_anon_read_opportunity_questions
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- ============================================================

-- The no-login application form (PublicProgramView.tsx) calls
-- questionBankService.getOpportunityQuestions(), the same function the
-- authenticated startup dashboard uses. That function was only ever
-- exercised by logged-in users before, so incubation_opportunity_questions
-- and application_question_bank have no RLS policy granting the anon role
-- read access — confirmed live: an anon-context query for a program with
-- known configured questions returns zero rows with no error (RLS silently
-- filtering), while the same query via the service role (bypassing RLS)
-- returns the real rows. This is purely additive: it does not touch or
-- remove any existing policy for authenticated users.

-- incubation_opportunity_questions has one simple, uniform access pattern
-- (just a join table, no per-role tiering anywhere else in the app), so
-- enabling RLS here (a no-op if already on) is safe.
ALTER TABLE public.incubation_opportunity_questions ENABLE ROW LEVEL SECURITY;

-- Deliberately NOT touching application_question_bank's RLS-enabled state:
-- that table already has clearly nuanced, multi-tier access in the app
-- (admin sees pending/rejected via AdminQuestionBankTab, facilitators see
-- their own pending + global approved via getFacilitatorQuestions) which
-- strongly implies RLS is already configured there with several policies.
-- If it's already enabled, the new policy below just adds one more
-- permissive OR'd condition (pure widening, cannot remove existing access).
-- If it somehow isn't enabled, the CREATE POLICY is inert until enabled —
-- either way this migration can't narrow anyone's existing access.

-- Which questions are attached to which opportunity, and in what order/
-- required-ness, is not sensitive — every opportunity is already publicly
-- viewable (incubation_opportunities already allows anon SELECT, confirmed
-- live), so the question list for it is fine to expose the same way.
DROP POLICY IF EXISTS anon_read_opportunity_questions ON public.incubation_opportunity_questions;
CREATE POLICY anon_read_opportunity_questions ON public.incubation_opportunity_questions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only approved questions — matches the same filter every other reader of
-- this table already uses (lib/questionBankService.ts's getApprovedQuestions,
-- QuestionSelector.tsx).
DROP POLICY IF EXISTS anon_read_approved_questions ON public.application_question_bank;
CREATE POLICY anon_read_approved_questions ON public.application_question_bank
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');
