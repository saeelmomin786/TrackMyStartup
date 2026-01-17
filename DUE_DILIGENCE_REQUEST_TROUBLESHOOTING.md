# 🔍 Due Diligence Requests - Troubleshooting Guide

## 📋 Problem Statement
When an Investment Advisor creates a Due Diligence Request from their dashboard, the request **doesn't appear** in the Startup Dashboard's "Due Diligence Requests" section.

---

## 🔧 VERIFICATION CHECKLIST

### Step 1: Verify Data is Being Inserted
**Check if the request exists in the database:**

```sql
-- Query to check if due diligence requests exist for a specific startup
SELECT 
  id,
  user_id,
  startup_id,
  status,
  created_at
FROM due_diligence_requests
WHERE startup_id = '[YOUR_STARTUP_ID]'
ORDER BY created_at DESC;

-- Also check by investor user_id
SELECT 
  id,
  user_id,
  startup_id,
  status,
  created_at
FROM due_diligence_requests
WHERE user_id = '[INVESTOR_AUTH_USER_ID]'
ORDER BY created_at DESC;
```

**Expected Result:** You should see rows with `status = 'pending'`

---

### Step 2: Check Status Values
**Issue:** The due diligence table has status values: `'pending', 'paid', 'completed', 'failed'`

The startup dashboard queries for requests using:
```tsx
// From StartupDashboardTab.tsx line 311
.in('status', ['pending', 'approved', 'completed'])  // ❌ 'approved' doesn't exist!
```

**Problem:** The code looks for `'approved'` status, but the database uses `'completed'` or `'paid'`.

**Solution:** Status values should be:
- `'pending'` - Request just sent, awaiting startup approval
- `'completed'` - Request approved by startup
- `'paid'` - Payment processed (if applicable)
- `'failed'` - Request rejected

---

### Step 3: Verify User ID Matching

**Critical Issue:** ID Type Mismatch

The request is created with `auth.uid()`:
```typescript
// From paymentService.ts line 1700
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || userId;

const { data, error } = await supabase
  .from('due_diligence_requests')
  .insert({
    user_id: authUserId,  // ✅ Auth.uid()
    startup_id: String(startupId),
    status: 'pending'
  })
```

The startup dashboard queries for requests with:
```tsx
// From StartupDashboardTab.tsx line 316
const { data: users } = await supabase
  .from('user_profiles')
  .select('auth_user_id, name, email')
  .in('auth_user_id', userIds);  // ✅ Matches correctly
```

**Verification:** This should work correctly if both sides use `auth_user_id`.

---

### Step 4: Check RLS Policies

The startup should be able to see ALL due diligence requests for their startup (regardless of who made them).

**Check if RLS is blocking the query:**

```sql
-- Test query that startups use (via RPC)
SELECT 
  r.id,
  r.user_id,
  r.startup_id,
  r.status,
  r.created_at,
  u.name AS investor_name,
  u.email AS investor_email
FROM public.due_diligence_requests r
JOIN public.startups s ON s.id::text = r.startup_id
JOIN public.users u ON u.id = r.user_id
WHERE r.startup_id = '[YOUR_STARTUP_ID]'
  AND (s.user_id = '[STARTUP_AUTH_UID]');
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Requests Not Showing in Startup Dashboard

**Causes:**
1. ❌ Status is not `'pending'`, `'completed'`, or `'paid'` in database
2. ❌ RLS policy blocking the query
3. ❌ `startup_id` is stored as VARCHAR but query uses different format
4. ❌ Request inserted with wrong `user_id` (profile ID instead of auth.uid())

**Fix:**
1. Check database directly (use Step 1 above)
2. Check browser console for error messages
3. Verify RLS is not blocking with SECURITY DEFINER function

---

### Issue 2: Investor Can See Request But Startup Cannot

**Cause:** RLS policy restricting access

**Fix:** Ensure the RPC function `get_due_diligence_requests_for_startup` exists and has:
- `SECURITY DEFINER` to bypass RLS
- Proper join with `startups` table to verify ownership

---

## 🔍 HOW TO DEBUG IN THE BROWSER

### 1. **Open DevTools Console** (F12)

### 2. **Check for errors when opening Startup Dashboard**

Look for messages like:
```
Failed to load due diligence requests
Error loading dashboard data
[GraphQL error]
```

### 3. **Check Network Tab**
- Search for `due_diligence_requests` queries
- Check response status (should be 200, not 403/Unauthorized)
- Look at response data

### 4. **Check Application Data**
- Open IndexedDB if using Supabase cache
- Look for `due_diligence_requests` table entries

---

## ✅ VERIFICATION STEPS

### For Investment Advisor:
1. Login as Investment Advisor
2. Go to "Discover Pitches" or "My Startups"
3. Click "Request Due Diligence" on a startup
4. You should see: `"Due diligence request sent. Access will unlock once the startup approves."`
5. **Database check:** 
   ```sql
   SELECT * FROM due_diligence_requests 
   WHERE startup_id = '[THAT_STARTUP_ID]' 
   AND status = 'pending';
   ```
   Should return 1 row

### For Startup Owner:
1. Login to startup account
2. Go to Dashboard tab
3. Scroll to "Due Diligence Requests" section
4. You should see the investor's name and request status
5. **Database check:**
   ```sql
   SELECT * FROM due_diligence_requests 
   WHERE startup_id = '[YOUR_STARTUP_ID]'
   ORDER BY created_at DESC;
   ```
   Should show the pending request

---

## 📊 STATUS CODES REFERENCE

| Status | Meaning | Next State | Creator |
|--------|---------|-----------|---------|
| `pending` | Request created, awaiting approval | → `completed` or `failed` | Investor/Advisor |
| `completed` | Startup approved access | → Investor can view dashboard | Startup |
| `paid` | Payment processed | → Access granted | Payment system |
| `failed` | Startup rejected access | → ❌ No access | Startup |

---

## 🚀 QUICK TEST QUERY

Copy and run this in Supabase SQL Editor:

```sql
-- Find all pending due diligence requests
SELECT 
  'pending' as type,
  r.id,
  r.user_id,
  r.startup_id,
  r.status,
  r.created_at,
  COALESCE(u.name, u.email, 'Unknown') as investor_name,
  s.name as startup_name
FROM due_diligence_requests r
LEFT JOIN users u ON u.id = r.user_id
LEFT JOIN startups s ON s.id = r.startup_id::integer
WHERE r.status = 'pending'
ORDER BY r.created_at DESC
LIMIT 20;
```

---

## 🎯 NEXT STEPS

1. **Run the SQL queries above** to verify data exists
2. **Check browser console** for any error messages
3. **Verify RLS policies** are not blocking the query
4. **Test with a test startup/investor** pair
5. **If still not working:** Share the database results and browser console errors

