# Migration Status: users → user_profiles

## ✅ Already Migrated (Confirmed Working)

### SQL Functions
1. ✅ `create_investment_offer_with_fee` - Uses `user_profiles` (updated in `UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql`)
2. ✅ `create_co_investment_offer` - Uses `user_profiles` (already migrated)
3. ✅ `approve_investor_advisor_offer` - Uses `user_profiles` (fixed in `RESTORE_WORKING_APPROVE_FUNCTION.sql`)
4. ✅ `approve_startup_advisor_offer` - Fixed to use proper enum values (`FIX_STARTUP_ADVISOR_APPROVE_FUNCTION.sql`)
5. ✅ `approve_startup_offer` - Fixed to use `user_profiles` (`FIX_STARTUP_APPROVE_FUNCTION_FOR_USER_PROFILES.sql`)

### RLS Policies
1. ✅ `investment_offers` RLS policies - Updated to use `user_profiles` (`FIX_INVESTMENT_OFFERS_RLS_FOR_USER_PROFILES.sql`)

### Database Schema
1. ✅ All foreign keys migrated to indexes (no FK constraints on `user_profiles.auth_user_id` due to non-uniqueness)
2. ✅ All tables using indexes instead of FKs pointing to `user_profiles`

---

## ⚠️ Needs Verification

### SQL Functions to Check
Run `CHECK_REMAINING_USERS_TABLE_REFERENCES.sql` to verify these don't use `users` table:

1. **Co-investment approval functions:**
   - `approve_co_investment_offer_investor_advisor`
   - `approve_co_investment_offer_lead_investor`
   - `approve_co_investment_offer_startup`

2. **Other functions:**
   - `set_lead_investor_info` (trigger function) - Already checked in `UPDATE_LEAD_INVESTOR_TRIGGER_FOR_USER_PROFILES.sql`
   - Any other approval/creation functions

### RLS Policies to Check
Run the diagnostic script to check if any RLS policies on these tables still reference `users`:
- `co_investment_offers`
- `co_investment_opportunities`
- Other tables with RLS

---

## 📋 Action Items

### Step 1: Run Diagnostic Script
Run `CHECK_REMAINING_USERS_TABLE_REFERENCES.sql` in Supabase SQL Editor to get a complete list of what still references `users`.

### Step 2: Review Results
Check the output for:
- Functions that still use `FROM public.users` or `JOIN users`
- RLS policies that reference `users` table
- Views that reference `users` table
- Triggers that might use `users` table

### Step 3: Migrate Remaining Items
Based on the diagnostic results, create fix scripts similar to the ones we've already created.

---

## 🔍 Files to Check

These files might still have old references (check if they're still in use):
- Old SQL migration files (can be ignored if already run)
- `lib/database.ts` - Already checked, uses `user_profiles`
- Frontend components - Should use API/DB functions, not direct `users` table queries

---

## ✅ Recent Fixes Applied

1. **Startup Advisor Approval** - Fixed enum value bug (`'approve'` → `'approved'`)
2. **Startup Final Approval** - Migrated to `user_profiles` table
3. **RLS Policies** - Updated `investment_offers` RLS to use `user_profiles`
4. **Race Condition** - Fixed TypeScript code to skip `handleInvestmentFlow` when SQL function already updates stage

---

## Next Steps

1. **Run the diagnostic script** (`CHECK_REMAINING_USERS_TABLE_REFERENCES.sql`)
2. **Review the output** and identify what still needs migration
3. **Create fix scripts** for any remaining references
4. **Test thoroughly** after each fix

