# 🚀 RLS Policy Fix - Complete Deployment Guide

## 📋 Pre-Deployment Checklist

### Step 1: Run Verification Script (DO THIS FIRST)
1. Open Supabase SQL Editor
2. Copy and paste contents of **`RLS_FIX_VERIFICATION_CHECKLIST.sql`**
3. Click "Run" and review output
4. **Expected Result:** You should see ✅ ALL CHECKS PASSED

⚠️ **If you see ❌ FAILED checks:**
- Stop here
- Review the failed checks
- Contact support with the error details

---

### Step 2: Understand What Will Change

| Table | Current Policy | Issue | New Policy |
|-------|---|---|---|
| **user_subscriptions** | `user_id = auth.uid()` | Breaks because `user_id` is profile_id, not auth_user_id | Joins `user_profiles` to match correctly |
| **payments** | `user_id = auth.uid()` | Same issue | Joins `user_profiles` to match |
| **coupon_redemptions** | `user_id = auth.uid()` | Same issue | Joins `user_profiles` to match |
| **All (admin checks)** | References `users` table | `users` table deprecated | References `user_profiles` instead |

**Safety Level:** 🟢 **VERY LOW RISK**
- No data changes
- No schema changes  
- Only logic fixes
- Backward compatible

---

## 🔧 Deployment Steps

### Step 3: Apply the RLS Fix
1. In Supabase SQL Editor, create a **NEW query**
2. Copy entire contents of **`CREATE_BILLING_RLS.sql`** 
3. Click "Run"
4. Wait for completion (should take <5 seconds)
5. **Expected Result:** "Success" message with no errors

```sql
-- Example output you should see:
-- Policy subscription_plans_select ON subscription_plans has been created
-- Policy subscription_plans_admin_write ON subscription_plans has been created
-- ... (7 policies total for user_subscriptions)
```

⚠️ **If you get an error:**
- Note the error message
- It's likely due to one of these:
  - `user_profiles` table doesn't exist → **STOP, contact support**
  - `user_subscriptions` table doesn't exist → **STOP, contact support**
  - Policy already exists → This is OK, will be dropped and recreated

---

### Step 4: Test the Fix (In Your App)

#### Test 1: Premium User Login
```
1. Log in with your Premium test user
2. Expected: Redirect to dashboard (NOT subscription page)
3. Verify: "Current Plan: Premium" shows correctly
```

#### Test 2: Free User Login
```
1. Log in with your Free test user
2. Expected: Redirect to dashboard (NOT subscription page)
3. Verify: "Current Plan: Free" shows correctly
```

#### Test 3: No Subscription User
```
1. Log in with a new user (no subscription)
2. Expected: Redirect to subscription page
3. Verify: Can select Free/Basic/Premium plan
```

#### Test 4: Upgrade Flow
```
1. Login with Free user
2. Try to upgrade to Basic/Premium
3. Expected: Payment processes and subscription updates
4. Verify: New plan shows after refresh
```

---

## 🔍 Verification Queries (Optional - Run After Deployment)

### Check 1: Verify subscription is accessible
```sql
-- Run as yourself (authenticated user with a subscription)
SELECT user_id, plan_tier, status 
FROM public.user_subscriptions 
WHERE status = 'active' 
LIMIT 1;

-- Expected: Returns your subscription (not empty/null)
```

### Check 2: Verify admin can see all
```sql
-- Run as admin user
SELECT COUNT(*) as total_subscriptions
FROM public.user_subscriptions;

-- Expected: Returns total count of all subscriptions
```

### Check 3: Verify RLS policies are applied
```sql
-- Check current policies
SELECT tablename, policyname, qual::text
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- Expected: See 3 new policies with user_profiles joins (not users table)
```

---

## 🚨 Troubleshooting

### Problem: "Still redirecting to subscription page after login"
**Cause:** Subscription query still returning NULL
**Solution:**
1. Run verification query Check 1 above
2. If empty, check: Did subscription actually save to database?
3. Check: Is auth_user_id correctly set in user_profiles?

### Problem: "Admin can't see subscriptions"
**Cause:** Admin check in policy broken
**Solution:**
1. Verify admin user has `role = 'Admin'` in user_profiles
2. Verify admin's `auth_user_id` is set
3. Run verification query Check 2 above

### Problem: "Error when running CREATE_BILLING_RLS.sql"
**Cause:** Likely policy already exists with that name
**Solution:**
1. The SQL includes DROP POLICY statements first
2. This shouldn't cause errors
3. If it does, check Supabase logs for details

---

## ✅ Post-Deployment Checklist

- [ ] Run `RLS_FIX_VERIFICATION_CHECKLIST.sql` - all checks passed
- [ ] Run `CREATE_BILLING_RLS.sql` - no errors
- [ ] Test Premium user login - redirects to dashboard
- [ ] Test Free user login - redirects to dashboard
- [ ] Test new user - redirects to subscription page
- [ ] Test upgrade flow - works correctly
- [ ] Check subscription is visible in app
- [ ] Verify payment processes work
- [ ] Admins can access admin features

---

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback:

1. Go to Supabase SQL Editor
2. Find and run the **ORIGINAL** CREATE_BILLING_RLS.sql (before fixes)
3. This will recreate the old (broken) policies
4. Everything reverts to previous state

---

## 📞 Support Info

If you encounter issues:

1. **First:** Run `RLS_FIX_VERIFICATION_CHECKLIST.sql` and note the output
2. **Then:** Run the subscription query Check 1 above and note the result
3. **Provide:** 
   - Browser console errors (if any)
   - Query results from checks above
   - Expected vs actual behavior

---

## 🎯 Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Run verification script | ⏳ BEFORE deployment |
| 2 | Review changes (this guide) | ⏳ BEFORE deployment |
| 3 | Run CREATE_BILLING_RLS.sql | ⏳ DEPLOYMENT |
| 4 | Test login flow | ⏳ AFTER deployment |
| 5 | Verify in queries | ⏳ AFTER deployment |

**Estimated Time:** 5-10 minutes total

**Risk Level:** 🟢 Very Low (only RLS logic changes)

**Reversible:** ✅ Yes (can rollback anytime)

---

## Questions?

If the RLS queries or deployment steps are unclear, review:
- `RLS_POLICY_FIX_VERIFICATION.md` - Detailed technical explanation
- `RLS_FIX_VERIFICATION_CHECKLIST.sql` - Pre-deployment checks
- `CREATE_BILLING_RLS.sql` - The actual fix being applied
