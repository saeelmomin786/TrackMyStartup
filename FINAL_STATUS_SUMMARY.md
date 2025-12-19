# Final Status Summary (Out of 249 Functions)

## ✅ Fully Migrated to user_profiles (NO FALLBACK) - 10 functions

1. ✅ `check_email_exists`
2. ✅ `create_co_investment_offer`
3. ✅ `create_investment_offer_with_fee`
4. ✅ `get_auth_user_id_from_profile`
5. ✅ `get_offers_for_investment_advisor`
6. ✅ `get_user_profiles`
7. ✅ `get_user_public_info`
8. ✅ `get_user_role`
9. ✅ `set_lead_investor_info`
10. ✅ `switch_profile`

**Status:** ✅ **10 functions (4% of total, 24% of functions using user tables)**

---

## ⚠️ Has Fallback Logic - 1 function

1. ⚠️ `accept_startup_advisor_request` - **Migration script ready: MIGRATE_ACCEPT_STARTUP_ADVISOR_REQUEST_FUNCTION.sql**

**Status:** ⚠️ **1 function (0.4% of total) - Script ready to remove fallback**

---

## ❌ NOT MIGRATED (Still Using users Table) - 30 functions

### Migration Scripts Ready (5 functions):
1. ❌ `get_advisor_clients` - **MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql**
2. ❌ `get_advisor_investors` - **MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql**
3. ❌ `get_all_co_investment_opportunities` - **MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql**
4. ❌ `get_center_by_user_email` - **MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql**
5. ❌ `get_co_investment_opportunities_for_user` - **MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql**

### Need Migration Scripts (25 functions):
6. ❌ `assign_evaluators_to_application`
7. ❌ `assign_facilitator_code`
8. ❌ `assign_mentor_code`
9. ❌ `create_advisor_relationships_automatically`
10. ❌ `create_existing_investment_advisor_relationships`
11. ❌ `create_investment_offers_automatically`
12. ❌ `create_missing_offers`
13. ❌ `create_missing_relationships`
14. ❌ `generate_ca_code`
15. ❌ `generate_cs_code`
16. ❌ `generate_facilitator_code`
17. ❌ `generate_investment_advisor_code`
18. ❌ `generate_investor_code`
19. ❌ `generate_mentor_code`
20. ❌ `get_applications_with_codes`
21. ❌ `get_due_diligence_requests_for_startup`
22. ❌ `get_facilitator_by_code`
23. ❌ `get_facilitator_code`
24. ❌ `get_investment_advisor_investors`
25. ❌ `get_investment_advisor_startups`
26. ❌ `get_investor_recommendations`
27. ❌ `get_opportunities_with_codes`
28. ❌ `get_startup_by_user_email`
29. ❌ `safe_delete_startup_user`
30. ❌ `set_advisor_offer_visibility`
31. ❌ `set_facilitator_code_on_opportunity`
32. ❌ `simple_deletion_test`
33. ❌ `simple_test_startup_user_deletion`
34. ❌ `update_investment_advisor_relationship`
35. ❌ `update_startup_investment_advisor_relationship`

**Status:** ❌ **30 functions (12% of total) - 5 scripts ready, 25 need scripts**

---

## Summary

| Category | Count | % of 249 Total | % of 41 Using User Tables |
|----------|-------|----------------|---------------------------|
| ✅ **Fully Migrated** | **10** | **4%** | **24%** |
| ⚠️ **Has Fallback** | **1** | **0.4%** | **2%** |
| ❌ **Not Migrated** | **30** | **12%** | **73%** |
| ➖ **Not Related** | **~208** | **84%** | - |
| **TOTAL** | **249** | **100%** | **100%** |

---

## Progress

**Completed:** 10/41 functions = **24% complete**
**Scripts Ready:** 6 functions (1 fallback cleanup + 5 migrations)
**Remaining:** 25 functions need migration scripts

---

## Next Steps

1. **Run 6 ready scripts** (1 fallback cleanup + 5 migrations)
2. **Create scripts** for remaining 25 functions
3. **Test all functions**
4. **Delete users table** when complete


