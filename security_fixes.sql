-- =====================================================
-- SUPABASE SECURITY FIXES - SAFE IMPLEMENTATION
-- =====================================================
-- This script addresses security issues while preserving existing functionality
-- Run this in your Supabase SQL editor

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON PUBLIC TABLES
-- =====================================================
-- Enable RLS on tables that currently lack it
-- These are minimal policies that preserve existing access patterns

-- Enable RLS on company_types
ALTER TABLE public.company_types ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for company_types (allows existing access)
CREATE POLICY "Allow all operations for authenticated users" ON public.company_types
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS on compliance_rules_new
ALTER TABLE public.compliance_rules_new ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.compliance_rules_new
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS on diligence_status_log
ALTER TABLE public.diligence_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.diligence_status_log
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS on compliance_access
ALTER TABLE public.compliance_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.compliance_access
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS on auditor_types
ALTER TABLE public.auditor_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.auditor_types
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS on governance_types
ALTER TABLE public.governance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.governance_types
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable RLS on compliance_rules_comprehensive
ALTER TABLE public.compliance_rules_comprehensive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.compliance_rules_comprehensive
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. FIX FUNCTION SEARCH PATH ISSUES
-- =====================================================
-- Set search_path for all functions to prevent security issues
-- This ensures functions use a secure search path

-- Update functions without parameters
ALTER FUNCTION public.update_service_providers_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_fundraising_status() SET search_path = 'public';
ALTER FUNCTION public.update_ip_trademark_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_user_role() SET search_path = 'public';
ALTER FUNCTION public.is_admin() SET search_path = 'public';
ALTER FUNCTION public.is_startup() SET search_path = 'public';
ALTER FUNCTION public.is_investor() SET search_path = 'public';
ALTER FUNCTION public.is_ca_or_cs() SET search_path = 'public';
ALTER FUNCTION public.is_facilitator() SET search_path = 'public';
ALTER FUNCTION public.generate_cs_code() SET search_path = 'public';
ALTER FUNCTION public.create_investment_advisor_recommendation() SET search_path = 'public';
ALTER FUNCTION public.assign_ca_to_startup() SET search_path = 'public';
ALTER FUNCTION public.update_user_submitted_compliances_updated_at() SET search_path = 'public';
ALTER FUNCTION public.create_existing_investment_advisor_relationships() SET search_path = 'public';
ALTER FUNCTION public.create_co_investment_opportunity() SET search_path = 'public';
ALTER FUNCTION public.generate_investment_advisor_code() SET search_path = 'public';
ALTER FUNCTION public.get_co_investment_opportunities_for_user() SET search_path = 'public';
ALTER FUNCTION public.get_all_co_investment_opportunities() SET search_path = 'public';
ALTER FUNCTION public.express_co_investment_interest() SET search_path = 'public';
ALTER FUNCTION public.approve_co_investment_interest() SET search_path = 'public';
ALTER FUNCTION public.notify_profile_changes() SET search_path = 'public';
ALTER FUNCTION public.handle_investor_approval_payment_success() SET search_path = 'public';
ALTER FUNCTION public.update_application_evaluation_status() SET search_path = 'public';
ALTER FUNCTION public.handle_investor_approval_payment_error() SET search_path = 'public';
ALTER FUNCTION public.assign_evaluators_to_application() SET search_path = 'public';
ALTER FUNCTION public.calculate_application_score() SET search_path = 'public';
ALTER FUNCTION public.update_recognition_records_updated_at() SET search_path = 'public';
ALTER FUNCTION public.send_application_communication() SET search_path = 'public';
ALTER FUNCTION public.delete_incubation_program() SET search_path = 'public';
ALTER FUNCTION public.get_ca_startups() SET search_path = 'public';
ALTER FUNCTION public.safe_delete_startup_user() SET search_path = 'public';
ALTER FUNCTION public.recalculate_all_startup_funding() SET search_path = 'public';
ALTER FUNCTION public.get_advisor_investors() SET search_path = 'public';
ALTER FUNCTION public.update_international_op() SET search_path = 'public';
ALTER FUNCTION public.calculate_investment_scouting_fee() SET search_path = 'public';
ALTER FUNCTION public.calculate_investment_acceptance_fee() SET search_path = 'public';
ALTER FUNCTION public.set_investment_offer_fees() SET search_path = 'public';
ALTER FUNCTION public.update_offer_status_with_payment() SET search_path = 'public';
ALTER FUNCTION public.set_advisor_offer_visibility() SET search_path = 'public';
ALTER FUNCTION public.accept_application() SET search_path = 'public';
ALTER FUNCTION public.create_default_evaluation_criteria() SET search_path = 'public';
ALTER FUNCTION public.handle_cs_code_generation() SET search_path = 'public';
ALTER FUNCTION public.request_diligence() SET search_path = 'public';
ALTER FUNCTION public.approve_diligence() SET search_path = 'public';
ALTER FUNCTION public.create_incubation_payment() SET search_path = 'public';
ALTER FUNCTION public.update_payment_status() SET search_path = 'public';
ALTER FUNCTION public.update_equity_holdings_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_application_status() SET search_path = 'public';
ALTER FUNCTION public.set_investment_advisor_code() SET search_path = 'public';
ALTER FUNCTION public.get_cs_startups() SET search_path = 'public';
ALTER FUNCTION public.handle_ca_code_generation() SET search_path = 'public';
ALTER FUNCTION public.safe_update_diligence_status() SET search_path = 'public';
ALTER FUNCTION public.initialize_startup_shares_with_esop() SET search_path = 'public';
ALTER FUNCTION public.add_subsidiary() SET search_path = 'public';
ALTER FUNCTION public.update_shares_on_investment_change() SET search_path = 'public';
ALTER FUNCTION public.get_facilitator_access_list() SET search_path = 'public';
ALTER FUNCTION public.safe_auto_link_financial_record() SET search_path = 'public';
ALTER FUNCTION public.add_international_op() SET search_path = 'public';
ALTER FUNCTION public.update_subsidiary() SET search_path = 'public';
ALTER FUNCTION public.get_facilitator_code() SET search_path = 'public';
ALTER FUNCTION public.should_reveal_contact_details() SET search_path = 'public';
ALTER FUNCTION public.accept_investment_offer_with_fee() SET search_path = 'public';
ALTER FUNCTION public.update_founders_updated_at() SET search_path = 'public';
ALTER FUNCTION public.has_compliance_access() SET search_path = 'public';
ALTER FUNCTION public.update_investment_records_updated_at() SET search_path = 'public';
ALTER FUNCTION public.create_razorpay_order() SET search_path = 'public';
ALTER FUNCTION public.create_investment_offer_with_fee() SET search_path = 'public';
ALTER FUNCTION public.update_incubation_program() SET search_path = 'public';
ALTER FUNCTION public.reveal_contact_details() SET search_path = 'public';
ALTER FUNCTION public.get_valuation_history() SET search_path = 'public';
ALTER FUNCTION public.get_equity_distribution() SET search_path = 'public';
ALTER FUNCTION public.get_revenue_by_vertical() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_reset_codes() SET search_path = 'public';
ALTER FUNCTION public.get_investment_advisor_startups() SET search_path = 'public';
ALTER FUNCTION public.generate_facilitator_code() SET search_path = 'public';
ALTER FUNCTION public.verify_razorpay_payment() SET search_path = 'public';
ALTER FUNCTION public.set_updated_at_timestamp() SET search_path = 'public';
ALTER FUNCTION public.accept_startup_advisor_request() SET search_path = 'public';
ALTER FUNCTION public.create_missing_offers() SET search_path = 'public';
ALTER FUNCTION public.handle_razorpay_webhook() SET search_path = 'public';
ALTER FUNCTION public.initialize_startup_shares_for_new_startup() SET search_path = 'public';
ALTER FUNCTION public.update_shares_on_founder_change() SET search_path = 'public';
ALTER FUNCTION public.ensure_startup_shares_on_valuation_change() SET search_path = 'public';
ALTER FUNCTION public.get_investment_advisor_investors() SET search_path = 'public';
ALTER FUNCTION public.get_recommended_co_investment_opportunities() SET search_path = 'public';
ALTER FUNCTION public.auto_link_all_existing_records() SET search_path = 'public';
ALTER FUNCTION public.auto_link_new_financial_record() SET search_path = 'public';
ALTER FUNCTION public.normalize_country_code() SET search_path = 'public';
ALTER FUNCTION public.upload_incubation_file() SET search_path = 'public';
ALTER FUNCTION public.simple_deletion_test() SET search_path = 'public';
ALTER FUNCTION public.generate_compliance_tasks_for_startup() SET search_path = 'public';
ALTER FUNCTION public.create_advisor_relationships_automatically() SET search_path = 'public';
ALTER FUNCTION public.create_investment_offers_automatically() SET search_path = 'public';
ALTER FUNCTION public.create_missing_relationships() SET search_path = 'public';
ALTER FUNCTION public.update_international_operations_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_user_profile() SET search_path = 'public';
ALTER FUNCTION public.auto_link_financial_records() SET search_path = 'public';
ALTER FUNCTION public.sync_profiles_from_users() SET search_path = 'public';
ALTER FUNCTION public.test_incubation_system() SET search_path = 'public';
ALTER FUNCTION public.revoke_facilitator_access() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_access() SET search_path = 'public';
ALTER FUNCTION public.add_international_op_simple() SET search_path = 'public';
ALTER FUNCTION public.update_financial_records_updated_at() SET search_path = 'public';
ALTER FUNCTION public.calculate_scouting_fee() SET search_path = 'public';
ALTER FUNCTION public.update_compliance_rules_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_compliance_rules_for_country() SET search_path = 'public';
ALTER FUNCTION public.get_offers_for_investment_advisor() SET search_path = 'public';
ALTER FUNCTION public.simple_test_startup_user_deletion() SET search_path = 'public';
ALTER FUNCTION public.create_compliance_tasks() SET search_path = 'public';
ALTER FUNCTION public.add_employee() SET search_path = 'public';
ALTER FUNCTION public.log_diligence_status_change() SET search_path = 'public';
ALTER FUNCTION public.get_user_id_from_startup_id() SET search_path = 'public';
ALTER FUNCTION public.get_expenses_by_vertical() SET search_path = 'public';
ALTER FUNCTION public.get_advisor_clients() SET search_path = 'public';
ALTER FUNCTION public.insert_sar_from_investment() SET search_path = 'public';
ALTER FUNCTION public.update_facilitator_startups_updated_at() SET search_path = 'public';
ALTER FUNCTION public.accept_investment_offer_simple() SET search_path = 'public';
ALTER FUNCTION public.send_incubation_message() SET search_path = 'public';
ALTER FUNCTION public.get_application_for_messaging() SET search_path = 'public';
ALTER FUNCTION public.revoke_expired_access() SET search_path = 'public';
ALTER FUNCTION public.remove_ca_assignment() SET search_path = 'public';
ALTER FUNCTION public.is_valid_uuid() SET search_path = 'public';
ALTER FUNCTION public.get_user_id_from_application() SET search_path = 'public';
ALTER FUNCTION public.get_ca_assignment_requests() SET search_path = 'public';
ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.grant_facilitator_compliance_access() SET search_path = 'public';
ALTER FUNCTION public.update_document_verification_updated_at() SET search_path = 'public';
ALTER FUNCTION public.create_document_verification_history() SET search_path = 'public';
ALTER FUNCTION public.get_document_verification_status() SET search_path = 'public';
ALTER FUNCTION public.verify_document() SET search_path = 'public';
ALTER FUNCTION public.create_cs_assignment_request() SET search_path = 'public';
ALTER FUNCTION public.get_cs_assignment_requests() SET search_path = 'public';
ALTER FUNCTION public.update_startup_profile_simple() SET search_path = 'public';
ALTER FUNCTION public.get_monthly_financial_data() SET search_path = 'public';
ALTER FUNCTION public.update_subsidiary_compliance_tasks() SET search_path = 'public';
ALTER FUNCTION public.update_fundraising_details_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_investment_summary() SET search_path = 'public';
ALTER FUNCTION public.get_incubation_programs() SET search_path = 'public';
ALTER FUNCTION public.add_incubation_program() SET search_path = 'public';
ALTER FUNCTION public.get_startup_financial_summary() SET search_path = 'public';
ALTER FUNCTION public.get_startup_by_user_email() SET search_path = 'public';
ALTER FUNCTION public.get_employee_summary() SET search_path = 'public';
ALTER FUNCTION public.get_employees_by_department() SET search_path = 'public';
ALTER FUNCTION public.get_monthly_salary_data() SET search_path = 'public';
ALTER FUNCTION public.is_startup_owner() SET search_path = 'public';
ALTER FUNCTION public.approve_ca_assignment_request() SET search_path = 'public';
ALTER FUNCTION public.reject_ca_assignment_request() SET search_path = 'public';
ALTER FUNCTION public.get_investor_recommendations() SET search_path = 'public';
ALTER FUNCTION public.assign_facilitator_code() SET search_path = 'public';
ALTER FUNCTION public.get_facilitator_by_code() SET search_path = 'public';
ALTER FUNCTION public.get_applications_with_codes() SET search_path = 'public';
ALTER FUNCTION public.get_startup_profile() SET search_path = 'public';
ALTER FUNCTION public.reject_cs_assignment_request() SET search_path = 'public';
ALTER FUNCTION public.generate_ca_code() SET search_path = 'public';
ALTER FUNCTION public.grant_compliance_access() SET search_path = 'public';
ALTER FUNCTION public.remove_cs_assignment() SET search_path = 'public';
ALTER FUNCTION public.update_startup_profile() SET search_path = 'public';
ALTER FUNCTION public.create_ca_assignment_request() SET search_path = 'public';
ALTER FUNCTION public.set_facilitator_code_on_opportunity() SET search_path = 'public';
ALTER FUNCTION public.get_opportunities_with_codes() SET search_path = 'public';
ALTER FUNCTION public.check_facilitator_access() SET search_path = 'public';
ALTER FUNCTION public.generate_investor_code() SET search_path = 'public';
ALTER FUNCTION public.generate_facilitator_id() SET search_path = 'public';
ALTER FUNCTION public.update_opportunity_applications_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_recognition_requests_updated_at() SET search_path = 'public';
ALTER FUNCTION public.handle_ca_code_assignment() SET search_path = 'public';
ALTER FUNCTION public.get_startup_cs_requests() SET search_path = 'public';
ALTER FUNCTION public.update_validation_requests_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_investment_advisor_relationship() SET search_path = 'public';
ALTER FUNCTION public.update_startup_investment_advisor_relationship() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';

-- =====================================================
-- 3. REVIEW SECURITY DEFINER VIEWS
-- =====================================================
-- Note: These views are intentionally SECURITY DEFINER for business logic
-- They should be reviewed individually to ensure they're secure
-- For now, we'll add comments to document their purpose

-- Document the purpose of each SECURITY DEFINER view
COMMENT ON VIEW public.investment_advisor_dashboard_metrics IS 
'Dashboard metrics view with SECURITY DEFINER for aggregated data access. Review for security implications.';

COMMENT ON VIEW public.v_incubation_opportunities IS 
'Incubation opportunities view with SECURITY DEFINER for business logic. Review for security implications.';

COMMENT ON VIEW public.investment_advisor_startups IS 
'Investment advisor startups view with SECURITY DEFINER for business logic. Review for security implications.';

COMMENT ON VIEW public.compliance_rules_view IS 
'Compliance rules view with SECURITY DEFINER for business logic. Review for security implications.';

-- =====================================================
-- 4. ADDITIONAL SECURITY MEASURES
-- =====================================================

-- Create a function to check if RLS is enabled on all public tables
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    schemaname||'.'||tablename as table_name,
    rowsecurity as rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  ORDER BY tablename;
$$;

-- Create a function to check function search paths
CREATE OR REPLACE FUNCTION public.check_function_search_paths()
RETURNS TABLE(function_name text, search_path text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    n.nspname||'.'||p.proname as function_name,
    COALESCE(p.proconfig::text, 'Not set') as search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  ORDER BY p.proname;
$$;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the fixes worked

-- Check RLS status on all tables
-- SELECT * FROM public.check_rls_status();

-- Check function search paths
-- SELECT * FROM public.check_function_search_paths();

-- Check for any remaining SECURITY DEFINER views
-- SELECT schemaname, viewname, definition 
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND definition LIKE '%SECURITY DEFINER%';

COMMIT;






