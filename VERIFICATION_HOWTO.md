## 📋 Step-by-Step Verification Guide

### **Before Applying the Fix, Run These Queries in Supabase**

---

## **STEP 1: Login to Supabase**

1. Go to: https://supabase.com/dashboard
2. Select your project: "Track My Startup"
3. Click on **SQL Editor** (left sidebar)

---

## **STEP 2: Run Verification Queries**

### **Query #1: Check Intake CRM RLS Policies** ⭐

Copy and paste this in a new SQL query:

```sql
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual AS "Policy Condition (SELECT/UPDATE USING)",
    with_check AS "Policy Condition (INSERT/UPDATE WITH CHECK)"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments')
ORDER BY tablename, policyname;
```

**Click "Run"** and look for results like:

| tablename | policyname | Policy Condition |
|-----------|-----------|------------------|
| intake_crm_columns | icc_insert_own | `WHERE up.id = public.intake_crm_columns.facilitator_id AND up.auth_user_id = auth.uid()` |

**❌ THIS IS THE BUG!** It checks `up.id` but code sends `auth_user_id` value

---

### **Query #2: Check Fundraising CRM Policies**

```sql
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual AS "Policy Condition (SELECT/UPDATE USING)",
    with_check AS "Policy Condition (INSERT/UPDATE WITH CHECK)"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('fundraising_crm_columns', 'fundraising_crm_investors', 'fundraising_crm_metadata', 'fundraising_crm_attachments')
ORDER BY tablename, policyname;
```

**This should show policies checking `auth_user_id` correctly** ✅

---

### **Query #3: Check If RLS is Enabled**

```sql
SELECT 
    tablename,
    CASE WHEN rowsecurity = true THEN '✅ YES' ELSE '❌ NO' END AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments',
                     'fundraising_crm_columns', 'fundraising_crm_investors', 'fundraising_crm_metadata', 'fundraising_crm_attachments')
ORDER BY tablename;
```

**All should show:** `✅ YES` (RLS enabled)

---

### **Query #4: Check User Profiles**

```sql
SELECT 
    id AS "profile_id",
    auth_user_id AS "auth_user_id", 
    startup_id,
    CASE WHEN id = auth_user_id THEN '❌ Same (BAD)' 
         ELSE '✅ Different (Expected)' END AS "Comparison"
FROM public.user_profiles 
LIMIT 5;
```

**You should see:**
- `profile_id`: `up456-abc-123` (different UUID)
- `auth_user_id`: `af123-xyz-789` (different UUID)
- Comparison: `✅ Different (Expected)`

This proves the RLS logic is wrong!

---

## **STEP 3: Verify the Issue**

After running the queries, you should see:

### ✅ **Confirmed Issues:**

1. ❌ **Intake CRM policies check `up.id`** - but code sends `auth_user_id` value
2. ❌ **User profile IDs are DIFFERENT** - `id` ≠ `auth_user_id`
3. ✅ **Fundraising CRM policies are correct** - check `auth_user_id`
4. ✅ **RLS is enabled** - on all tables

### Example Mismatch:
```
Code sends:        facilitator_id = 'af123-xyz-789' (auth.uid())
Policy checks:     up.id = 'af123-xyz-789' → No match (up.id is 'up456-abc-123')
Result:            ❌ 403 Forbidden
```

---

## **STEP 4: Ready to Fix?**

Once you've verified the issue with the above queries, we can apply:

**File:** `database/FIX_CRM_RLS_POLICIES.sql`

This changes all Intake CRM policies from:
```sql
WHERE up.id = facilitator_id          ← WRONG
```

To:
```sql
WHERE up.auth_user_id = facilitator_id ← CORRECT
```

---

## **Files Reference:**

- **Verification Queries:** `SIMPLE_VERIFICATION_QUERIES.sql` (Ready to copy-paste)
- **Fix Script:** `database/FIX_CRM_RLS_POLICIES.sql` (Apply after verification)
- **Root Cause Analysis:** `RLS_VERIFICATION_COMPLETE.md` (Detailed explanation)

---

## **Next Steps:**

1. ✅ Run the queries above in Supabase
2. ✅ Confirm the issue (especially Query #1 and #4)
3. ✅ Copy & paste the fix script
4. ✅ Run the fix in Supabase
5. ✅ Reload the app - should work!

Let me know the results! 🚀
