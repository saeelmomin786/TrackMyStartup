-- FIX INTAKE CRM RLS - Remove user_profiles lookup, use auth.uid() directly
-- The facilitator_id column stores auth_user_id (UUID from Supabase auth), not user_profiles.id
-- This matches how FacilitatorView passes user.id from supabase.auth.getUser()

-- ============================================================
-- 1. Fix intake_crm_columns policies
-- ============================================================
DROP POLICY IF EXISTS icc_select_own ON public.intake_crm_columns;
CREATE POLICY icc_select_own ON public.intake_crm_columns 
  FOR SELECT USING (facilitator_id = auth.uid());

DROP POLICY IF EXISTS icc_insert_own ON public.intake_crm_columns;
CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT WITH CHECK (facilitator_id = auth.uid());

DROP POLICY IF EXISTS icc_update_own ON public.intake_crm_columns;
CREATE POLICY icc_update_own ON public.intake_crm_columns 
  FOR UPDATE 
  USING (facilitator_id = auth.uid()) 
  WITH CHECK (facilitator_id = auth.uid());

DROP POLICY IF EXISTS icc_delete_own ON public.intake_crm_columns;
CREATE POLICY icc_delete_own ON public.intake_crm_columns 
  FOR DELETE USING (facilitator_id = auth.uid());

-- ============================================================
-- 2. Fix intake_crm_status_map policies
-- ============================================================
DROP POLICY IF EXISTS icsm_select_own ON public.intake_crm_status_map;
CREATE POLICY icsm_select_own ON public.intake_crm_status_map 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.id = public.intake_crm_status_map.column_id
        AND c.facilitator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icsm_insert_own ON public.intake_crm_status_map;
CREATE POLICY icsm_insert_own ON public.intake_crm_status_map 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.id = public.intake_crm_status_map.column_id
        AND c.facilitator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icsm_update_own ON public.intake_crm_status_map;
CREATE POLICY icsm_update_own ON public.intake_crm_status_map 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.id = public.intake_crm_status_map.column_id
        AND c.facilitator_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.id = public.intake_crm_status_map.column_id
        AND c.facilitator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS icsm_delete_own ON public.intake_crm_status_map;
CREATE POLICY icsm_delete_own ON public.intake_crm_status_map 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.id = public.intake_crm_status_map.column_id
        AND c.facilitator_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Fix intake_crm_attachments policies
-- ============================================================
DROP POLICY IF EXISTS ica_select_own ON public.intake_crm_attachments;
CREATE POLICY ica_select_own ON public.intake_crm_attachments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.facilitator_id = public.intake_crm_attachments.facilitator_id
        AND c.facilitator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ica_insert_own ON public.intake_crm_attachments;
CREATE POLICY ica_insert_own ON public.intake_crm_attachments 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.facilitator_id = public.intake_crm_attachments.facilitator_id
        AND c.facilitator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ica_update_own ON public.intake_crm_attachments;
CREATE POLICY ica_update_own ON public.intake_crm_attachments 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.facilitator_id = public.intake_crm_attachments.facilitator_id
        AND c.facilitator_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.facilitator_id = public.intake_crm_attachments.facilitator_id
        AND c.facilitator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ica_delete_own ON public.intake_crm_attachments;
CREATE POLICY ica_delete_own ON public.intake_crm_attachments 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.intake_crm_columns c
      WHERE c.facilitator_id = public.intake_crm_attachments.facilitator_id
        AND c.facilitator_id = auth.uid()
    )
  );

-- ============================================================
-- Verification query
-- ============================================================
SELECT 
  'RLS Policies Fixed' as status,
  'facilitator_id now directly compared with auth.uid()' as change,
  'No user_profiles lookup needed' as note;
