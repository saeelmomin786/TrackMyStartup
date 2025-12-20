# Phase 2: Create Migration Scripts for Remaining 23 Functions

## 🎯 Priority Order

### **High Priority (Do First - 6 functions):**
1. `set_advisor_offer_visibility` - Controls offer visibility
2. `get_due_diligence_requests_for_startup` - Due diligence workflow
3. `get_investor_recommendations` - Investor recommendations
4. `get_investment_advisor_investors` - Advisor dashboard
5. `get_investment_advisor_startups` - Advisor dashboard
6. `get_user_profile` - User profile retrieval

### **Medium Priority (Code Generation - 7 functions):**
7. `generate_ca_code`
8. `generate_cs_code`
9. `generate_facilitator_code`
10. `generate_investment_advisor_code`
11. `generate_investor_code`
12. `generate_mentor_code`
13. `assign_facilitator_code`
14. `assign_mentor_code`

### **Lower Priority (Utility/Test - 10 functions):**
15. `assign_evaluators_to_application`
16. `create_advisor_relationships_automatically`
17. `create_existing_investment_advisor_relationships`
18. `create_investment_offers_automatically`
19. `create_missing_offers`
20. `create_missing_relationships`
21. `get_applications_with_codes`
22. `get_facilitator_by_code`
23. `get_facilitator_code`
24. `get_opportunities_with_codes`
25. `safe_delete_startup_user`
26. `set_facilitator_code_on_opportunity`
27. `update_investment_advisor_relationship`
28. `update_startup_investment_advisor_relationship`

---

## 📝 Process

For each function:
1. Get function definition from database (use `GET_REMAINING_FUNCTION_DEFINITIONS.sql`)
2. Create migration script
3. Test script
4. Mark as complete

---

## 🚀 Starting with High Priority Functions

Creating migration scripts one by one, starting with `set_advisor_offer_visibility`...



