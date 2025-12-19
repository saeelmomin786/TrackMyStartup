# Current Migration Status - What's Done vs What's Left

## ✅ What's Already Migrated (Working in Production)

### Critical Functions - ALREADY MIGRATED ✅
1. ✅ `create_investment_offer_with_fee` - **MIGRATED** - Uses `user_profiles`
2. ✅ `create_co_investment_offer` - **MIGRATED** - Uses `user_profiles`
3. ✅ `approve_startup_offer` - **MIGRATED** - Uses `user_profiles`
4. ✅ `approve_investor_advisor_offer` - **MIGRATED** - No user lookup needed
5. ✅ `approve_startup_advisor_offer` - **MIGRATED** - No user lookup needed

### RLS Policies - ALREADY MIGRATED ✅
- ✅ `investment_offers` RLS policies - **MIGRATED** - Use `user_profiles`

---

## ⏳ Migration Scripts Created (Ready to Run)

### Critical Functions - Scripts Ready
6. ⏳ `accept_investment_offer_with_fee` - **Script created** (`MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql`)
7. ⏳ `get_offers_for_investment_advisor` - **Script created** (`MIGRATE_GET_OFFERS_FOR_ADVISOR_FUNCTION.sql`)
8. ⏳ `should_reveal_contact_details` - **Script created** (`MIGRATE_SHOULD_REVEAL_CONTACT_DETAILS_FUNCTION.sql`)

**Status:** Scripts are ready, but **NOT RUN YET**. Need to execute these in Supabase SQL Editor.

---

## ❌ Still Needs Migration

### Critical Functions (1 remaining)
9. ❌ `set_advisor_offer_visibility` - **Script not created yet**

### Frequently Used Functions (15 remaining)
- ❌ `get_user_role`
- ❌ `get_current_profile_safe`
- ❌ `get_user_public_info`
- ❌ `get_all_co_investment_opportunities`
- ❌ `get_co_investment_opportunities_for_user`
- ❌ `get_investor_recommendations`
- ❌ `get_due_diligence_requests_for_startup`
- ❌ `get_startup_by_user_email`
- ... and 7 more

### Utility Functions (6 remaining)
- Various utility/helper functions

### Views (2 remaining)
- ❌ `user_center_info`
- ❌ `v_incubation_opportunities`

### Foreign Keys (40 remaining)
- ❌ All 40 FKs still pointing to `users` table
- Need to convert to indexes (like we did for `investment_offers`)

---

## Summary

### ✅ Completed:
- 5 critical functions migrated (already working)
- Investment offers RLS policies migrated
- Database schema migrated (indexes instead of FKs for `investment_offers`)

### ⏳ Ready to Run:
- 3 migration scripts created (need to execute)

### ❌ Still TODO:
- 1 critical function (script needed)
- 21 other functions (scripts needed)
- 2 views (scripts needed)
- 40 foreign keys (conversion scripts needed)

---

## Action Required

**Run these 3 scripts in Supabase SQL Editor:**
1. `MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql`
2. `MIGRATE_GET_OFFERS_FOR_ADVISOR_FUNCTION.sql`
3. `MIGRATE_SHOULD_REVEAL_CONTACT_DETAILS_FUNCTION.sql`

Then test the investment flow to make sure everything still works!


