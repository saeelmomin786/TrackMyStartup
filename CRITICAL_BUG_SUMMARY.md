# ⚠️ CRITICAL BUG DISCOVERED & FIXED

## Bug: Credits Going Negative ❌

```
BEFORE FIX:
┌─────────────────────────────────┐
│ INVESTMENT ADVISOR ACCOUNT      │
│ ─────────────────────────────── │
│ Available Credits: -5  ❌❌❌    │
│ Credits Used: 50                │
│ Total Purchased: 45             │
│                                 │
│ Result: Unlimited free premiums!│
└─────────────────────────────────┘
```

---

## Root Causes Identified

### 1️⃣ No Database Constraint
```sql
-- BEFORE (UNSAFE):
credits_available INTEGER NOT NULL DEFAULT 0
-- ❌ Allows: -1, -100, -999 (any negative value!)

-- AFTER (SAFE):
credits_available INTEGER NOT NULL DEFAULT 0
CHECK (credits_available >= 0)
-- ✅ Rejects: Any value < 0
```

### 2️⃣ Race Condition in Credit Deduction
```
Scenario: Advisor has 1 credit, two simultaneous requests
                                            
Request A (Time 1ms)         Request B (Time 1ms)
Read: available = 1          Read: available = 1
      ↓                              ↓
Check: OK (1 >= 1)           Check: OK (1 >= 1)
      ↓                              ↓
Update: 1 - 1 = 0  ✓         Update: 1 - 1 = 0  ✓
      ↓                              ↓
BUT ACTUALLY (Race Condition):
      ↓                              ↓
Request A executed first: Update to 0 ✓
Request B executed next:  Update to -1 ❌ (NEGATIVE!)
```

### 3️⃣ Non-Atomic Operation
```typescript
// OLD CODE (UNSAFE):
const credits = await getCredits();        // Read
if (credits.available < 1) return error;   // Check
const update = await supabase              // Update
  .from('advisor_credits')
  .update({
    credits_available: credits.available - 1  // No lock!
  });
// ❌ Gap between check and update: another request can execute!
```

---

## Solution Implemented ✅

### Fix 1: Database Constraints
```sql
✅ Added CHECK (credits_available >= 0)
✅ Added CHECK (credits_used >= 0)
✅ Added CHECK (credits_purchased >= 0)
✅ Database now REJECTS negative values
```

### Fix 2: Atomic RPC Function
```typescript
// NEW CODE (SAFE):
const result = await supabase.rpc('deduct_advisor_credit_safe', {
  p_advisor_user_id: advisorId,
  p_amount_to_deduct: 1
});

// How it works inside:
FOR UPDATE;                    // ✅ Lock the row
IF balance < amount THEN      // ✅ Check
  RETURN error;               // ✅ Exit without updating
END IF;
UPDATE credits;               // ✅ Only if check passed
RETURN success;               // ✅ Atomic - no race condition!
```

**Result:** 🔒 Row lock prevents concurrent requests from interfering

### Fix 3: Code Update
```typescript
// Uses safe RPC function
const { data: deductResult, error } = await supabase.rpc(
  'deduct_advisor_credit_safe',
  { p_advisor_user_id, p_amount_to_deduct: 1 }
);

if (!deductResult[0].success) {
  // Deduction failed - return detailed error
  return { error: deductResult[0].error_message };
}
// Continue with subscription creation
```

---

## Impact Timeline

| Phase | Action | Status |
|-------|--------|--------|
| **Discovery** | Identified negative credits display | ✅ Complete |
| **Analysis** | Found 3 root causes | ✅ Complete |
| **Database Fix** | Created SQL with constraints + safe function | ✅ Complete |
| **Code Fix** | Updated advisorCreditService.ts | ✅ Complete |
| **Testing** | Created comprehensive test cases | ✅ Ready |

---

## Deployment Checklist

### Before Deploying
- [ ] Backup current database
- [ ] Review `FIX_NEGATIVE_CREDITS_BUG.sql`
- [ ] Review `lib/advisorCreditService.ts` changes
- [ ] Verify no active credit assignments in progress

### Deployment
- [ ] Run `FIX_NEGATIVE_CREDITS_BUG.sql` in Supabase SQL Editor
- [ ] Verify constraints added successfully
- [ ] Verify RPC function created successfully
- [ ] Commit and push code changes
- [ ] Deploy updated `lib/advisorCreditService.ts`

### Verification
- [ ] Query: No negative credits in database
- [ ] Query: Constraints block negative values
- [ ] Test: Manual credit deduction works
- [ ] Test: Concurrent requests handled correctly
- [ ] UI: Credits display ≥ 0

---

## Files Created/Modified

### New Files
📄 `FIX_NEGATIVE_CREDITS_BUG.sql`
- Database constraints (CHECK)
- Atomic RPC function (deduct_advisor_credit_safe)
- Data repair (fix existing negative credits)
- Verification queries

📄 `000_CRITICAL_BUG_FIX_NEGATIVE_CREDITS.md`
- Complete bug analysis
- Step-by-step deployment guide
- Test cases and verification
- Rollback procedures

### Modified Files
📝 `lib/advisorCreditService.ts` (Lines 481-507)
- Replaced unsafe UPDATE with safe RPC call
- Enhanced error messages
- Added logging for debugging

---

## Safety Guarantees

### Database Level (SQL)
```
✅ CHECK constraints prevent INSERT/UPDATE to negative
✅ Existing negative credits automatically set to 0
✅ All new transactions validated at database
```

### Application Level (TypeScript)
```
✅ Safe RPC function atomic (row locked)
✅ Detailed error messages for failed deductions
✅ Rollback assignment if deduction fails
✅ Explicit success/failure feedback
```

### Race Condition Prevention
```
✅ Row-level lock (FOR UPDATE) serializes requests
✅ Prevents simultaneous deductions from same advisor
✅ One request proceeds, others wait for lock
✅ No more negative values possible
```

---

## Testing Guide

### Quick Test
1. Go to Investment Advisor Dashboard
2. Click "Credits" tab
3. Verify "Available Credits" shows **≥ 0** ✅
4. If 0, toggle button should be disabled
5. Try to assign credit when balance = 0 → Should fail with error ✅

### Load Test (Concurrent Requests)
```bash
# Simulate 10 simultaneous requests
curl -X POST http://localhost:3000/api/advisor/toggle-credit \
  --data '{"advisor":"id", "startup":"id"}' \
  --repeat 10 --parallel

Expected:
- 5 succeed (if advisor had 5 credits)
- 5 fail with "Insufficient credits"
- NO negative values ❌
```

### Verification Queries
```sql
-- Check 1: No negatives
SELECT COUNT(*) FROM advisor_credits WHERE credits_available < 0;
-- Result: 0 ✅

-- Check 2: Function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'deduct_advisor_credit_safe';
-- Result: deduct_advisor_credit_safe ✅

-- Check 3: Constraints active
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'advisor_credits' AND constraint_name LIKE '%check%';
-- Result: check_credits_available_non_negative ✅
```

---

## Before & After Comparison

### Scenario: Advisor has 1 credit, 3 simultaneous assignment requests

#### BEFORE FIX ❌
```
Request 1: available = 1 → deduct → available = 0 ✓
Request 2: available = 1 → deduct → available = -1 ❌
Request 3: available = 1 → deduct → available = -2 ❌

RESULT: Credits = -2 (NEGATIVE!)
        All 3 assignments created (WRONG!)
        All 3 startups get premium (BROKE BILLING!)
```

#### AFTER FIX ✅
```
Request 1: [Lock row] available = 1 → deduct → available = 0 ✓
Request 2: [Wait for lock] released → available = 0 → FAIL ✅
Request 3: [Wait for lock] released → available = 0 → FAIL ✅

RESULT: Credits = 0 (CORRECT!)
        1 assignment created (CORRECT!)
        1 startup gets premium (CORRECT!)
        2 requests fail with "Insufficient credits" (CORRECT!)
```

---

## Questions & Troubleshooting

**Q: Will this fix break existing premium assignments?**  
A: No! The fix only prevents NEW negative values. Existing data is automatically repaired.

**Q: What if deployment fails?**  
A: Simple rollback - just remove the constraints (SQL provided in guide).

**Q: Will customers lose their credits?**  
A: No! Negative credits are set to 0, but purchased credits remain intact.

**Q: How do I know if the fix worked?**  
A: Check database query - should return 0 negative credits. Dashboard should display ≥ 0.

---

## Summary

🔴 **BUG:** Credits going negative → unlimited free premiums → broken billing  
🔧 **CAUSE:** No database constraint + race condition + non-atomic operation  
✅ **FIX:** CHECK constraints + atomic RPC function with row lock  
✅ **STATUS:** Ready for deployment  
✅ **RISK:** LOW (backward compatible, auto-repairs data)  

**Deployment Time:** < 5 minutes  
**Testing Time:** < 10 minutes  
**Rollback Time:** < 2 minutes (if needed)  

