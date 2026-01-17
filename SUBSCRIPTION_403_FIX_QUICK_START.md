# 🚀 QUICK START: Fix Subscription 403 Error

## The Problem (What You're Seeing)

When investment advisor tries to create subscription:
- ❌ 400 error on auth token endpoint
- ❌ **403 Forbidden** on `/rest/v1/user_subscriptions?select=*`
- ❌ Cannot check if startup has bought premium

## The Root Cause

RLS (Row Level Security) policies on `user_subscriptions` table are either:
1. **Missing** - No policies deployed yet
2. **Broken** - Comparing `profile_id` with `auth_user_id` (never match)
3. **Outdated** - Using old `users` table instead of `user_profiles`

## The Fix (5 Minutes)

### Step 1: Open Supabase Console
1. Go to: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** tab
4. Click **New Query**

### Step 2: Deploy RLS Policies

**Copy-paste entire file contents from:**
```
CREATE_BILLING_RLS.sql
```

Into the SQL Editor query box and click **Run**

Wait ~10 seconds for completion.

### Step 3: Verify Fix Applied

Copy-paste this verification query and run it:

```sql
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual::text ILIKE '%user_profiles%' THEN '✅ CORRECT'
    ELSE '❌ WRONG TABLE'
  END as status
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;
```

**Expected Output:**
```
✅ user_subscriptions_admin_all - CORRECT
✅ user_subscriptions_user_insert - CORRECT  ← This one was missing (caused 403!)
✅ user_subscriptions_user_read - CORRECT
✅ user_subscriptions_user_update - CORRECT
```

### Step 4: Test in Your App

1. Log in as **Investment Advisor**
2. Go to **Credits** section
3. Click **Buy Credits**
4. Complete payment
5. Should NOT see 403 error anymore
6. Subscription should be created successfully

## What Changed

### Before (Broken)
```sql
-- RLS Policy tried to do this:
SELECT * FROM user_subscriptions 
WHERE user_id = auth.uid()

-- Problem: Never true!
-- user_id = ea07161a... (profile_id)
-- auth.uid() = abc123... (auth_user_id, different value!)
-- Result: 403 Forbidden - RLS blocks ALL access
```

### After (Fixed)
```sql
-- RLS Policy now does this:
SELECT * FROM user_subscriptions 
WHERE EXISTS (
  SELECT 1 FROM user_profiles up
  WHERE up.id = user_subscriptions.user_id 
  AND up.auth_user_id = auth.uid()
)

-- Now it works!
-- ✅ Finds matching profile
-- ✅ Checks auth_user_id matches current user
-- ✅ RLS allows access
```

## Troubleshooting

### If Still Getting 403 Error

1. **Check RLS is enabled:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_subscriptions';
```
Expected: `rowsecurity = true`

2. **Check policies reference `user_profiles`:**
```sql
SELECT policyname, qual::text 
FROM pg_policies 
WHERE tablename = 'user_subscriptions';
```
Expected: All show `user_profiles` in condition, NOT `users`

3. **If still broken, re-run `CREATE_BILLING_RLS.sql`** to force update

### If 400 Auth Error Persists

This is likely a separate auth session issue. Try:
1. Refresh the browser
2. Log out and log back in
3. Clear browser cache

### If Premium Check Still Shows "No Premium"

The fix unblocks the RLS issue. The premium checking should now work with the `hasUserBoughtPremium()` function in:
```
lib/premiumStatusChecker.ts
```

## Files Created for You

| File | Purpose |
|------|---------|
| `SUBSCRIPTION_CREATION_403_ERROR_DIAGNOSIS.md` | Complete detailed diagnosis |
| `SUBSCRIPTION_403_ERROR_DIAGNOSTIC_QUERIES.sql` | SQL queries to verify fix |
| `lib/premiumStatusChecker.ts` | Safe function to check premium status |

## Key Takeaways

✅ **Before:** RLS policies blocked subscription access (403 error)  
✅ **After:** RLS policies correctly identify users and allow access  
✅ **Result:** Subscriptions can be created, premium status can be checked  

**Estimated Time:** 5-10 minutes  
**Risk Level:** 🟢 Very Low (only changes security policies, no data loss)

---

**Need help?** Check `SUBSCRIPTION_CREATION_403_ERROR_DIAGNOSIS.md` for detailed troubleshooting.
