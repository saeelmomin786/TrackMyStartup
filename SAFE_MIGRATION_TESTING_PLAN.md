# Safe Migration Testing Plan

## ⚠️ Important: Testing Before Full Migration

These migration scripts change functions from `users` table to `user_profiles` table. While the logic is correct, we should test carefully to ensure nothing breaks.

---

## Migration Impact Analysis

### Function: `accept_investment_offer_with_fee`
**Current Usage:**
- Used when accepting investment offers
- Checks if investor/startup has advisor
- Calculates scouting fees

**Migration Changes:**
- Changed from `FROM public.users` to `FROM public.user_profiles`
- Added role filter: `AND up.role = 'Investor'`
- Uses `email` to find investor (same as before)

**Risk Level:** 🟡 **MEDIUM**
- Logic is equivalent
- But uses different table structure
- Should test with real offer acceptance

### Function: `get_offers_for_investment_advisor`
**Current Usage:**
- Used by advisor dashboard to show offers
- Gets advisor code from `users` table
- Joins with `users` to get investor names

**Migration Changes:**
- Gets advisor code from `user_profiles` instead of `users`
- Joins with `user_profiles` instead of `users`
- Added role filters

**Risk Level:** 🟡 **MEDIUM**
- Advisor dashboard might show different results
- Should test advisor view after migration

### Function: `should_reveal_contact_details`
**Current Usage:**
- Determines if contact details should be revealed
- Checks advisor codes from `users` table

**Migration Changes:**
- Gets investor advisor code from `user_profiles` instead of `users`
- Logic remains the same

**Risk Level:** 🟢 **LOW**
- Less critical function
- Logic unchanged

---

## Safe Testing Approach

### Option 1: Test One Function at a Time (RECOMMENDED)

1. **Run script 1:** `MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql`
2. **Test:** Try accepting an offer in the app
3. **Verify:** Check if fees are calculated correctly, status updates properly
4. **If OK:** Proceed to next script
5. **If issues:** Revert (we can restore from backup or recreate old function)

### Option 2: Backup First

1. **Backup current functions:**
```sql
-- Save current function definitions
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname IN (
    'accept_investment_offer_with_fee',
    'get_offers_for_investment_advisor',
    'should_reveal_contact_details'
);
```

2. **Run migration scripts**
3. **Test thoroughly**
4. **If issues:** Restore from backup

---

## What to Test After Migration

### 1. `accept_investment_offer_with_fee`
- [ ] Accept an investment offer
- [ ] Verify scouting fees are calculated
- [ ] Verify status updates correctly
- [ ] Verify advisor approval flow still works

### 2. `get_offers_for_investment_advisor`
- [ ] Login as investment advisor
- [ ] Check advisor dashboard shows offers
- [ ] Verify investor names display correctly
- [ ] Verify filtering works (by advisor code)

### 3. `should_reveal_contact_details`
- [ ] Accept an offer (if allowed by workflow)
- [ ] Verify contact details reveal logic works
- [ ] Test with offers that have advisors
- [ ] Test with offers that don't have advisors

---

## Rollback Plan

If something breaks:

1. **Restore old function** (if you saved the definition)
2. **Or recreate from previous migration script**
3. **Or use the original code** from `UPDATED_INVESTMENT_FLOW_SCHEMA.sql`

The old functions used:
- `FROM public.users`
- `LEFT JOIN public.users`

We can recreate them if needed.

---

## Recommendation

**Safe Approach:**
1. ✅ Test in development/staging first (if available)
2. ✅ Run scripts one at a time
3. ✅ Test each function immediately after migration
4. ✅ Have rollback plan ready

**If everything works:**
- The migration is safe because:
  - We're using the same logic
  - `user_profiles` has the same data (we ensured this during migration)
  - We're just querying a different table

---

## Current Status

**Already working with `user_profiles`:**
- ✅ `create_investment_offer_with_fee` - Already migrated and working
- ✅ `create_co_investment_offer` - Already migrated and working
- ✅ `approve_startup_offer` - Already migrated and working

**So the pattern is proven** - we're just extending it to these 3 functions.



