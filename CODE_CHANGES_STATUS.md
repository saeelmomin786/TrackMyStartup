# Code Changes Status After Migration

## ✅ Already Updated (Done Earlier)

### 1. lib/database.ts
- ✅ `handleInvestmentFlow()` - Updated to use `user_profiles` instead of `users`
- ✅ Uses: `investor:user_profiles!investment_offers_investor_id_fkey(...)`
- ✅ Field changed: `id` → `auth_user_id`

### 2. components/InvestorView.tsx
- ✅ Co-investment offer queries updated
- ✅ Uses: `investor:user_profiles!co_investment_offers_investor_id_fkey(...)`
- ✅ Field changed: `id` → `auth_user_id`

### 3. components/startup-health/StartupDashboardTab.tsx
- ✅ Co-investment offer queries updated
- ✅ Uses: `user_profiles` instead of `users`

---

## ⚠️ POTENTIAL ISSUE: Foreign Key Join Syntax

Since we created **indexes** instead of **FK constraints** (due to multi-profile system), the Supabase `.select()` join syntax might not work.

**The join syntax `user_profiles!investment_offers_investor_id_fkey` requires an actual FK constraint, not just an index.**

### If Joins Don't Work:
You may need to manually fetch related data instead of using Supabase's automatic join syntax.

**Example fix:**
```typescript
// Instead of:
.select(`
  *,
  investor:user_profiles!investment_offers_investor_id_fkey(auth_user_id, name, email)
`)

// Do:
.select('*')  // Get offer first
// Then manually fetch investor:
const { data: investor } = await supabase
  .from('user_profiles')
  .select('auth_user_id, name, email')
  .eq('auth_user_id', offer.investor_id)
  .eq('role', 'Investor')
  .single();
```

---

## ✅ What Still Works (No Changes Needed)

- ✅ All SQL functions - Already updated to use `user_profiles`
- ✅ All application logic - Already uses `user_profiles` via `getCurrentUser()`
- ✅ New registrations - Already create `user_profiles` rows
- ✅ Authentication - No changes needed (uses `auth.users`)

---

## 📋 Action Items

### 1. Test the Application First
- Try submitting an offer
- Check if the joins work or if you get errors

### 2. If Join Errors Occur:
- Update queries to fetch related data manually
- Or create views/functions that handle the joins

### 3. Verify These Work:
- [ ] New investor can submit offer
- [ ] Offer data displays correctly (investor name, etc.)
- [ ] Advisor dashboard shows offers
- [ ] All join queries return data correctly

---

## Summary

**Most code is already updated!** The main thing to check is whether the Supabase join syntax still works without FK constraints. If it doesn't, you'll need to fetch related data manually, but the core functionality will work.

