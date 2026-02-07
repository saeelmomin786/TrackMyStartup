-- =====================================================
-- CORRECT FIX: CRM RLS POLICIES
-- =====================================================
-- Issue: Code sends user.id (Auth User ID) as facilitator_id,
-- but RLS policy was checking user_profiles.id (Profile ID).
-- These are DIFFERENT UUIDs!
--
-- Fix: Update RLS policies to check by auth_user_id instead of id
-- =====================================================

-- =====================================================
-- 1. FIX INTAKE CRM COLUMNS - Check auth_user_id instead of id
-- =====================================================

DROP POLICY IF EXISTS icc_select_own ON public.intake_crm_columns;
CREATE POLICY icc_select_own ON public.intake_crm_columns 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
    )
  );

DROP POLICY IF EXISTS icc_insert_own ON public.intake_crm_columns;
CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
    )
  );

DROP POLICY IF EXISTS icc_update_own ON public.intake_crm_columns;
CREATE POLICY icc_update_own ON public.intake_crm_columns 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
    )
  );

DROP POLICY IF EXISTS icc_delete_own ON public.intake_crm_columns;
CREATE POLICY icc_delete_own ON public.intake_crm_columns 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
    )
  );

-- =====================================================
-- 2. FIX INTAKE CRM STATUS MAP
-- =====================================================

DROP POLICY IF EXISTS icsm_select_own ON public.intake_crm_status_map;
CREATE POLICY icsm_select_own ON public.intake_crm_status_map 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_status_map.facilitator_id
    )
  );

DROP POLICY IF EXISTS icsm_insert_own ON public.intake_crm_status_map;
CREATE POLICY icsm_insert_own ON public.intake_crm_status_map 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_status_map.facilitator_id
    )
  );

DROP POLICY IF EXISTS icsm_update_own ON public.intake_crm_status_map;
CREATE POLICY icsm_update_own ON public.intake_crm_status_map 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_status_map.facilitator_id
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_status_map.facilitator_id
    )
  );

DROP POLICY IF EXISTS icsm_delete_own ON public.intake_crm_status_map;
CREATE POLICY icsm_delete_own ON public.intake_crm_status_map 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_status_map.facilitator_id
    )
  );

-- =====================================================
-- 3. FIX INTAKE CRM ATTACHMENTS
-- =====================================================

DROP POLICY IF EXISTS ica_select_own ON public.intake_crm_attachments;
CREATE POLICY ica_select_own ON public.intake_crm_attachments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_attachments.facilitator_id
    )
  );

DROP POLICY IF EXISTS ica_insert_own ON public.intake_crm_attachments;
CREATE POLICY ica_insert_own ON public.intake_crm_attachments 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_attachments.facilitator_id
    )
  );

DROP POLICY IF EXISTS ica_delete_own ON public.intake_crm_attachments;
CREATE POLICY ica_delete_own ON public.intake_crm_attachments 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = public.intake_crm_attachments.facilitator_id
    )
  );

-- =====================================================
-- SUMMARY OF CHANGES
-- =====================================================
-- ✅ Changed from: WHERE up.id = facilitator_id
-- ✅ Changed to:   WHERE up.auth_user_id = facilitator_id
-- 
-- WHY: Code sends user.id (Auth User ID), not user_profiles.id
-- This is the correct fix that maintains security while matching what code does
-- =====================================================

