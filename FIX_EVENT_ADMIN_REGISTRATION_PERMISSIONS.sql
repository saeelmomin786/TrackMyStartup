-- =====================================================
-- FIX: ADMIN PERMISSION DENIED FOR EVENT REGISTRATIONS
-- =====================================================
-- Symptom:
-- 403 permission denied for table event_registrations in Admin Events tab.
--
-- Cause:
-- RLS policies allow admin reads, but SQL GRANT privileges for authenticated
-- were revoked and not granted back for these admin-readable tables.
--
-- Run in Supabase SQL Editor.

BEGIN;

-- Keep RLS as source of truth; these grants only allow access to be evaluated.
GRANT SELECT ON public.event_registrations TO authenticated;
GRANT SELECT ON public.event_registration_answers TO authenticated;
GRANT SELECT ON public.event_payments TO authenticated;
GRANT SELECT ON public.event_email_logs TO authenticated;

-- Admin update policy already exists on event_registrations; grant UPDATE so it can work.
GRANT UPDATE ON public.event_registrations TO authenticated;

COMMIT;
