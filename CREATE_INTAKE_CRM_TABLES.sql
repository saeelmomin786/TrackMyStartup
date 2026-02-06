-- Intake CRM Tables Migration
-- Creates tables to persist intake management CRM data (columns, statuses, attachments)
-- Run this in Supabase SQL Editor

-- 1. Intake CRM Columns (board columns per facilitator)
CREATE TABLE IF NOT EXISTS public.intake_crm_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_crm_columns_facilitator 
  ON public.intake_crm_columns(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_intake_crm_columns_position 
  ON public.intake_crm_columns(facilitator_id, position);

-- 2. Intake CRM Status Map (application → column assignments)
CREATE TABLE IF NOT EXISTS public.intake_crm_status_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL, -- Composite key from opportunity_applications
  column_id UUID NOT NULL REFERENCES public.intake_crm_columns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facilitator_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_intake_crm_status_map_facilitator 
  ON public.intake_crm_status_map(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_intake_crm_status_map_application 
  ON public.intake_crm_status_map(application_id);

-- 3. Intake CRM Attachments (link attachments per application)
CREATE TABLE IF NOT EXISTS public.intake_crm_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL, -- Composite key from opportunity_applications
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_crm_attachments_facilitator 
  ON public.intake_crm_attachments(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_intake_crm_attachments_application 
  ON public.intake_crm_attachments(application_id);

-- 4. Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- 5. Apply triggers
DROP TRIGGER IF EXISTS trg_icc_updated_at ON public.intake_crm_columns;
CREATE TRIGGER trg_icc_updated_at 
  BEFORE UPDATE ON public.intake_crm_columns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_icsm_updated_at ON public.intake_crm_status_map;
CREATE TRIGGER trg_icsm_updated_at 
  BEFORE UPDATE ON public.intake_crm_status_map
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Enable Row Level Security
ALTER TABLE public.intake_crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_crm_status_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_crm_attachments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for intake_crm_columns
DROP POLICY IF EXISTS icc_select_own ON public.intake_crm_columns;
CREATE POLICY icc_select_own ON public.intake_crm_columns 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icc_insert_own ON public.intake_crm_columns;
CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icc_update_own ON public.intake_crm_columns;
CREATE POLICY icc_update_own ON public.intake_crm_columns 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icc_delete_own ON public.intake_crm_columns;
CREATE POLICY icc_delete_own ON public.intake_crm_columns 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

-- 8. RLS Policies for intake_crm_status_map
DROP POLICY IF EXISTS icsm_select_own ON public.intake_crm_status_map;
CREATE POLICY icsm_select_own ON public.intake_crm_status_map 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_status_map.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icsm_insert_own ON public.intake_crm_status_map;
CREATE POLICY icsm_insert_own ON public.intake_crm_status_map 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_status_map.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icsm_update_own ON public.intake_crm_status_map;
CREATE POLICY icsm_update_own ON public.intake_crm_status_map 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_status_map.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_status_map.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icsm_delete_own ON public.intake_crm_status_map;
CREATE POLICY icsm_delete_own ON public.intake_crm_status_map 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_status_map.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

-- 9. RLS Policies for intake_crm_attachments
DROP POLICY IF EXISTS ica_select_own ON public.intake_crm_attachments;
CREATE POLICY ica_select_own ON public.intake_crm_attachments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_attachments.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ica_insert_own ON public.intake_crm_attachments;
CREATE POLICY ica_insert_own ON public.intake_crm_attachments 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_attachments.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ica_delete_own ON public.intake_crm_attachments;
CREATE POLICY ica_delete_own ON public.intake_crm_attachments 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_attachments.facilitator_id
        AND up.auth_user_id = auth.uid()
    )
  );

-- 10. Verification queries
SELECT 'Intake CRM tables created successfully!' AS status;

SELECT 
  tablename, 
  COUNT(*) FILTER (WHERE schemaname = 'public') AS index_count
FROM pg_indexes 
WHERE tablename LIKE 'intake_crm%' 
GROUP BY tablename;
