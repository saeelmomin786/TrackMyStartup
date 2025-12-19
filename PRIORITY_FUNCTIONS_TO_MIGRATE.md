# Priority Functions to Migrate (from full function list)

## ✅ Already Migrated (NO FALLBACKS):
1. ✅ `get_user_role()`
2. ✅ `get_current_profile_safe()`
3. ✅ `get_user_public_info()`
4. ✅ `accept_investment_offer_with_fee()`
5. ✅ `get_offers_for_investment_advisor()`
6. ✅ `should_reveal_contact_details()`
7. ✅ `get_co_investment_opportunities_for_user()` - Script created

## 🔄 High Priority - Create Migration Scripts NOW:

### Functions We Know Use `users` Table:
1. [ ] `get_advisor_clients(advisor_id uuid)` - Found in FIX_ENUM_CASTING.sql
2. [ ] `get_advisor_investors(advisor_id uuid)` - Found in FIX_INFINITE_RECURSION_RLS_POLICY.sql
3. [ ] `get_all_co_investment_opportunities()` - Found in CO_INVESTMENT_OPPORTUNITIES_SCHEMA.sql
4. [ ] `get_center_by_user_email(user_email text)` - Found in ADD_CENTER_NAME_COLUMN.sql
5. [ ] `get_startup_by_user_email(user_email text)` - Likely uses users table
6. [ ] `get_user_profile(p_user_id uuid)` - Likely uses users table
7. [ ] `set_advisor_offer_visibility(...)` - Need to check

## 🔍 Medium Priority - Need to Verify:

8. [ ] `get_due_diligence_requests_for_startup(p_startup_id text)` - Check if uses users
9. [ ] `get_investor_recommendations(p_investor_id uuid)` - Check if uses users
10. [ ] `get_investment_advisor_investors(advisor_id uuid)` - Check if uses users
11. [ ] `get_investment_advisor_startups(advisor_id uuid)` - Check if uses users
12. [ ] `get_recommended_co_investment_opportunities(p_investor_id uuid)` - Check if uses users

## Next Steps:

1. Create migration scripts for High Priority functions (1-7)
2. Test each migration
3. Then check Medium Priority functions


