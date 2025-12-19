# Quick Status Summary

## Total Functions in Database: **262**

## Currently Known Status (from our analysis):

### ✅ Fully Migrated (user_profiles only, NO fallback): **6 functions**
- `get_user_role()`
- `get_current_profile_safe()`
- `get_user_public_info()`
- `accept_investment_offer_with_fee()`
- `get_offers_for_investment_advisor()`
- `should_reveal_contact_details()`

### ⏳ Migration Scripts Ready: **5 functions**
- `get_co_investment_opportunities_for_user()`
- `get_advisor_clients()`
- `get_center_by_user_email()`
- `get_all_co_investment_opportunities()`
- `get_advisor_investors()`

### ❌ Still Need Migration: **~8-10 functions** (from our known list)
- `get_startup_by_user_email()`
- `get_user_profile()`
- `set_advisor_offer_visibility()`
- And more...

---

## To Get Complete Status of ALL 262 Functions:

**Run:** `CHECK_ALL_FUNCTIONS_FOR_USERS_TABLE.sql`

This script will:
- Check ALL 262 functions
- Identify which ones use `users` table
- Identify which ones use `user_profiles` table  
- Identify which ones have fallback logic
- Provide complete summary counts

**Expected Output:**
- Count of functions using `users` table only
- Count of functions using `user_profiles` table only (migrated)
- Count of functions with fallback logic (need cleanup)
- List of all functions that need migration

---

## Estimated Breakdown (out of 262):

| Category | Estimated | Notes |
|----------|-----------|-------|
| **Not related to users/user_profiles** | ~240+ | Functions that don't touch user tables |
| **Fully migrated** | **6** | ✅ Complete |
| **Using users table** | **~15-20** | ❌ Need migration |
| **Has fallback** | **~0-5** | ⚠️ Need cleanup |

**Note:** Most of the 262 functions likely don't use user tables at all. We're focused on the ~15-25 functions that do.


