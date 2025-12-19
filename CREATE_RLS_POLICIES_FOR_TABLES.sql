-- =====================================================
-- CREATE RLS POLICIES FOR TABLES NEEDING THEM
-- =====================================================
-- This creates appropriate RLS policies based on table types

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
-- STEP 2: Create RLS Policies
-- =====================================================

-- =====================================================
-- REFERENCE DATA TABLES (Public Read Access)
-- =====================================================
-- These are lookup/reference tables - all authenticated users can read

-- auditor_types (Reference data - public read)
DROP POLICY IF EXISTS "Anyone can read auditor_types" ON public.auditor_types;
CREATE POLICY "Anyone can read auditor_types" ON public.auditor_types
FOR SELECT USING (auth.role() = 'authenticated');

-- company_types (Reference data - public read)
DROP POLICY IF EXISTS "Anyone can read company_types" ON public.company_types;
CREATE POLICY "Anyone can read company_types" ON public.company_types
FOR SELECT USING (auth.role() = 'authenticated');

-- governance_types (Reference data - public read)
DROP POLICY IF EXISTS "Anyone can read governance_types" ON public.governance_types;
CREATE POLICY "Anyone can read governance_types" ON public.governance_types
FOR SELECT USING (auth.role() = 'authenticated');

-- compliance_rules_comprehensive (Reference data - public read)
DROP POLICY IF EXISTS "Anyone can read compliance_rules_comprehensive" ON public.compliance_rules_comprehensive;
CREATE POLICY "Anyone can read compliance_rules_comprehensive" ON public.compliance_rules_comprehensive
FOR SELECT USING (auth.role() = 'authenticated');

-- compliance_rules_new (Reference data - public read)
DROP POLICY IF EXISTS "Anyone can read compliance_rules_new" ON public.compliance_rules_new;
CREATE POLICY "Anyone can read compliance_rules_new" ON public.compliance_rules_new
FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- PASSWORD_OTPS (OTP verification - users see only their own by email)
-- =====================================================
-- Sensitive data - users should only see OTPs for their own email
-- Table structure: id, email, user_id (nullable), code, purpose, advisor_code, expires_at, used_at, attempts, created_at

-- Users can view OTPs for their own email (for verification)
DROP POLICY IF EXISTS "Users can view own password_otps" ON public.password_otps;
CREATE POLICY "Users can view own password_otps" ON public.password_otps
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
        AND LOWER(user_profiles.email) = LOWER(password_otps.email)
    )
);

-- Allow inserts (for creating OTPs - server/api creates these)
DROP POLICY IF EXISTS "Authenticated users can insert password_otps" ON public.password_otps;
CREATE POLICY "Authenticated users can insert password_otps" ON public.password_otps
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow updates (for marking OTPs as used, incrementing attempts - server/api does this)
DROP POLICY IF EXISTS "Users can update own password_otps" ON public.password_otps;
CREATE POLICY "Users can update own password_otps" ON public.password_otps
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
        AND LOWER(user_profiles.email) = LOWER(password_otps.email)
    )
);

-- =====================================================
-- WORKFLOW TABLES (Empty - Admin or authenticated access)
-- =====================================================
-- These are empty, likely admin-only or authenticated users can access

-- program_workflows
DROP POLICY IF EXISTS "Authenticated users can access program_workflows" ON public.program_workflows;
CREATE POLICY "Authenticated users can access program_workflows" ON public.program_workflows
FOR ALL USING (auth.role() = 'authenticated');

-- workflow_steps
DROP POLICY IF EXISTS "Authenticated users can access workflow_steps" ON public.workflow_steps;
CREATE POLICY "Authenticated users can access workflow_steps" ON public.workflow_steps
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

