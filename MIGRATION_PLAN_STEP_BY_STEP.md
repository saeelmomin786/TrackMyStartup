# Step-by-Step Migration Plan

## Important: Frontend Impact Analysis

Before migrating each function, we need to check:
1. **Function signature** - Does it change? (If yes → frontend change needed)
2. **Return format** - Does it change? (If yes → frontend change needed)
3. **Internal implementation only** - Just changing table used? (No frontend change needed)

---

## Migration Order

### Step 1: Remaining Critical Function
- [ ] `set_advisor_offer_visibility` - Check frontend usage first

### Step 2: Frequently Used Functions (Check each one)
- [ ] `get_user_role`
- [ ] `get_current_profile_safe`
- [ ] `get_user_public_info`
- [ ] `get_all_co_investment_opportunities`
- [ ] `get_co_investment_opportunities_for_user`
- [ ] `get_investor_recommendations`
- [ ] `get_due_diligence_requests_for_startup`
- [ ] `get_startup_by_user_email`
- ... and more

### Step 3: Foreign Keys (40 total)
- **Frontend Impact:** ❌ **NONE** - Database-level change only
- Convert FKs to indexes (doesn't change API)

### Step 4: Views (2 total)
- **Frontend Impact:** ⚠️ **POSSIBLE** - Need to check if frontend queries these views directly

---

## Strategy for Each Function

1. **Check if function is used in frontend**
2. **Check function signature** - Does it change?
3. **Migrate function** - Keep same signature/return format
4. **Test** - Verify it still works
5. **Frontend changes** - Only if signature/return format changed

---

## Next Step

Let's start by checking `set_advisor_offer_visibility` function and its usage.


