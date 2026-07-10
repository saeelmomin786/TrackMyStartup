-- ============================================================
-- Migration: add_startup_activity_triggers
-- SAFE TO RUN MULTIPLE TIMES — fully idempotent
-- Run this in Supabase → SQL Editor
-- Requires: CREATE_FACILITATOR_STARTUPS_TABLE.sql (facilitator_startups)
--           already applied. (Verified live: it is.)
-- ============================================================

-- Extends the profile_audit_log feed (defined here — verified this table
-- does NOT already exist in the live database, even though
-- PROFILE_SECTION_DYNAMIC_TABLES.sql exists in the repo and references it;
-- that migration was apparently never run against this project. Schema
-- below matches that file exactly so this stays compatible if it ever is.)
-- to also capture Financial, Compliance, and Cap Table changes, so
-- facilitators can see a startup's full activity history via a
-- notification bell.

-- 0. Create profile_audit_log if it doesn't already exist (safe no-op if
-- PROFILE_SECTION_DYNAMIC_TABLES.sql already created it — identical schema).
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profile_audit_startup_id ON public.profile_audit_log(startup_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_user_id ON public.profile_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_changed_at ON public.profile_audit_log(changed_at);

-- Owner-read policy (matches PROFILE_SECTION_DYNAMIC_TABLES.sql exactly, in
-- case that file is applied later — DROP+CREATE keeps this idempotent
-- either way).
DROP POLICY IF EXISTS "Users can view their own profile audit logs" ON public.profile_audit_log;
CREATE POLICY "Users can view their own profile audit logs" ON public.profile_audit_log
    FOR SELECT USING (
        user_id = auth.uid() OR
        startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
    );

-- 1. Generic trigger for tables with an `id` PK + integer `startup_id` column.
CREATE OR REPLACE FUNCTION log_startup_activity() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profile_audit_log(startup_id, user_id, action, table_name, record_id, old_values, new_values, changed_at)
  VALUES (
    COALESCE(NEW.startup_id, OLD.startup_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Variant for startup_shares, whose own startup_id IS the primary key
-- (no separate `id` column).
CREATE OR REPLACE FUNCTION log_startup_shares_activity() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profile_audit_log(startup_id, user_id, action, table_name, record_id, old_values, new_values, changed_at)
  VALUES (
    COALESCE(NEW.startup_id, OLD.startup_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.startup_id, OLD.startup_id)::text,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach to Financial / Compliance / Cap Table tables (all confirmed to
-- have `id` + integer `startup_id`). user_submitted_compliances is
-- intentionally excluded — it has no startup_id (it's a global CA/CS
-- compliance-rule proposal, not a per-startup record).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'financial_records',
    'compliance_checks',
    'compliance_uploads',
    'investment_records',
    'mentor_equity_records',
    'recognition_records',
    'founders',
    'fundraising_details',
    'valuation_history',
    'equity_holdings'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_log_activity ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_log_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION log_startup_activity()',
        t
      );
    END IF;
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_log_shares_activity ON public.startup_shares;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'startup_shares') THEN
    EXECUTE 'CREATE TRIGGER trg_log_shares_activity AFTER INSERT OR UPDATE OR DELETE ON public.startup_shares FOR EACH ROW EXECUTE FUNCTION log_startup_shares_activity()';
  END IF;
END $$;

-- 4. Additional RLS SELECT policy so facilitators can read activity for
-- startups they've accepted (Postgres OR's multiple permissive SELECT
-- policies together, so this is additive and doesn't touch the existing
-- startup-owner policy on profile_audit_log).
DROP POLICY IF EXISTS facilitator_read_profile_audit_log ON profile_audit_log;
CREATE POLICY facilitator_read_profile_audit_log ON profile_audit_log
  FOR SELECT USING (
    startup_id IN (
      SELECT startup_id FROM public.facilitator_startups
      WHERE facilitator_id = auth.uid() AND status = 'active'
    )
  );

-- 5. Per-facilitator, per-startup "last seen" marker for the bell's unread
-- badge.
CREATE TABLE IF NOT EXISTS facilitator_activity_last_seen (
  facilitator_id UUID NOT NULL,
  startup_id INTEGER NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (facilitator_id, startup_id)
);

ALTER TABLE facilitator_activity_last_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fals_select_own ON facilitator_activity_last_seen;
CREATE POLICY fals_select_own ON facilitator_activity_last_seen
  FOR SELECT USING (facilitator_id = auth.uid());

DROP POLICY IF EXISTS fals_insert_own ON facilitator_activity_last_seen;
CREATE POLICY fals_insert_own ON facilitator_activity_last_seen
  FOR INSERT WITH CHECK (facilitator_id = auth.uid());

DROP POLICY IF EXISTS fals_update_own ON facilitator_activity_last_seen;
CREATE POLICY fals_update_own ON facilitator_activity_last_seen
  FOR UPDATE USING (facilitator_id = auth.uid()) WITH CHECK (facilitator_id = auth.uid());
