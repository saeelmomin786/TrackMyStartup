# 🔴 CRITICAL BUG FIX: Account Credits Going Negative

## Issue Description
Investment advisors' account credits are displaying as **negative numbers**, allowing unlimited premium assignments and breaking the credit system completely.

### Example Bug Scenario
```
Advisor Account:
  Available Credits: -5  ❌ (Should never be negative!)
  Credits Used: 50
  Total Purchased: 45

Result: Advisor can assign unlimited premium to startups despite negative balance!
```

---

## Root Cause Analysis

### 🔍 Problem 1: No Database Constraint
**File:** `database/30_create_advisor_credit_system.sql`  
**Issue:** `credits_available` column defined as:
```sql
credits_available INTEGER NOT NULL DEFAULT 0
-- ❌ Missing: CHECK (credits_available >= 0)
```

**Impact:** Database allows negative values to be inserted

### 🔍 Problem 2: Non-Atomic Credit Deduction
**File:** `lib/advisorCreditService.ts` (Line 481-494)  
**Issue:** Original code:
```typescript
// UNSAFE - Simple UPDATE without transaction lock
const { error: deductError } = await supabase
  .from('advisor_credits')
  .update({
    credits_available: credits.credits_available - 1,  // ❌ Not atomic!
    credits_used: credits.credits_used + 1
  })
  .eq('advisor_user_id', advisorUserId);
```

**Problems:**
1. **Race Condition:** Two concurrent requests can both check balance, see 1 credit available, then both deduct
2. **No Lock:** Multiple requests not serialized - causes negative values
3. **Simple Math:** `credits.credits_available - 1` doesn't check current DB state

**Example Race Condition:**
```
Request 1: Read credits_available = 1
Request 2: Read credits_available = 1
Request 1: Deduct → credits_available = 0 ✓
Request 2: Deduct → credits_available = -1 ✗ (Should be blocked!)
```

### 🔍 Problem 3: Missing Atomic RPC Function
**Issue:** No atomic transaction-safe function existed for credit deduction

---

## ✅ Solution Implemented

### Fix 1: Database CHECK Constraints
**File:** `FIX_NEGATIVE_CREDITS_BUG.sql`
```sql
ALTER TABLE public.advisor_credits
ADD CONSTRAINT check_credits_available_non_negative 
CHECK (credits_available >= 0);

ALTER TABLE public.advisor_credits
ADD CONSTRAINT check_credits_used_non_negative 
CHECK (credits_used >= 0);

ALTER TABLE public.advisor_credits
ADD CONSTRAINT check_credits_purchased_non_negative 
CHECK (credits_purchased >= 0);
```

**Result:** ✅ Database now rejects any INSERT/UPDATE that would make credits negative

---

### Fix 2: Atomic Safe Deduction Function
**File:** `FIX_NEGATIVE_CREDITS_BUG.sql`  
**Function:** `deduct_advisor_credit_safe(p_advisor_user_id, p_amount_to_deduct)`

**How it works:**
```sql
FOR UPDATE          -- Lock the row (prevents race condition)
IF balance < amount
  RETURN error      -- Exit without deducting
END IF
UPDATE credits      -- Only if check passed (atomic)
RETURN success
```

**Safety Features:**
1. ✅ **Row Lock** (`FOR UPDATE`) - Serializes concurrent requests
2. ✅ **Check Then Act** - Atomic operation prevents race condition
3. ✅ **Clear Error Messages** - Reports why deduction failed
4. ✅ **Explicit Return** - Caller knows if operation succeeded

---

### Fix 3: Updated TypeScript Code
**File:** `lib/advisorCreditService.ts` (Line 481-507)  
**Change:** Replaced unsafe UPDATE with safe RPC function call

**Before (UNSAFE):**
```typescript
const { error: deductError } = await supabase
  .from('advisor_credits')
  .update({ credits_available: credits.credits_available - 1 })
  .eq('advisor_user_id', advisorUserId);
```

**After (SAFE):**
```typescript
const { data: deductResult, error: deductError } = await supabase.rpc(
  'deduct_advisor_credit_safe',
  {
    p_advisor_user_id: advisorUserId,
    p_amount_to_deduct: 1
  }
);

if (!deductResult[0]?.success) {
  // Deduction failed - roll back assignment
  return { success: false, error: 'Insufficient credits' };
}
```

**Result:** ✅ Race conditions eliminated + clear feedback

---

## 🚀 Deployment Steps

### Step 1: Deploy Database Changes
1. Open **Supabase SQL Editor**
2. Run: `FIX_NEGATIVE_CREDITS_BUG.sql`
3. Expected output:
   ```
   ✅ CHECK constraints added to advisor_credits table
   ✅ Safe deduction function created (deduct_advisor_credit_safe)
   ✅ Constraints verified
   ✅ Data repair completed (if any negative credits existed)
   ```

### Step 2: Deploy Code Changes
1. **File:** `lib/advisorCreditService.ts`
2. Already modified - uses new safe function
3. Commit changes to repository

### Step 3: Data Repair (Automatic in SQL)
The SQL script automatically:
- ✅ Finds advisors with negative credits
- ✅ Sets their balance to 0
- ✅ Reports count repaired

### Step 4: Testing

**Test Case 1: Normal Deduction**
```
Setup: Advisor has 5 credits
Action: Assign credit to startup
Expected: Credits become 4 ✅
```

**Test Case 2: Prevent Over-Deduction**
```
Setup: Advisor has 1 credit
Action: Two simultaneous requests try to assign
Expected: First succeeds (0 credits left), second fails ✅
NO negative values ✅
```

**Test Case 3: Display Verification**
```
Navigate to: Investment Advisor Dashboard → Credits tab
Check: "Available Credits" shows ≥ 0 ✅
Check: Cannot toggle premium if balance is 0 ✅
```

---

## 🔍 Verification Queries

### Check Constraint Added
```sql
SELECT constraint_name, constraint_type, constraint_definition
FROM information_schema.table_constraints
WHERE table_name = 'advisor_credits'
  AND constraint_name LIKE '%check%';
-- Should show: check_credits_available_non_negative ✅
```

### Function Created Successfully
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'deduct_advisor_credit_safe'
  AND routine_schema = 'public';
-- Should show: deduct_advisor_credit_safe | function ✅
```

### No Negative Credits
```sql
SELECT COUNT(*) as negative_credits
FROM public.advisor_credits
WHERE credits_available < 0;
-- Should return: 0 ✅
```

### Test Safe Function
```sql
-- Get an advisor with credits
SELECT 'Testing safe deduction function';

-- Test the function
SELECT * FROM deduct_advisor_credit_safe(
  'advisor-user-id-here'::UUID, 
  1
) AS (
  success BOOLEAN,
  credits_before INTEGER,
  credits_after INTEGER,
  error_message TEXT
);
-- Should show: success=true, credits_after = credits_before - 1 ✅
```

---

## 📊 Impact Summary

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| **Database** | No constraints | CHECK constraints | ✅ Fixed |
| **Credit Deduction** | Unsafe UPDATE | Atomic RPC function | ✅ Fixed |
| **Race Condition** | Possible | Eliminated by row lock | ✅ Fixed |
| **Negative Credits** | Can occur | Prevented | ✅ Fixed |
| **Error Messages** | Generic | Detailed (balance info) | ✅ Fixed |
| **Code** | Non-atomic | Transaction-safe | ✅ Fixed |

---

## ⚠️ Rollback Plan

If issues occur:

### Option 1: Remove Constraints (Quick)
```sql
ALTER TABLE public.advisor_credits
DROP CONSTRAINT IF EXISTS check_credits_available_non_negative;

ALTER TABLE public.advisor_credits
DROP CONSTRAINT IF EXISTS check_credits_used_non_negative;

ALTER TABLE public.advisor_credits
DROP CONSTRAINT IF EXISTS check_credits_purchased_non_negative;
```

### Option 2: Revert Code
```bash
git revert [commit-hash]  # Revert lib/advisorCreditService.ts changes
```

---

## 🎯 Success Criteria

✅ **All of the following must be true:**

1. **No negative credits in database**
   ```sql
   SELECT COUNT(*) FROM advisor_credits WHERE credits_available < 0;
   -- Returns: 0
   ```

2. **CHECK constraints enforce non-negative values**
   ```sql
   -- Try to manually set negative (should fail):
   UPDATE advisor_credits SET credits_available = -1 WHERE ...;
   -- ERROR: new row for relation "advisor_credits" violates check constraint
   ```

3. **Safe deduction function works**
   ```sql
   SELECT * FROM deduct_advisor_credit_safe('test-id'::UUID, 1);
   -- Returns: success=true/false with detailed error message
   ```

4. **Frontend displays correctly**
   - Investment Advisor Dashboard → Credits tab
   - "Available Credits" shows ≥ 0 ✅
   - Cannot toggle if 0 credits ✅

5. **Multiple concurrent requests don't cause negative values**
   - Load test: 10 simultaneous assignment requests
   - Advisor has 5 credits
   - Expected: 5 succeed, 5 fail (no negative result) ✅

---

## 📝 Files Modified

1. **FIX_NEGATIVE_CREDITS_BUG.sql** (NEW)
   - Database constraints + safe function
   
2. **lib/advisorCreditService.ts** (MODIFIED)
   - Lines 481-507: Use safe RPC function instead of unsafe UPDATE

---

## 🔗 Related Documentation
- [ADVISOR_CREDIT_SYSTEM_COMPLETE_SUMMARY.md](ADVISOR_CREDIT_SYSTEM_COMPLETE_SUMMARY.md) - Complete system overview
- [DEPLOYMENT_AND_VERIFICATION_CHECKLIST.md](DEPLOYMENT_AND_VERIFICATION_CHECKLIST.md) - Full deployment guide

---

## Questions?

If you see negative credits again:
1. Check database still has CHECK constraints
2. Verify `deduct_advisor_credit_safe` function exists
3. Check browser console for error messages
4. Review Supabase function logs for RPC errors

