# ⚡ Quick Action Guide - Due Diligence Requests Fix

## 🎯 30-Second Quick Diagnosis

Copy and paste this in Supabase SQL Editor to instantly see what's wrong:

```sql
-- Quick diagnostic query
WITH requests AS (
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN status NOT IN ('pending', 'completed', 'paid') THEN 1 END) as other_status
  FROM due_diligence_requests
),
rpc_check AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_due_diligence_requests_for_startup'
  ) as rpc_exists
)
SELECT 
  r.total as "Total Requests",
  r.pending_count as "Pending (Should Show)",
  r.completed_count as "Completed",
  r.paid_count as "Paid",
  r.other_status as "Unknown Status ⚠️",
  CASE WHEN rc.rpc_exists THEN 'YES ✅' ELSE 'MISSING ❌' END as "RPC Exists?"
FROM requests r, rpc_check rc;
```

---

## 📊 Test Results Interpretation

### Scenario 1: All Requests Showing Fine
```
Total Requests: 5
Pending (Should Show): 3
Completed: 2
Paid: 0
Unknown Status ⚠️: 0
RPC Exists?: YES ✅
```
**Diagnosis:** ✅ System working correctly. Check if startup is seeing them.

---

### Scenario 2: Requests Exist But Not Showing
```
Total Requests: 2
Pending (Should Show): 2
Completed: 0
Paid: 0
Unknown Status ⚠️: 0
RPC Exists?: YES ✅
```
**Diagnosis:** ❌ Data exists but startup can't see it. **RLS issue or wrong startup_id**

---

### Scenario 3: No Pending Requests
```
Total Requests: 0
Pending (Should Show): 0
Completed: 0
Paid: 0
Unknown Status ⚠️: 0
RPC Exists?: YES ✅
```
**Diagnosis:** ❌ Requests never created. **Investment Advisor action not saving**

---

### Scenario 4: RPC Missing
```
Total Requests: 2
Pending (Should Show): 2
Completed: 0
Paid: 0
Unknown Status ⚠️: 0
RPC Exists?: NO ❌
```
**Diagnosis:** ❌ RPC missing. **Create it using fix below**

---

## 🛠️ One-Click Fixes

### Fix 1: Create Missing RPC Function (Copy & Paste)

If RPC is missing, run this:

```sql
CREATE OR REPLACE FUNCTION public.get_due_diligence_requests_for_startup(
  p_startup_id TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  startup_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  investor_name TEXT,
  investor_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         r.user_id,
         r.startup_id,
         r.status,
         r.created_at,
         u.name AS investor_name,
         u.email AS investor_email
  FROM public.due_diligence_requests r
  JOIN public.startups s ON s.id::text = r.startup_id
  JOIN public.users u ON u.id = r.user_id
  WHERE r.startup_id = p_startup_id
    AND (s.user_id = auth.uid());
$$;
```

---

### Fix 2: Fix Status Code in Frontend (Code Edit)

**File:** [components/startup-health/StartupDashboardTab.tsx](components/startup-health/StartupDashboardTab.tsx#L1327)

**Find this line:**
```typescript
.in('status', ['pending', 'approved', 'completed'])
```

**Replace with:**
```typescript
.in('status', ['pending', 'completed', 'paid'])
```

---

### Fix 3: Fix Status Code in Investment Advisor Query (Code Edit)

**File:** [components/InvestmentAdvisorView.tsx](components/InvestmentAdvisorView.tsx#L1317)

**Find this line:**
```typescript
.in('status', ['pending', 'approved', 'completed'])
```

**Replace with:**
```typescript
.in('status', ['pending', 'completed', 'paid'])
```

---

## 🧪 Verify Fix Worked

### After applying fixes, run this test:

1. **Login as Investment Advisor**
2. **Request due diligence for startup ID: 123**
3. **Run this query immediately:**

```sql
SELECT * FROM due_diligence_requests 
WHERE startup_id = '123'
ORDER BY created_at DESC 
LIMIT 1;
```

**Should see:** New row with `status = 'pending'` and recent `created_at`

4. **Login as Startup owner (startup ID 123)**
5. **Go to Dashboard → Due Diligence Requests section**
6. **Should see:** The investor's request listed

---

## ⏱️ Action Checklist (5 minutes)

- [ ] Run diagnostic query above
- [ ] Note which scenario applies
- [ ] If scenario 4: Run the SQL fix
- [ ] If scenario 2: Review RLS (see troubleshooting guide)
- [ ] If scenario 3: Check Investment Advisor console for errors
- [ ] Test with new request
- [ ] Verify in startup dashboard

---

## 🆘 Still Not Working?

**Collect this info and share:**

1. **Diagnostic query output** (from 30-second quick check)
2. **Browser console errors** (F12 → Console tab)
3. **Network tab response** (F12 → Network tab → search "due_diligence")
4. **Most recent request data:**
   ```sql
   SELECT * FROM due_diligence_requests 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

---

## 📞 Common Messages

| Message | Meaning | Fix |
|---------|---------|-----|
| "RPC does not exist" | Function not created | Run Fix 1 |
| "permission denied" | RLS blocking access | Check RLS policies |
| "No rows" | No requests exist | Check Investment Advisor |
| "Table not found" | Schema issue | Run migrations |

---

## 🎯 Success Indicators

You'll know it's fixed when:

✅ Investment Advisor can request due diligence  
✅ Request appears in database immediately  
✅ Startup sees request in "Due Diligence Requests" section  
✅ Startup can approve/reject request  
✅ Status updates in database  
✅ Advisor can access dashboard after approval  

