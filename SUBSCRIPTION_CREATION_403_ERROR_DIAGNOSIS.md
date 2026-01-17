# 🔴 SUBSCRIPTION CREATION 403 ERROR - ROOT CAUSE & FIX

## 📊 Problem Summary

When an investment advisor tries to create a subscription:
1. **400 error** on `dlesebbmlrewsbmqvuza.supabase.co/auth/v1/token?grant_type=password` - Auth token failure
2. **403 error** on `dlesebbmlrewsbmqvuza.supabase.co/rest/v1/user_subscriptions?select=*` - RLS blocking access
3. **Premium status check failing** - Cannot fetch whether a startup has bought premium

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue #1: 403 Error on user_subscriptions

**Location:** `dlesebbmlrewsbmqvuza.supabase.co/rest/v1/user_subscriptions?select=*`

**Root Cause:** Missing or incorrect RLS policies on `user_subscriptions` table

```sql
-- CURRENT BROKEN POLICY (if it exists):
SELECT * FROM user_subscriptions WHERE user_id = auth.uid()

-- PROBLEM:
-- user_id column stores profile_id (UUID like ea07161a-...)
-- auth.uid() returns auth_user_id (different UUID)
-- These NEVER match → RLS denies all access
```

**Evidence from code:**
- [CREATE_BILLING_RLS.sql](CREATE_BILLING_RLS.sql#L50-L70) shows policies using correct joins with `user_profiles`
- But these policies may not be deployed yet

---

### Issue #2: 400 Auth Token Error

**Location:** `auth/v1/token?grant_type=password`

**Root Cause:** Likely one of:
1. Invalid credentials being sent
2. User session expired
3. Auth token validation failing at Supabase API level

**Check:** 
- Verify auth session is valid with `getAuthUserId()`
- Check if user is properly authenticated in the component

---

### Issue #3: Cannot Check if Startup has Bought Premium

**Location:** Function `hasUserBoughtPremium()` or similar

**Root Cause:** Subscription fetch is blocked by RLS policies

**Code Flow:**
```
Investment Advisor Dashboard
  ↓
Toggle Credit Assignment ON
  ↓
handleToggleCreditAssignment()
  ↓
Tries to grant premium subscription
  ↓
Fetches user_subscriptions with RLS policy
  ↓
❌ 403 Forbidden - RLS denies access
```

---

## ✅ SOLUTION: Deploy RLS Policies

### Step 1: Verify RLS Policies Are Deployed

```sql
-- Check if policies exist and are correct
SELECT 
  tablename,
  policyname,
  qual::text as policy_condition
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'subscription_plans', 'coupons', 'payments')
ORDER BY tablename, policyname;
```

**Expected Output:**
- `user_subscriptions_user_read` - SELECT policy for authenticated users
- `user_subscriptions_user_insert` - INSERT policy for authenticated users ← **CRITICAL**
- `user_subscriptions_user_update` - UPDATE policy for authenticated users
- `user_subscriptions_admin_all` - ALL policy for admins

---

### Step 2: Apply RLS Fix

**File:** [CREATE_BILLING_RLS.sql](CREATE_BILLING_RLS.sql)

**How to Deploy:**

1. Open Supabase Dashboard → SQL Editor
2. Create New Query
3. Copy the entire contents of `CREATE_BILLING_RLS.sql`
4. Click **Run**
5. Wait for completion

**Key Policies Being Created:**

```sql
-- Users can INSERT their own subscriptions (FIXES 403 ERROR)
CREATE POLICY user_subscriptions_user_insert ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
);

-- Users can READ their own subscriptions
CREATE POLICY user_subscriptions_user_read ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
);

-- Admins can READ/INSERT/UPDATE all subscriptions
CREATE POLICY user_subscriptions_admin_all ON public.user_subscriptions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role = 'Admin'
  )
);
```

---

## 🧪 Verify Fix Worked

### Step 1: Check Policies Are Applied

```sql
-- Run this to verify policies exist
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual::text ILIKE '%user_profiles%' THEN '✅ Uses user_profiles (CORRECT)'
    WHEN qual::text ILIKE '%users%' THEN '❌ Uses old users table (BROKEN)'
    ELSE qual::text
  END as status
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- Expected:
-- ✅ user_subscriptions_user_read - Uses user_profiles (CORRECT)
-- ✅ user_subscriptions_user_insert - Uses user_profiles (CORRECT)
-- ✅ user_subscriptions_user_update - Uses user_profiles (CORRECT)
-- ✅ user_subscriptions_admin_all - Uses user_profiles (CORRECT)
```

### Step 2: Test Subscription Creation

1. Log in as Investment Advisor
2. Go to Credits section
3. Try to buy credits → Should NOT show 403 error
4. After payment succeeds → Should NOT show 403 error when creating subscription

### Step 3: Test Premium Status Check

1. Go to Management tab
2. Try to toggle credit assignment for a startup
3. Premium status should be readable
4. No 403 errors in browser console

---

## 🛠️ Troubleshooting

### If Still Getting 403 Error After Deployment

**Diagnosis:**

```sql
-- 1. Check if RLS is actually ENABLED on table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_subscriptions';

-- Expected: rowsecurity = true

-- 2. Check if policies reference correct table
SELECT 
  policyname,
  qual::text
FROM pg_policies
WHERE tablename = 'user_subscriptions';

-- Expected: All policies should have "user_profiles" in the condition
-- NOT "users" table
```

**Solutions:**

```sql
-- If RLS is not enabled:
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- If policies reference old "users" table:
-- Re-run CREATE_BILLING_RLS.sql to update them
```

### If auth/v1/token 400 Error Persists

**Likely Auth Session Issue:**

```typescript
// Check in browser console:
// Are these the same?
const { data: { user: authUser } } = await supabase.auth.getUser();
console.log('Auth User ID:', authUser?.id);

const profile = await supabase
  .from('user_profiles')
  .select('auth_user_id')
  .eq('id', currentUser.id)
  .single();
console.log('Profile Auth User ID:', profile.data?.auth_user_id);

// If different → ID system mismatch
// If same → Auth is working
```

---

## 📋 Complete Fix Checklist

- [ ] Open Supabase SQL Editor
- [ ] Copy `CREATE_BILLING_RLS.sql` entire contents
- [ ] Click Run to execute
- [ ] Verify policies deployed with verification query above
- [ ] Test subscription creation in Investment Advisor dashboard
- [ ] Test premium status checking
- [ ] No 403 errors in browser console
- [ ] Subscription record appears in database after payment

---

## 🎯 Expected Behavior After Fix

### Before Fix (Current Broken State)
```
Investment Advisor clicks "Pay for subscription"
    ↓
Payment gateway processes → SUCCESS ✅
    ↓
App tries to create subscription record
    ↓
POST /rest/v1/user_subscriptions
    ↓
RLS Policy Checks: user_id = auth.uid() ?
    ↓
❌ user_id is profile_id, auth.uid() is auth_user_id
❌ These don't match
❌ 403 Forbidden
    ↓
❌ User sees error: "Failed to create subscription"
❌ Payment succeeded but subscription not recorded
❌ Premium access not granted
```

### After Fix (Working State)
```
Investment Advisor clicks "Pay for subscription"
    ↓
Payment gateway processes → SUCCESS ✅
    ↓
App tries to create subscription record
    ↓
POST /rest/v1/user_subscriptions with profile_id
    ↓
RLS Policy Checks: 
  user_profiles.id = user_subscriptions.user_id ?
  AND user_profiles.auth_user_id = auth.uid() ?
    ↓
✅ BOTH conditions match
✅ INSERT policy allows creation
    ↓
✅ Subscription record created in database
✅ Premium access granted
✅ User sees success message
✅ Investment Advisor can now check premium status
```

---

## 📝 Files Referenced

- [CREATE_BILLING_RLS.sql](CREATE_BILLING_RLS.sql) - RLS policy SQL file
- [lib/advisorCreditService.ts](lib/advisorCreditService.ts) - Subscription creation code
- [lib/subscriptionService.ts](lib/subscriptionService.ts) - Premium status check code
- [FINANCIAL_MODEL_SCHEMA.sql](FINANCIAL_MODEL_SCHEMA.sql) - Subscription table schema

---

## 🚀 Next Steps

1. **Deploy RLS policies** using SQL file above
2. **Test subscription creation** in Investment Advisor dashboard
3. **Monitor browser console** for any new errors
4. **If issues persist**, run verification queries above to diagnose

**Estimated time:** 5-10 minutes
**Risk level:** 🟢 Very low (logic-only change, reversible)
