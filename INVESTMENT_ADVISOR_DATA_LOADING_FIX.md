# Investment Advisor Data Loading Fix

## Problem Summary

**Data exists in Supabase but is not loading in many sections of the Investment Advisor Dashboard:**
- ❌ Mandate section not showing data
- ❌ Cannot add new mandates
- ❌ Many other sections not loading data
- ❌ Cannot add data in many places

## Root Cause

**The frontend uses `currentUser.id` (profile ID) but RLS policies expect `auth.uid()` (auth user ID).**

### The Issue

1. **Two Different User IDs:**
   - `currentUser.id` = Profile ID from `user_profiles` table
   - `auth.uid()` = Authentication user ID from `auth.users` table

2. **RLS Policies Check `auth.uid()`:**
   ```sql
   CREATE POLICY "Advisors can view their own mandates"
   USING (advisor_id = auth.uid())  -- Checks auth.uid(), NOT profile ID
   ```

3. **Frontend Uses Profile ID:**
   ```typescript
   // ❌ WRONG - Uses profile ID
   await advisorMandateService.getMandatesByAdvisor(currentUser.id);
   ```

4. **Result:** RLS blocks queries because `profile_id ≠ auth.uid()`

## Solution

### Step 1: Run Diagnostic Script

Run `COMPREHENSIVE_RLS_DIAGNOSTIC.sql` to identify all problematic tables:
```sql
-- This will show:
-- 1. Tables with RLS but no policies
-- 2. Tables missing SELECT policies
-- 3. Tables with policies that don't use auth.uid()
-- 4. Tables with profile ID fallback (problematic)
```

### Step 2: Fix RLS Policies

Run `FIX_ALL_INVESTMENT_ADVISOR_RLS_ISSUES.sql` to fix mandate RLS policies:
```sql
-- This fixes:
-- 1. advisor_mandates RLS policies
-- 2. advisor_mandate_investors RLS policies
-- 3. Ensures all policies use auth.uid()
```

### Step 3: Update Services

**Already Fixed:**
- ✅ `lib/advisorMandateService.ts` - Now uses `auth.uid()`
- ✅ `lib/advisorAddedInvestorService.ts` - Already fixed
- ✅ `lib/advisorAddedStartupService.ts` - Already fixed

**Need to Check:**
- ⚠️ Other services that use `currentUser.id` for RLS-protected queries

### Step 4: Test Each Section

After fixes, test:
1. ✅ Mandate section - Should now load and allow adding
2. ✅ My Investors - Should show TMS investors
3. ✅ My Startups - Should show startups
4. ✅ Discover Pitches - Should show due diligences and recommendations
5. ✅ Other sections - Check each one

## Files Changed

1. **`lib/advisorMandateService.ts`**
   - `getMandatesByAdvisor()` - Now uses `auth.uid()`
   - `createMandate()` - Now uses `auth.uid()`

2. **`FIX_ALL_INVESTMENT_ADVISOR_RLS_ISSUES.sql`**
   - Fixes RLS policies for `advisor_mandates`
   - Fixes RLS policies for `advisor_mandate_investors`

3. **`COMPREHENSIVE_RLS_DIAGNOSTIC.sql`**
   - Diagnostic script to find all RLS issues

## How to Fix Other Sections

If other sections still don't load data:

1. **Check the service file** (e.g., `lib/xxxService.ts`)
2. **Find queries that use `currentUser.id`**
3. **Replace with `auth.uid()`:**
   ```typescript
   // Before
   const { data } = await supabase
     .from('table')
     .select('*')
     .eq('user_id', currentUser.id);
   
   // After
   const { data: { user: authUser } } = await supabase.auth.getUser();
   const authUserId = authUser?.id || currentUser.id;
   const { data } = await supabase
     .from('table')
     .select('*')
     .eq('user_id', authUserId);
   ```

4. **Check RLS policies** - Ensure they use `auth.uid()`

## Prevention

**Always use `auth.uid()` for RLS-protected queries:**
- ✅ `const { data: { user } } = await supabase.auth.getUser(); const userId = user?.id;`
- ❌ `const userId = currentUser.id;` (unless you're sure it's the same as auth.uid())

## Next Steps

1. ✅ Run `COMPREHENSIVE_RLS_DIAGNOSTIC.sql` to see all issues
2. ✅ Run `FIX_ALL_INVESTMENT_ADVISOR_RLS_ISSUES.sql` to fix mandates
3. ⚠️ Check other services and fix them similarly
4. ⚠️ Test each section of the dashboard
5. ⚠️ Fix any remaining issues found





