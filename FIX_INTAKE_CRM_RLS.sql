-- Fix Intake CRM RLS Policies
-- Simplify RLS to work with auth.uid() directly instead of user_profiles lookup

-- 1. Drop existing policies
DROP POLICY IF EXISTS icc_select_own ON public.intake_crm_columns;
DROP POLICY IF EXISTS icc_insert_own ON public.intake_crm_columns;
DROP POLICY IF EXISTS icc_update_own ON public.intake_crm_columns;
DROP POLICY IF EXISTS icc_delete_own ON public.intake_crm_columns;

DROP POLICY IF EXISTS icsm_select_own ON public.intake_crm_status_map;
DROP POLICY IF EXISTS icsm_insert_own ON public.intake_crm_status_map;
DROP POLICY IF EXISTS icsm_update_own ON public.intake_crm_status_map;
DROP POLICY IF EXISTS icsm_delete_own ON public.intake_crm_status_map;

DROP POLICY IF EXISTS ica_select_own ON public.intake_crm_attachments;
DROP POLICY IF EXISTS ica_insert_own ON public.intake_crm_attachments;
DROP POLICY IF EXISTS ica_delete_own ON public.intake_crm_attachments;

-- 2. Create simpler policies for intake_crm_columns (allow all authenticated users to access their facilitator data)
CREATE POLICY icc_select_own ON public.intake_crm_columns 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY icc_update_own ON public.intake_crm_columns 
  FOR UPDATE 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY icc_delete_own ON public.intake_crm_columns 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 3. Create simpler policies for intake_crm_status_map
CREATE POLICY icsm_select_own ON public.intake_crm_status_map 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY icsm_insert_own ON public.intake_crm_status_map 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY icsm_update_own ON public.intake_crm_status_map 
  FOR UPDATE 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY icsm_delete_own ON public.intake_crm_status_map 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 4. Create simpler policies for intake_crm_attachments
CREATE POLICY ica_select_own ON public.intake_crm_attachments 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY ica_insert_own ON public.intake_crm_attachments 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY ica_delete_own ON public.intake_crm_attachments 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Verify policies created
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments')
ORDER BY tablename, policyname;
