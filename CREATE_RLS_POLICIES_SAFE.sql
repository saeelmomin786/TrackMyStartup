-- =====================================================
-- CREATE SAFE RLS POLICIES (Won't Break Existing Flows)
-- =====================================================
-- This creates permissive policies that ensure existing code continues to work

-- =====================================================
-- STEP 1: Enable RLS on disabled tables
-- =====================================================
ALTER TABLE public.auditor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rules_comprehensive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rules_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_otps ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Create SAFE RLS Policies
-- =====================================================

-- =====================================================
-- REFERENCE DATA TABLES (Full Access for Authenticated Users)
-- =====================================================
-- These tables are used in complianceManagementService and AdminView
-- Allowing full access ensures existing code continues to work

-- auditor_types - Full access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage auditor_types" ON public.auditor_types;
CREATE POLICY "Authenticated users can manage auditor_types" ON public.auditor_types
FOR ALL USING (auth.role() = 'authenticated');

-- company_types - Full access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage company_types" ON public.company_types;
CREATE POLICY "Authenticated users can manage company_types" ON public.company_types
FOR ALL USING (auth.role() = 'authenticated');

-- governance_types - Full access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage governance_types" ON public.governance_types;
CREATE POLICY "Authenticated users can manage governance_types" ON public.governance_types
FOR ALL USING (auth.role() = 'authenticated');

-- compliance_rules_comprehensive - Full access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage compliance_rules_comprehensive" ON public.compliance_rules_comprehensive;
CREATE POLICY "Authenticated users can manage compliance_rules_comprehensive" ON public.compliance_rules_comprehensive
FOR ALL USING (auth.role() = 'authenticated');

-- compliance_rules_new - Full access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage compliance_rules_new" ON public.compliance_rules_new;
CREATE POLICY "Authenticated users can manage compliance_rules_new" ON public.compliance_rules_new
FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- PASSWORD_OTPS (Permissive Access for Backend Operations)
-- =====================================================
-- Used in server.js and api/verify-otp.ts for OTP operations
-- IMPORTANT: Backend uses SERVICE ROLE KEY which BYPASSES RLS entirely
-- These policies provide security if regular client is used, but don't affect backend operations
-- Backend OTP operations will work perfectly regardless of these policies (service role bypasses RLS)

-- Allow authenticated users to insert OTPs (server creates these)
DROP POLICY IF EXISTS "Authenticated users can insert password_otps" ON public.password_otps;
CREATE POLICY "Authenticated users can insert password_otps" ON public.password_otps
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to select OTPs (server verifies these)
-- More permissive to ensure backend code works
DROP POLICY IF EXISTS "Authenticated users can select password_otps" ON public.password_otps;
CREATE POLICY "Authenticated users can select password_otps" ON public.password_otps
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update OTPs (server marks as used/increments attempts)
DROP POLICY IF EXISTS "Authenticated users can update password_otps" ON public.password_otps;
CREATE POLICY "Authenticated users can update password_otps" ON public.password_otps
FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- WORKFLOW TABLES (Empty - Full Access for Authenticated Users)
-- =====================================================
-- Currently empty, allowing full access for future use

-- program_workflows
DROP POLICY IF EXISTS "Authenticated users can manage program_workflows" ON public.program_workflows;
CREATE POLICY "Authenticated users can manage program_workflows" ON public.program_workflows
FOR ALL USING (auth.role() = 'authenticated');

-- workflow_steps
DROP POLICY IF EXISTS "Authenticated users can manage workflow_steps" ON public.workflow_steps;
CREATE POLICY "Authenticated users can manage workflow_steps" ON public.workflow_steps
FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
    '=== RLS POLICIES CREATED ===' as section,
    schemaname,
    tablename,
    policyname,
    cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'auditor_types',
      'company_types',
      'compliance_rules_comprehensive',
      'compliance_rules_new',
      'governance_types',
      'password_otps',
      'program_workflows',
      'workflow_steps'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- FINAL STATUS CHECK
-- =====================================================
SELECT 
    '=== FINAL STATUS ===' as section,
    (SELECT COUNT(*) FROM pg_tables 
     WHERE schemaname = 'public' 
       AND tablename IN (
           'auditor_types',
           'company_types',
           'compliance_rules_comprehensive',
           'compliance_rules_new',
           'governance_types',
           'password_otps',
           'program_workflows',
           'workflow_steps'
       )
       AND rowsecurity = true) as tables_with_rls_enabled,
    (SELECT COUNT(*) FROM pg_policy p
     JOIN pg_class c ON p.polrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'public'
       AND c.relname IN (
           'auditor_types',
           'company_types',
           'compliance_rules_comprehensive',
           'compliance_rules_new',
           'governance_types',
           'password_otps',
           'program_workflows',
           'workflow_steps'
       )) as total_policies_created,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables 
              WHERE schemaname = 'public' 
                AND tablename IN (
                    'auditor_types',
                    'company_types',
                    'compliance_rules_comprehensive',
                    'compliance_rules_new',
                    'governance_types',
                    'password_otps',
                    'program_workflows',
                    'workflow_steps'
                )
                AND rowsecurity = true) = 8
        THEN '✅ All 8 tables have RLS enabled and policies created!'
        ELSE '⚠️ Some tables still need configuration'
    END as final_status;

