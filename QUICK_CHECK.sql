-- =====================================================
-- SINGLE SIMPLE QUERY - RUN THIS FIRST
-- =====================================================
-- This shows the exact RLS policy on intake_crm_columns
-- =====================================================

SELECT 
    policyname,
    qual AS "USING (SELECT/UPDATE)",
    with_check AS "WITH CHECK (INSERT/UPDATE)"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'intake_crm_columns'
ORDER BY policyname;

-- =====================================================
-- What you should see (THE BUG):
-- =====================================================
--
-- policyname          | USING              | WITH CHECK
-- --------------------|--------------------|-----------
-- icc_delete_own      | EXISTS (SELECT ...) | NULL
-- icc_insert_own      | NULL               | EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = public.intake_crm_columns.facilitator_id AND up.auth_user_id = auth.uid())
-- icc_select_own      | EXISTS (SELECT ...) | NULL
-- icc_update_own      | EXISTS (SELECT ...) | EXISTS (SELECT ...)
--
-- NOTICE: The condition checks "up.id = facilitator_id"
-- But code sends facilitator_id with value of auth_user_id
-- This is the MISMATCH causing 403 Error!
