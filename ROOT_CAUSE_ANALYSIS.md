# Root Cause Analysis: Investment Advisor Data Not Loading

## The Problem

Data exists in Supabase but is not loading in many sections of the Investment Advisor Dashboard:
- ❌ Mandate section not showing data
- ❌ Cannot add new mandates
- ❌ Many sections not loading data
- ❌ Cannot add data in many places

## Root Cause

**The frontend is using `currentUser.id` (profile ID) but RLS policies expect `auth.uid()` (auth user ID).**

### Why This Happens

1. **Two Different User IDs:**
   - `currentUser.id` = Profile ID from `user_profiles` table (UUID, can be different)
   - `auth.uid()` = Authentication user ID from `auth.users` table (UUID, used by RLS)

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

4. **Mismatch = No Data:**
   - Frontend queries with `advisor_id = profile_id`
   - RLS policy checks `advisor_id = auth.uid()`
   - If `profile_id ≠ auth.uid()`, RLS blocks the query
   - Result: No data returned

## The Fix

### Step 1: Update Services to Use `auth.uid()`

All services that interact with RLS-protected tables must:
1. Get `auth.uid()` from `supabase.auth.getUser()`
2. Use `auth.uid()` in queries instead of `currentUser.id`

**Example Fix:**
```typescript
// ✅ CORRECT - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || advisorId;
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', authUserId); // Uses auth.uid()
```

### Step 2: Fix RLS Policies

Ensure all RLS policies use `auth.uid()` correctly:
```sql
CREATE POLICY "Advisors can view their own mandates"
ON public.advisor_mandates FOR SELECT
USING (advisor_id = auth.uid())  -- ✅ Uses auth.uid()
```

### Step 3: Fix Frontend Components

Update components to pass the correct ID, but services should handle `auth.uid()` internally.

## Tables Affected

All tables with FK to `users(id)` that Investment Advisors access:
1. ✅ `advisor_mandates` - Fixed
2. ✅ `advisor_mandate_investors` - Fixed
3. ✅ `advisor_added_investors` - Already fixed
4. ✅ `advisor_added_startups` - Already fixed
5. ✅ `investment_advisor_recommendations` - Already fixed
6. ✅ `due_diligence_requests` - Already fixed
7. ⚠️ Other tables may need similar fixes

## Solution Files

1. **`FIX_ALL_INVESTMENT_ADVISOR_RLS_ISSUES.sql`** - Fixes RLS policies for mandates
2. **`lib/advisorMandateService.ts`** - Updated to use `auth.uid()`
3. **`COMPREHENSIVE_RLS_DIAGNOSTIC.sql`** - Diagnostic script to find all issues

## Next Steps

1. Run `COMPREHENSIVE_RLS_DIAGNOSTIC.sql` to identify all problematic tables
2. Run `FIX_ALL_INVESTMENT_ADVISOR_RLS_ISSUES.sql` to fix mandate RLS policies
3. Update all other services that use `currentUser.id` to use `auth.uid()` instead
4. Test each section of the Investment Advisor Dashboard

## Prevention

**Always use `auth.uid()` for RLS-protected queries:**
- ✅ `const { data: { user } } = await supabase.auth.getUser(); const userId = user?.id;`
- ❌ `const userId = currentUser.id;` (unless you're sure it's the same as auth.uid())





