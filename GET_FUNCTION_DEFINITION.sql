-- =====================================================
-- GET FUNCTION DEFINITION FOR MIGRATION
-- =====================================================
-- Replace 'FUNCTION_NAME' with the function you want to migrate
-- This will show you the current function definition

-- Example: Check get_startup_by_user_email
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'FUNCTION_NAME';  -- Replace with actual function name

-- List of functions to check (run separately for each):
/*
- set_advisor_offer_visibility
- get_due_diligence_requests_for_startup
- get_investor_recommendations
- get_investment_advisor_investors
- get_investment_advisor_startups
- get_user_profile
- assign_evaluators_to_application
- assign_facilitator_code
- assign_mentor_code
- create_advisor_relationships_automatically
- create_existing_investment_advisor_relationships
- create_investment_offers_automatically
- create_missing_offers
- create_missing_relationships
- generate_ca_code
- generate_cs_code
- generate_facilitator_code
- generate_investment_advisor_code
- generate_investor_code
- generate_mentor_code
- get_applications_with_codes
- get_facilitator_by_code
- get_facilitator_code
- get_opportunities_with_codes
- safe_delete_startup_user
- set_facilitator_code_on_opportunity
- update_investment_advisor_relationship
- update_startup_investment_advisor_relationship
*/



