# Migration Scripts Summary - OPTIMIZED (No Fallbacks)

## ✅ Migration Scripts Created (10 functions)

### Already Migrated & Verified (6):
1. ✅ `get_user_role()` - MIGRATE_GET_USER_ROLE_FUNCTION.sql
2. ✅ `get_current_profile_safe()` - MIGRATE_GET_CURRENT_PROFILE_SAFE_FUNCTION.sql
3. ✅ `get_user_public_info()` - MIGRATE_GET_USER_PUBLIC_INFO_FUNCTION.sql
4. ✅ `accept_investment_offer_with_fee()` - MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql (already done)
5. ✅ `get_offers_for_investment_advisor()` - MIGRATE_GET_OFFERS_FOR_ADVISOR_FUNCTION.sql (already done)
6. ✅ `should_reveal_contact_details()` - MIGRATE_SHOULD_REVEAL_CONTACT_DETAILS_FUNCTION.sql (already done)

### New Migration Scripts Created (4):
7. ✅ `get_co_investment_opportunities_for_user()` - MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql
8. ✅ `get_advisor_clients()` - MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql
9. ✅ `get_center_by_user_email()` - MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql
10. ✅ `get_all_co_investment_opportunities()` - MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql
11. ✅ `get_advisor_investors()` - MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql

---

## 🔄 Still Need Migration Scripts

12. [ ] `get_startup_by_user_email()` - Need to find definition
13. [ ] `get_user_profile()` - Need to find definition
14. [ ] `set_advisor_offer_visibility()` - Need to find definition
15. [ ] `get_due_diligence_requests_for_startup()` - Check if uses users
16. [ ] `get_investor_recommendations()` - Check if uses users
17. [ ] `get_investment_advisor_investors()` - Check if uses users (might be same as get_advisor_investors)
18. [ ] `get_investment_advisor_startups()` - Check if uses users
19. [ ] `get_recommended_co_investment_opportunities()` - Check if uses users

---

## Migration Order (Recommended)

### Batch 1: Run these first (most important):
1. `MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql`
2. `MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql`
3. `MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql`

### Batch 2: Run these next:
4. `MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql`
5. `MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql`

### Batch 3: Create scripts for remaining functions
6. Continue with remaining functions...

---

## All Scripts Follow:
- ✅ NO FALLBACKS - Only query `user_profiles`
- ✅ OPTIMIZED - Single table queries where possible
- ✅ Use `auth_user_id` for matching
- ✅ Most recent profile if multiple: `ORDER BY created_at DESC LIMIT 1`
- ✅ Clean code - No conditional fallback logic



