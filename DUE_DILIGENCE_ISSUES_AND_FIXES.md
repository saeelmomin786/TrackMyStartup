# 🛠️ Due Diligence Requests - Known Issues & Fixes

## 🐛 Identified Issues

### Issue #1: Status Code Mismatch in Query

**Location:** [components/startup-health/StartupDashboardTab.tsx](components/startup-health/StartupDashboardTab.tsx#L1327)

**Problem:**
```typescript
// Line 1327 - INCORRECT STATUS CHECK
.in('status', ['pending', 'approved', 'completed'])  // ❌ 'approved' doesn't exist!
```

The database has these valid status values:
- `'pending'` - ✅ Valid
- `'completed'` - ✅ Valid  
- `'paid'` - ✅ Valid
- `'failed'` - ✅ Valid
- `'approved'` - ❌ **DOES NOT EXIST**

**Impact:** If a request is set to any status other than `'pending'`, `'completed'`, or `'paid'`, it won't be displayed.

**Fix:** Remove `'approved'` from the status check:
```typescript
.in('status', ['pending', 'completed', 'paid'])  // ✅ Only valid statuses
```

---

### Issue #2: Status Not Being Updated to 'Completed'

**Problem:** When startup approves a request, the status should change from `'pending'` to `'completed'`.

**Current Flow:**
```typescript
// From InvestmentAdvisorView.tsx line 1317-1330
// When advisor requests due diligence:
await paymentService.createPendingDueDiligenceIfNeeded(currentUser.id, String(startupId));

// Status inserted as 'pending'
status: 'pending'
```

**Issue:** There's no mechanism to update the status to `'completed'` when startup approves!

**Check the approval functions:**
```sql
-- These functions should UPDATE status to 'completed'
SELECT * FROM pg_proc 
WHERE proname IN ('approve_due_diligence_for_startup', 'reject_due_diligence_for_startup');
```

---

### Issue #3: Startup ID Format Mismatch

**Problem:** `startup_id` is stored as VARCHAR but might be passed as different types.

**Database schema:**
```sql
-- From FINANCIAL_MODEL_SCHEMA.sql
startup_id VARCHAR(255) NOT NULL,  -- Text type
```

**Code in Investment Advisor:**
```typescript
// From InvestmentAdvisorView.tsx
await paymentService.createPendingDueDiligenceIfNeeded(currentUser.id, String(startupId));
// ✅ Correctly converts to String
```

**Code in Startup Dashboard:**
```typescript
// From StartupDashboardTab.tsx line 300
.eq('startup_id', String(startup.id))  // ✅ Also converts to String
```

**Verdict:** This appears to be handled correctly.

---

### Issue #4: RLS Policy May Be Blocking Access

**Problem:** Even if data exists, RLS policies might prevent the startup from seeing requests.

**Current workaround:** Uses RPC function with `SECURITY DEFINER`:
```typescript
// From StartupDashboardTab.tsx line 300
const { data: rpcData, error: rpcError } = await supabase.rpc('get_due_diligence_requests_for_startup', {
  p_startup_id: String(startup.id)
});
```

**Issue:** If RPC function doesn't exist or is misconfigured, it falls back to direct query which may be blocked by RLS.

**Check if RPC exists:**
```sql
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_due_diligence_requests_for_startup'
) as rpc_exists;
```

---

## 🔧 Recommended Fixes

### Fix 1: Update Status Filter in StartupDashboardTab

**File:** [components/startup-health/StartupDashboardTab.tsx](components/startup-health/StartupDashboardTab.tsx#L1327)

**Current code:**
```typescript
.in('status', ['pending', 'approved', 'completed'])
```

**Change to:**
```typescript
.in('status', ['pending', 'completed', 'paid'])
```

---

### Fix 2: Verify Approval Functions Update Status

**File:** Check RPC functions

**SQL to verify status is updated to 'completed':**

The `approve_due_diligence_for_startup` RPC should do:
```sql
UPDATE due_diligence_requests
SET status = 'completed'
WHERE id = p_request_id;
```

---

### Fix 3: Add Debug Logging

**File:** [components/startup-health/StartupDashboardTab.tsx](components/startup-health/StartupDashboardTab.tsx#L296)

**Add after line 321:**
```typescript
if (rows) {
  console.log('🔍 Due Diligence Requests Loaded:', {
    count: rows.length,
    statuses: rows.map(r => r.status),
    startup_ids: rows.map(r => r.startup_id),
    user_ids: rows.map(r => r.user_id)
  });
}
```

This helps debug data loading issues.

---

### Fix 4: Ensure RPC Function Exists

**File:** Database

**SQL to create missing RPC function:**

If `get_due_diligence_requests_for_startup` doesn't exist, run:
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

## 🧪 Testing Procedure

### Test 1: Verify Data Creation
```typescript
// In Investment Advisor Dashboard
// Click "Request Due Diligence" for startup ID 123

// Then run in Supabase SQL:
SELECT * FROM due_diligence_requests 
WHERE startup_id = '123' 
ORDER BY created_at DESC 
LIMIT 1;

// Should show:
// status = 'pending'
// user_id = [advisor's auth.uid()]
// created_at = [recent time]
```

---

### Test 2: Verify Data Display
```typescript
// In Startup Dashboard
// Open "Due Diligence Requests" section

// Browser console should show:
console.log('🔍 Due Diligence Requests Loaded:', {
  count: 1,  // Should be > 0
  statuses: ['pending'],  // Should show actual statuses
  startup_ids: ['123'],
  user_ids: ['[advisor-auth-id]']
});
```

---

### Test 3: Verify Status Update
```typescript
// In Startup Dashboard
// Click "Approve" button on pending request

// Then run in Supabase SQL:
SELECT status FROM due_diligence_requests 
WHERE startup_id = '123' 
AND user_id = '[advisor-auth-id]';

// Should now show:
// status = 'completed'
```

---

## 📊 Debugging Checklist

Use this to systematically debug:

```
□ Data insertion
  □ Request created in database?
  □ Status = 'pending'?
  □ startup_id correct format?
  □ user_id = auth.uid()?

□ Data retrieval
  □ Startup can query via RPC?
  □ RPC returns rows?
  □ Investor profile found?
  □ Status value in valid list?

□ UI Display
  □ Table component renders?
  □ No JavaScript errors?
  □ Rows visible in table?
  □ Investor name displays?

□ Status Update
  □ Approve button clickable?
  □ No errors on click?
  □ Database status changed?
  □ UI reflects change?
```

---

## 🚨 Critical Path Issues

### Path 1: Request Not Appearing At All
**Most Likely Cause:** 
- Investment Advisor action didn't save (network error)
- RLS blocked the insert

**Quick Check:**
```sql
SELECT COUNT(*) FROM due_diligence_requests WHERE startup_id = '[YOUR_ID]';
```

---

### Path 2: Request Appears Empty/Broken
**Most Likely Cause:**
- Investor name lookup failed
- Status doesn't match filter criteria

**Quick Check:**
```sql
SELECT status FROM due_diligence_requests WHERE startup_id = '[YOUR_ID]';
```

---

### Path 3: Approval Not Working
**Most Likely Cause:**
- RPC function for approval doesn't exist or is broken
- Status not being updated

**Quick Check:**
```sql
-- See if approval RPC exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'approve_due_diligence_for_startup'
) as has_approval_rpc;
```

---

## 🎯 Implementation Priority

1. **High Priority:** Fix Issue #1 (Status code mismatch) - Simple fix, high impact
2. **High Priority:** Add debug logging (Fix #3) - Helps troubleshooting
3. **Medium Priority:** Verify RPC exists (Fix #4) - Fallback mechanism
4. **Medium Priority:** Verify approval updates status (Fix #2) - For "Approve" functionality

