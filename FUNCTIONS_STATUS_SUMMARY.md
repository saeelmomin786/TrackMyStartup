# Functions Status Summary

## ✅ Fully Migrated to user_profiles (NO FALLBACK) - 6 functions

1. ✅ `get_user_role()` - Uses `user_profiles` only
2. ✅ `get_current_profile_safe()` - Uses `user_profiles` only
3. ✅ `get_user_public_info()` - Uses `user_profiles` only
4. ✅ `accept_investment_offer_with_fee()` - Uses `user_profiles` only
5. ✅ `get_offers_for_investment_advisor()` - Uses `user_profiles` only
6. ✅ `should_reveal_contact_details()` - Uses `user_profiles` only

**Total: 6 functions**

---

## 📝 Migration Scripts Created (Ready to Run) - 5 functions

7. ⏳ `get_co_investment_opportunities_for_user()` - Script ready
8. ⏳ `get_advisor_clients()` - Script ready
9. ⏳ `get_center_by_user_email()` - Script ready
10. ⏳ `get_all_co_investment_opportunities()` - Script ready
11. ⏳ `get_advisor_investors()` - Script ready

**Total: 5 functions with scripts ready**

---

## ❌ Still Using users Table (Need Migration) - 8+ functions

12. ❌ `get_startup_by_user_email()` - Still uses `users` table
13. ❌ `get_user_profile()` - Likely uses `users` table
14. ❌ `set_advisor_offer_visibility()` - Need to check
15. ❌ `get_due_diligence_requests_for_startup()` - Need to check
16. ❌ `get_investor_recommendations()` - Need to check
17. ❌ `get_investment_advisor_investors()` - Need to check
18. ❌ `get_investment_advisor_startups()` - Need to check
19. ❌ `get_recommended_co_investment_opportunities()` - Need to check

**Total: ~8+ functions still need migration**

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ **Fully Migrated** (user_profiles only, no fallback) | **6** | ~32% |
| ⏳ **Migration Script Ready** | **5** | ~26% |
| ❌ **Not Migrated** (still uses users) | **~8** | ~42% |
| **TOTAL** | **~19** | **100%** |

---

## ⚠️ Functions with Fallback Logic

Based on our analysis, we've **REMOVED ALL FALLBACKS** from:
- All 6 fully migrated functions
- All 5 migration scripts created

**Goal:** Zero functions with fallback logic ✅

---

## How to Check Status

### Option 1: Run Batch Check (Recommended)
Run: `BATCH_CHECK_FUNCTIONS_STATUS.sql`
- Checks all known functions
- Shows which use user_profiles vs users
- Identifies fallback logic
- Provides summary counts

### Option 2: Check Individual Function
Run: `CHECK_INDIVIDUAL_FUNCTION_USAGE.sql`
- Replace 'FUNCTION_NAME' with actual function name
- Shows detailed status for one function

---

## Next Steps

1. **Run batch check** to verify current status
2. **Run the 5 migration scripts** to migrate remaining functions
3. **Create scripts** for remaining ~8 functions
4. **Verify all functions** use `user_profiles` only (no fallbacks)
5. **Delete `users` table** when everything is migrated



