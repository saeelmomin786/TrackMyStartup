# 🔍 Investment Advisor Due Diligence - Specific Issue

## 📋 Problem Statement
- ✅ **Investor Dashboard:** Due diligence requests work perfectly
- ❌ **Investment Advisor Dashboard:** Due diligence requests don't show in startup dashboard

## 🎯 Root Cause Analysis

The investment advisor uses the same `paymentService.createPendingDueDiligenceIfNeeded()` function as investors, which internally calls `supabase.auth.getUser()` to get the auth.uid(). 

However, there's a **critical difference** in how Investment Advisors access startups compared to Investors:

### Why Investors Work:
1. Investor requests due diligence
2. Request saved with `user_id = auth.uid()`
3. Startup opens "Due Diligence Requests" section
4. RPC function queries: `WHERE startup_id = '[ID]' AND s.user_id = auth.uid()`
5. ✅ Startup sees the request

### Why Investment Advisors Don't Work:
1. Investment Advisor requests due diligence
2. Request saved with `user_id = investment_advisor_auth_uid`
3. Startup opens "Due Diligence Requests" section
4. RPC function queries: `WHERE startup_id = '[ID]' AND s.user_id = auth.uid()`
5. ❌ **Different auth.uid()** - the startup IS the authenticated user, not the advisor!

## 🔧 The Real Issue

**The RPC function is checking `s.user_id = auth.uid()`**

This means:
- ✅ When **Investor** (who owns the startup) views requests → sees their own requests
- ❌ When **Startup owner** views requests → can ONLY see requests from Investors they added to their profile
- ❌ Investment Advisors' requests are **invisible** because the advisor's auth.uid() doesn't match the startup owner's auth.uid()

## 📊 Visual Diagram

```
INVESTOR PATH (Works ✅):
┌─────────────────────────────────┐
│ Investor (auth.uid = 111)       │
│ Requests DD for Startup #5      │
└─────────┬───────────────────────┘
          │ INSERT with user_id=111
          ↓
┌─────────────────────────────────┐
│ due_diligence_requests          │
│ user_id: 111                    │
│ startup_id: 5                   │
│ status: pending                 │
└─────────┬───────────────────────┘
          │ Startup views requests
          ↓
┌──────────────────────────────────────────────┐
│ Startup Owner (auth.uid = 222) logs in       │
│ Views Dashboard → Due Diligence Requests     │
│ RPC checks: WHERE startup_id = 5             │
│           AND s.user_id = 222 ✅             │
│           AND r.user_id IN (111) ✅          │
│ RESULT: Shows investor's request ✅          │
└──────────────────────────────────────────────┘

ADVISOR PATH (Doesn't Work ❌):
┌─────────────────────────────────┐
│ Investment Advisor (auth.uid = 333)    │
│ Requests DD for Startup #5      │
└─────────┬───────────────────────┘
          │ INSERT with user_id=333
          ↓
┌─────────────────────────────────┐
│ due_diligence_requests          │
│ user_id: 333                    │
│ startup_id: 5                   │
│ status: pending                 │
└─────────┬───────────────────────┘
          │ Startup views requests
          ↓
┌──────────────────────────────────────────────┐
│ Startup Owner (auth.uid = 222) logs in       │
│ Views Dashboard → Due Diligence Requests     │
│ RPC checks: WHERE startup_id = 5             │
│           AND s.user_id = 222 ✅             │
│           AND r.user_id IN (???) ❌          │
│ PROBLEM: No connection between advisor (333) │
│          and startup owner (222)!            │
│ RESULT: Doesn't show advisor's request ❌    │
└──────────────────────────────────────────────┘
```

## ✅ Solutions

### Option 1: Fix the RPC Function (RECOMMENDED)
Allow startups to see ALL due diligence requests (from all users), not just from their own investors:

```sql
-- Current (restrictive):
WHERE r.startup_id = p_startup_id
  AND (s.user_id = auth.uid());  -- Only startup owner's requests

-- Fixed (allows all):
WHERE r.startup_id = p_startup_id;  -- All requests for this startup
```

**Pros:**
- Startups see all due diligence requests
- Includes investment advisors
- Simple fix

**Cons:**
- Removes RLS restriction (but table already has RLS policies)
- Startup could theoretically see requests they shouldn't (if RLS misconfigured)

---

### Option 2: Track Advisor-Startup Relationships
Create a mapping table to track which advisors are associated with which startups, then filter requests through that:

```sql
-- Check if advisor is connected to startup
WHERE r.startup_id = p_startup_id
  AND (s.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM advisor_startup_connections 
                  WHERE advisor_id = r.user_id 
                  AND startup_id = p_startup_id));
```

**Pros:**
- More control over visibility
- Maintains RLS security

**Cons:**
- Complex
- Requires mapping table

---

### Option 3: Remove RLS Restriction on Startup View
The RPC function has `SECURITY DEFINER`, so startup ownership restriction is already enforced by the RPC itself. Simplify to:

```sql
-- SECURITY DEFINER already checks startup ownership
-- Just return all requests for this startup
WHERE r.startup_id = p_startup_id;
```

**Pros:**
- Simplest
- RPC already has security definer

**Cons:**
- Minimal security improvement over option 1

---

## 🔍 Quick Test

### To verify this is the issue:

1. **Get your investment advisor auth.uid():**
   ```sql
   SELECT id FROM auth.users WHERE email = '[advisor-email]';
   -- Result: advisor_auth_uid = 333
   ```

2. **Get your startup owner auth.uid():**
   ```sql
   SELECT id FROM auth.users WHERE email = '[startup-email]';
   -- Result: startup_auth_uid = 222
   ```

3. **Create a test request:**
   ```sql
   INSERT INTO due_diligence_requests (user_id, startup_id, status)
   VALUES ('333', '[startup-id]', 'pending');
   ```

4. **Try to query it as startup owner:**
   ```sql
   -- This is what the RPC tries to do:
   SELECT r.* FROM due_diligence_requests r
   JOIN startups s ON s.id::text = r.startup_id
   WHERE r.startup_id = '[startup-id]'
   AND s.user_id = '222';  -- startup owner auth.uid()
   -- Result: Returns rows? Or empty?
   ```

5. **If empty** → This confirms the issue!

---

## 🛠️ Recommended Action

**Apply Option 1 or 3** - Open the RPC function to show ALL due diligence requests for a startup, not just investor requests.

The fix is in [DUE_DILIGENCE_STARTUP_ACCESS.sql](DUE_DILIGENCE_STARTUP_ACCESS.sql)

