-- =====================================================
-- GET FUNCTION DEFINITIONS FOR REMAINING 23 FUNCTIONS
-- =====================================================
-- Run this to get function definitions for migration
-- Replace 'FUNCTION_NAME' with each function name below

-- List of remaining functions to migrate:
/*
1. set_advisor_offer_visibility
2. get_due_diligence_requests_for_startup
3. get_investor_recommendations
4. get_investment_advisor_investors
5. get_investment_advisor_startups
6. get_user_profile
7. assign_evaluators_to_application
8. assign_facilitator_code
9. assign_mentor_code
10. create_advisor_relationships_automatically
11. create_existing_investment_advisor_relationships
12. create_investment_offers_automatically
13. create_missing_offers
14. create_missing_relationships
15. generate_ca_code
16. generate_cs_code
17. generate_facilitator_code
18. generate_investment_advisor_code
19. generate_investor_code
20. generate_mentor_code
21. get_applications_with_codes
22. get_facilitator_by_code
23. get_facilitator_code
24. get_opportunities_with_codes
25. safe_delete_startup_user
26. set_facilitator_code_on_opportunity
27. update_investment_advisor_relationship
28. update_startup_investment_advisor_relationship
*/

-- Template to get function definition:
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'FUNCTION_NAME';  -- Replace with actual function name

-- Example: Get definition for set_advisor_offer_visibility
-- SELECT 
--     p.proname as function_name,
--     pg_get_functiondef(p.oid) as function_definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--     AND p.proname = 'set_advisor_offer_visibility';



