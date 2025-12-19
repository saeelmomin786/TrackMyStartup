# Query Fixes Summary

## Issues Fixed

### Problem
After migration to `user_profiles` table with indexes instead of FK constraints, Supabase's automatic join syntax `table!constraint_name` stopped working because:
- We removed FK constraints (needed for multi-profile system)
- Created indexes instead (for performance)
- Supabase's join syntax requires FK constraints to work

### Errors Fixed
1. ❌ `listed_by_user:users!fk_listed_by_user_id(...)` - 400 errors
2. ❌ `investor:users!investment_offers_investor_email_fkey(...)` - 400 errors  
3. ❌ `investor:user_profiles!investment_offers_investor_id_fkey(...)` - 400 errors

---

## Files Updated

### 1. `lib/database.ts`
- **Line 1845**: Removed `investor:user_profiles!investment_offers_investor_id_fkey` join
- **Line 1845-1847**: Now fetches `investor_id` and `startup_id` only
- **Line 1857-1877**: Added separate fetch for investor data from `user_profiles`
- **Line 1877-1884**: Added separate fetch for startup data from `startups`
- **Line 1889**: Updated to use `investorData` instead of `offer.investor`
- **Line 1890**: Updated to use `startupData` instead of `offer.startup`
- **Line 1921**: Updated to use `startupData` instead of `offer.startup`

### 2. `components/InvestmentAdvisorView.tsx`
- **Line 2501**: Removed `listed_by_user:users!fk_listed_by_user_id(...)` join
- **Line 2519**: Removed `listed_by_user:users!fk_listed_by_user_id(...)` join
- **Line 2995**: Removed `listed_by_user:users!fk_listed_by_user_id(...)` join
- **Line 3037**: Removed `listed_by_user:users!fk_listed_by_user_id(...)` join
- All replaced with just `listed_by_user_id` field

### 3. `lib/database.ts` (co_investment_opportunities)
- **Line 3304**: Removed `listed_by_user:users!fk_listed_by_user_id(...)` join
- Replaced with just `listed_by_user_id` field

---

## How Data is Now Fetched

### Before (Automatic Join - Broken):
```typescript
.select(`
  *,
  investor:user_profiles!investment_offers_investor_id_fkey(auth_user_id, name, email)
`)
```

### After (Separate Fetch - Working):
```typescript
// Step 1: Fetch offer with just IDs
.select('*, investor_id, startup_id')

// Step 2: Fetch investor data separately if needed
if (offer.investor_id) {
  const { data: investor } = await supabase
    .from('user_profiles')
    .select('auth_user_id, email, name, investment_advisor_code')
    .eq('auth_user_id', offer.investor_id)
    .eq('role', 'Investor')
    .single();
}
```

---

## Why This Works

1. ✅ **No FK constraints needed** - Direct queries work fine
2. ✅ **Multi-profile compatible** - Can filter by `role` to get correct profile
3. ✅ **Backward compatible** - Still works with old `users` table if needed
4. ✅ **Flexible** - Can fetch only what's needed, when needed

---

## What Still Works

- ✅ `startup:startups(*)` joins - Still work (FK constraint exists)
- ✅ `startup:startups!fk_startup_id(...)` joins - Still work (FK constraint exists)
- ✅ All other FK joins to `startups`, `new_investments`, etc. - Still work

Only joins to `users` and `user_profiles` were affected (and fixed).

---

## Testing Recommendations

1. ✅ Test investment offer submission (new investors)
2. ✅ Test advisor dashboard (should load offers correctly)
3. ✅ Test co-investment opportunities (should load without errors)
4. ✅ Test offer approval flows (should work correctly)

All 400 errors should now be resolved!

