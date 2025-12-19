# Known Functions Needing Migration (from codebase analysis)

## ✅ Already Migrated (NO FALLBACKS):
1. ✅ `get_user_role()`
2. ✅ `get_current_profile_safe()`
3. ✅ `get_user_public_info()`
4. ✅ `accept_investment_offer_with_fee()`
5. ✅ `get_offers_for_investment_advisor()`
6. ✅ `should_reveal_contact_details()`

## 🔄 Need Migration (Found in codebase):

### High Priority:
1. [ ] `get_co_investment_opportunities_for_user` - **Script created: MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql**
2. [ ] `get_all_co_investment_opportunities` - Uses `users` table (line 225 in CO_INVESTMENT_OPPORTUNITIES_SCHEMA.sql)
3. [ ] `get_advisor_clients` - Uses `users` table (found in FIX_ENUM_CASTING.sql)
4. [ ] `get_advisor_investors` - Uses `users` table (found in FIX_INFINITE_RECURSION_RLS_POLICY.sql)

### Need to Check:
5. [ ] `get_investor_recommendations`
6. [ ] `get_due_diligence_requests_for_startup`
7. [ ] `get_startup_by_user_email`
8. [ ] `set_advisor_offer_visibility`
9. [ ] `get_investment_advisor_investors`
10. [ ] `get_recommended_co_investment_opportunities`

---

## Next Steps:

1. **Option A:** Run `LIST_ALL_FUNCTIONS.sql` to see all functions, then check each one
2. **Option B:** I can create migration scripts for the known functions above (faster)

Which would you prefer?


