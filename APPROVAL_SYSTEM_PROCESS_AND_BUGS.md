# Investment Offer Approval System - Process & Issues

## 📋 Complete Approval Flow Process

### **Stage 1: Offer Created**
- **Initial State**: When investor makes an offer
  - `stage = 1`
  - `status = 'pending'`
  - `investor_advisor_approval_status = 'not_required'` (if no advisor) OR `'pending'` (if has advisor)
  - `startup_advisor_approval_status = 'not_required'`

- **Auto-Progression Logic**:
  - If investor has NO advisor → Auto-progresses to Stage 2
  - If investor HAS advisor → Waits at Stage 1 for advisor approval

---

### **Stage 2: Investor Advisor Approval** (if investor has advisor)
- **After Stage 1 Approval**:
  - If investor advisor approves → Move to Stage 2 (or Stage 3 if startup has no advisor)
  - If investor advisor rejects → Back to Stage 1 with `status = 'rejected'`

- **Current Stage**: 
  - `stage = 2`
  - `status = 'pending_startup_advisor_approval'` OR `'pending_startup_review'`
  - `investor_advisor_approval_status = 'approved'`
  - `startup_advisor_approval_status = 'not_required'` (if no startup advisor) OR `'pending'` (if has startup advisor)

- **Auto-Progression Logic**:
  - If startup has NO advisor → Auto-progresses to Stage 3
  - If startup HAS advisor → Waits at Stage 2 for startup advisor approval

---

### **Stage 3: Startup Advisor Approval** (if startup has advisor)
- **After Stage 2 Approval**:
  - If startup advisor approves → Move to Stage 3 (ready for startup review)
  - If startup advisor rejects → Back to Stage 2 with `status = 'startup_advisor_rejected'`

- **Current Stage**:
  - `stage = 3`
  - `status = 'pending_startup_review'`
  - `startup_advisor_approval_status = 'approved'`

- **Next Step**: 
  - Startup can now see the offer and approve/reject it
  - No auto-progression - requires manual startup action

---

### **Stage 4: Startup Final Approval**
- **After Stage 3 Approval**:
  - If startup approves → Move to Stage 4 (finalized)
  - If startup rejects → Back to Stage 3 with `status = 'rejected'`

- **Current Stage**:
  - `stage = 4`
  - `status = 'accepted'` (for approval) OR `'rejected'` (for rejection)

---

## 🐛 **IDENTIFIED BUGS & ISSUES**

### **Bug 1: Status Values Mismatch**
**Problem**: The database functions use inconsistent status values:
- `approve_investor_advisor_offer` sets status to `'pending_startup_advisor_approval'` or `'pending_startup_review'`
- But the `investment_offers` table might have an enum type that doesn't include these values
- Status should use valid enum values: `'pending'`, `'accepted'`, `'rejected'`, `'completed'`

**Location**: 
- `FIX_APPROVAL_FLOW_BUGS_CLEAN.sql` lines 42, 45, 50, 105, 109, 164, 168

**Fix Needed**: Update status to use valid enum values or add missing values to enum

---

### **Bug 2: Approval Status Not Being Set Correctly**
**Problem**: In `approve_investor_advisor_offer` function (line 56):
```sql
investor_advisor_approval_status = p_approval_action,
```
This sets it to `'approve'` or `'reject'` instead of `'approved'` or `'rejected'`

**Fix Needed**: Should be:
```sql
investor_advisor_approval_status = CASE 
    WHEN p_approval_action = 'approve' THEN 'approved'
    ELSE 'rejected'
END,
```

---

### **Bug 3: Startup Advisor Status Not Being Set Correctly**
**Problem**: In `approve_startup_advisor_offer` function (line 115):
```sql
startup_advisor_approval_status = p_approval_action,
```
Same issue - sets to `'approve'`/`'reject'` instead of `'approved'`/`'rejected'`

**Fix Needed**: Should use CASE statement like above

---

### **Bug 4: Stage Progression Not Triggered After Approval**
**Problem**: The `handleInvestmentFlow` function in `lib/database.ts` checks advisor codes but doesn't automatically progress stages after advisor approvals are completed.

**Location**: `lib/database.ts` lines 1409-1442

**Issue**: 
- After investor advisor approves, the stage should automatically move to 2 or 3
- After startup advisor approves, the stage should automatically move to 3
- But the flow logic only checks when offer is created, not after each approval

**Fix Needed**: Trigger `handleInvestmentFlow` after each approval action

---

### **Bug 5: Missing Auto-Progression on Offer Creation**
**Problem**: When an offer is created, the `handleInvestmentFlow` function is called, but it might not properly set the initial advisor approval statuses.

**Location**: `lib/database.ts` lines 1400-1447

**Issue**:
- If investor has no advisor, it should set `investor_advisor_approval_status = 'not_required'` and auto-progress
- If investor has advisor, it should set `investor_advisor_approval_status = 'pending'` and stay at Stage 1
- Current code might not be setting these correctly

---

### **Bug 6: Status Enum Mismatch**
**Problem**: The frontend and backend might be using different status values:
- Frontend expects: `'pending'`, `'accepted'`, `'rejected'`, `'completed'`
- Backend functions create: `'pending_startup_advisor_approval'`, `'pending_startup_review'`

**Fix Needed**: Either:
1. Add these values to the enum type, OR
2. Map intermediate statuses to valid enum values

---

### **Bug 7: Missing Trigger on Approval**
**Problem**: After calling `approveInvestorAdvisorOffer` or `approveStartupAdvisorOffer`, the code doesn't automatically trigger the flow logic to move to the next stage.

**Location**: 
- `lib/database.ts` lines 1103-1142 (approval functions)
- `components/InvestmentAdvisorView.tsx` (where approvals are called)

**Fix Needed**: After approval, call `handleInvestmentFlow` to check and progress stages

---

## ✅ **HOW IT SHOULD WORK**

### **Correct Flow Example**:

1. **Investor Makes Offer** (Stage 1)
   - Check: Investor has advisor? 
   - YES → Set `investor_advisor_approval_status = 'pending'`, stay at Stage 1
   - NO → Set `investor_advisor_approval_status = 'not_required'`, move to Stage 2

2. **Investor Advisor Approves** (if applicable)
   - Set `investor_advisor_approval_status = 'approved'`
   - Check: Startup has advisor?
   - YES → Move to Stage 2, set `startup_advisor_approval_status = 'pending'`
   - NO → Move to Stage 3, set `startup_advisor_approval_status = 'not_required'`, set `status = 'pending'`

3. **Startup Advisor Approves** (if applicable)
   - Set `startup_advisor_approval_status = 'approved'`
   - Move to Stage 3
   - Set `status = 'pending'` (ready for startup review)

4. **Startup Approves**
   - Set `stage = 4`
   - Set `status = 'accepted'`
   - Reveal contact details (if appropriate)

---

## 🔧 **RECOMMENDED FIXES**

1. **Fix Approval Status Values**: Update SQL functions to use `'approved'`/`'rejected'` instead of `'approve'`/`'reject'`

2. **Fix Status Enum**: Use valid enum values (`'pending'`, `'accepted'`, `'rejected'`) or add new ones to enum type

3. **Trigger Flow After Approval**: Call `handleInvestmentFlow` after each approval action to auto-progress stages

4. **Set Initial Statuses Correctly**: On offer creation, properly set advisor approval statuses based on advisor existence

5. **Add Status Mapping**: Map intermediate statuses to valid enum values for display

---

## 📍 **KEY FILES TO FIX**

1. `FIX_APPROVAL_FLOW_BUGS_CLEAN.sql` - Fix approval status values
2. `lib/database.ts` - Fix `handleInvestmentFlow` and approval functions
3. `components/InvestmentAdvisorView.tsx` - Trigger flow after approvals
4. Database enum type - Add missing status values if needed


