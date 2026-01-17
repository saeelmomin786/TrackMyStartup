# ✅ Due Diligence Requests - Verification Steps

## 🎯 STEP-BY-STEP VERIFICATION

### Phase 1: Data Verification (Database Level)

#### Step 1.1: Check if Due Diligence Requests Table Has Data
Go to Supabase Dashboard → SQL Editor and run:

```sql
SELECT COUNT(*) as total_requests FROM due_diligence_requests;
```

**Expected:** Should see `1` or more if requests were created.

---

#### Step 1.2: Find Your Specific Startup's Requests
Replace `[STARTUP_ID]` with your actual startup ID:

```sql
SELECT 
  id,
  user_id,
  startup_id,
  status,
  created_at
FROM due_diligence_requests
WHERE startup_id = '[STARTUP_ID]'
ORDER BY created_at DESC;
```

**Expected Output Example:**
```
id                                    | user_id                              | startup_id | status  | created_at
--------------------------------------|--------------------------------------|------------|---------|-------------------
550e8400-e29b-41d4-a716-446655440000  | 660e8400-e29b-41d4-a716-446655440111 | 123        | pending | 2024-01-17 10:30:00
```

**If you see:**
- ✅ Rows with `status = 'pending'` → Data is being created correctly
- ✅ Rows with `status = 'completed'` → Startup approved the request
- ❌ No rows → Requests are not being inserted (problem in Investment Advisor action)
- ❌ Rows with unexpected status → Wrong status value

---

#### Step 1.3: Check if Request Has Correct User ID
Replace `[INVESTOR_AUTH_ID]` with the investor's auth.uid():

```sql
SELECT 
  id,
  user_id,
  startup_id,
  status,
  created_at
FROM due_diligence_requests
WHERE user_id = '[INVESTOR_AUTH_ID]'
ORDER BY created_at DESC
LIMIT 10;
```

---

### Phase 2: Startup Dashboard Verification

#### Step 2.1: Login as Startup Owner
1. Go to your application
2. Login with startup account
3. Navigate to Dashboard tab
4. Scroll down to "Due Diligence Requests" section

**Check these things:**
- ✅ Section appears (it should always appear)
- ✅ Section has a table with headers: "Investor", "Status", "Actions"
- ❌ Section is empty/shows no rows (main issue)
- ❌ Section shows error message

---

#### Step 2.2: Check Browser Console for Errors
1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for any red error messages

**Common errors to look for:**
```
Failed to load due diligence requests
Error loading dashboard data
[GraphQL error]
```

If you see errors, check the error details for more info.

---

#### Step 2.3: Check Network Tab
1. Open DevTools (F12)
2. Go to "Network" tab
3. Reload the startup dashboard page
4. Search for `due_diligence_requests` in the filter

**Check the network request:**
- Look for a request to `due_diligence_requests`
- Click on it
- Check "Response" tab
- Should see JSON array with request data

---

### Phase 3: Investment Advisor Dashboard Verification

#### Step 3.1: Verify Request Creation
1. Login as Investment Advisor
2. Go to "Discover Pitches" tab or "My Startups" tab
3. Find a startup
4. Click "Request Due Diligence" button (or similar)

**What should happen:**
- ✅ Button changes to "Pending" or similar
- ✅ You see a success message: "Due diligence request sent..."
- ✅ Number increases on "Due Diligence" filter count
- ❌ You see error message
- ❌ Nothing happens

---

#### Step 3.2: Check If Request Was Created
After clicking "Request Due Diligence", run this query:

```sql
-- Get most recent due diligence requests
SELECT 
  id,
  user_id,
  startup_id,
  status,
  created_at
FROM due_diligence_requests
ORDER BY created_at DESC
LIMIT 5;
```

**Check:**
- ✅ New row appeared with `status = 'pending'` and recent `created_at` time
- ❌ No new row appeared → Request creation failed

---

### Phase 4: Data Connection Verification

#### Step 4.1: Verify Startup Can See the Request

**Test the RPC function that startup dashboard uses:**

```sql
-- Test the RPC function (this is what startup dashboard calls)
SELECT * FROM get_due_diligence_requests_for_startup('[YOUR_STARTUP_ID]');
```

**Expected output:**
- Shows columns: `id, user_id, startup_id, status, created_at, investor_name, investor_email`
- Shows the pending request(s) with investor information

**If error:**
- "function not found" → RPC needs to be created
- Permission denied → RLS policy issue
- No rows → Request doesn't exist or startup_id mismatch

---

#### Step 4.2: Check Investor User Profile
The startup dashboard looks up investor names from `user_profiles` table:

```sql
-- Check if investor exists in user_profiles
SELECT 
  id,
  auth_user_id,
  name,
  email,
  role
FROM user_profiles
WHERE auth_user_id IN (
  SELECT user_id FROM due_diligence_requests 
  WHERE startup_id = '[YOUR_STARTUP_ID]'
);
```

**Expected:**
- Should show investor's name and email
- `auth_user_id` should match `user_id` in `due_diligence_requests`

---

## 🎨 VISUAL FLOW

```
Investment Advisor Dashboard
    ↓
Clicks "Request Due Diligence"
    ↓
paymentService.createPendingDueDiligenceIfNeeded(advisorId, startupId)
    ↓
INSERT INTO due_diligence_requests (user_id, startup_id, status)
VALUES (auth.uid(), startupId, 'pending')
    ↓
Data saved to database
    ↓
Startup Login → Dashboard Tab
    ↓
Calls: get_due_diligence_requests_for_startup(startupId)
    ↓
Returns: investor name, email, status, created_at
    ↓
Displays in "Due Diligence Requests" table
    ✅ Should show here
```

---

## 🔴 COMMON PROBLEMS & QUICK FIXES

### Problem 1: "No rows returned from database"
**Cause:** Request was never created or has wrong startup_id format

**Fix:**
```sql
-- Check if startup_id is stored correctly
SELECT DISTINCT startup_id, COUNT(*) as count 
FROM due_diligence_requests 
GROUP BY startup_id;
```

Verify the startup_id format (should be `VARCHAR`/`TEXT` like '123', not integer).

---

### Problem 2: "Request appears but with empty Investor name"
**Cause:** User profile lookup failed

**Fix:**
```sql
-- Check user_profiles for the investor
SELECT * FROM user_profiles 
WHERE auth_user_id = '[INVESTOR_AUTH_ID]';
```

If no row: User profile needs to be created or synced.

---

### Problem 3: "Browser shows 'Failed to load due diligence requests' error"
**Cause:** RLS policy or network error

**Fix:**
1. Check browser console for exact error
2. Check if RPC function exists:
   ```sql
   SELECT EXISTS (
     SELECT 1 FROM pg_proc 
     WHERE proname = 'get_due_diligence_requests_for_startup'
   );
   ```
3. If RPC doesn't exist, create it using [DUE_DILIGENCE_STARTUP_ACCESS.sql](DUE_DILIGENCE_STARTUP_ACCESS.sql)

---

## 📋 CHECKLIST FOR TRACKING

Use this checklist to verify each step:

```
Phase 1: Database Level
  [ ] Count query shows requests exist
  [ ] Specific startup query shows pending request
  [ ] Investor auth ID query shows request
  
Phase 2: Startup Dashboard
  [ ] Can see "Due Diligence Requests" section
  [ ] No errors in browser console
  [ ] Network request succeeds (status 200)
  [ ] Response JSON contains request data
  
Phase 3: Advisor Dashboard
  [ ] Can click "Request Due Diligence"
  [ ] See success message
  [ ] Recent query shows new row in database
  
Phase 4: Data Connection
  [ ] RPC function returns request data
  [ ] User profile lookup finds investor info
  [ ] Startup can query investor name/email
```

---

## 🆘 If Still Not Working

Collect and share:
1. Output from Step 1.2 query (startup's requests)
2. Browser console error message (if any)
3. Network request response (if any)
4. Output from Step 4.1 query (RPC test)
5. Recent timestamps from database

