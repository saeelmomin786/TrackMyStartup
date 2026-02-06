-- COMPLETE FIX FOR INTAKE CRM - Remove FK constraint and fix RLS
-- This fixes the 403 Forbidden error by aligning table schema with how facilitator_id is used

-- ============================================================
-- STEP 1: Remove foreign key constraints
-- ============================================================
-- The facilitator_id column stores auth.uid() (auth UUID), not user_profiles.id
-- So we can't have a foreign key constraint to user_profiles(id)

ALTER TABLE public.intake_crm_columns 
  DROP CONSTRAINT IF EXISTS intake_crm_columns_facilitator_id_fkey;

ALTER TABLE public.intake_crm_status_map 
  DROP CONSTRAINT IF EXISTS intake_crm_status_map_facilitator_id_fkey;

ALTER TABLE public.intake_crm_attachments 
  DROP CONSTRAINT IF EXISTS intake_crm_attachments_facilitator_id_fkey;

-- ============================================================
-- STEP 2: Fix intake_crm_columns RLS policies
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
-- STEP 3: Fix intake_crm_status_map RLS policies
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
-- STEP 4: Fix intake_crm_attachments RLS policies
-- ============================================================
DROP POLICY IF EXISTS ica_select_own ON public.intake_crm_attachments;
CREATE POLICY ica_select_own ON public.intake_crm_attachments 
  FOR SELECT USING (facilitator_id = auth.uid());

DROP POLICY IF EXISTS ica_insert_own ON public.intake_crm_attachments;
CREATE POLICY ica_insert_own ON public.intake_crm_attachments 
  FOR INSERT WITH CHECK (facilitator_id = auth.uid());

DROP POLICY IF EXISTS ica_update_own ON public.intake_crm_attachments;
CREATE POLICY ica_update_own ON public.intake_crm_attachments 
  FOR UPDATE 
  USING (facilitator_id = auth.uid()) 
  WITH CHECK (facilitator_id = auth.uid());

DROP POLICY IF EXISTS ica_delete_own ON public.intake_crm_attachments;
CREATE POLICY ica_delete_own ON public.intake_crm_attachments 
  FOR DELETE USING (facilitator_id = auth.uid());

-- ============================================================
-- Verification
-- ============================================================
SELECT 
  'Intake CRM tables fixed' as status,
  'Foreign key constraints removed' as step_1,
  'RLS policies updated to use auth.uid() directly' as step_2,
  'facilitator_id now stores auth UUID, not user_profiles.id' as note;

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments')
ORDER BY tablename, policyname;
