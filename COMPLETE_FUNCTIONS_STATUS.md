# Complete Functions Status (Out of 249 Total)

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

**Status:** ✅ **10 functions fully migrated (4% of total)**

---

## ⚠️ Has Fallback Logic (NEEDS CLEANUP) - 1 function

1. ⚠️ `accept_startup_advisor_request` - Uses both tables (has fallback)

**Action Needed:** Remove fallback, use `user_profiles` only

**Status:** ⚠️ **1 function needs cleanup (0.4% of total)**

---

## ❌ NOT MIGRATED (Still Using users Table) - 30 functions

### High Priority (Already Have Migration Scripts):
1. ❌ `get_advisor_clients` - **Script ready: MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql**
2. ❌ `get_advisor_investors` - **Script ready: MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql**
3. ❌ `get_all_co_investment_opportunities` - **Script ready: MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql**
4. ❌ `get_center_by_user_email` - **Script ready: MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql**
5. ❌ `get_co_investment_opportunities_for_user` - **Script ready: MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql**

### Need Migration Scripts Created:
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

**Status:** ❌ **30 functions need migration (12% of total)**

---

## ➖ Not Related (Don't Use User Tables) - ~208 functions

These functions don't use `users` or `user_profiles` tables, so no migration needed.

**Status:** ➖ **~208 functions not related (84% of total)**

---

## Summary Statistics

| Category | Count | % of Total |
|----------|-------|------------|
| ✅ **Fully Migrated** | **10** | **4%** |
| ⚠️ **Has Fallback** | **1** | **0.4%** |
| ❌ **Not Migrated** | **30** | **12%** |
| ➖ **Not Related** | **~208** | **84%** |
| **TOTAL** | **249** | **100%** |

---

## Next Steps

### Priority 1: Remove Fallback (1 function)
- [ ] `accept_startup_advisor_request` - Remove fallback logic

### Priority 2: Run Ready Migration Scripts (5 functions)
- [ ] Run `MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql`

### Priority 3: Create Migration Scripts (25 functions)
- Create optimized migration scripts for remaining 25 functions

---

## Progress

**Completed:** 10/41 functions using user tables = **24% complete**
**Remaining:** 31 functions (1 with fallback + 30 not migrated)


