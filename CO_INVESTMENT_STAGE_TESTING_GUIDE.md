# Co-Investment Stage-Wise Approval System Testing Guide

## Overview
This guide tests the complete co-investment flow with stage-wise approval system, following the same pattern as regular investment offers.

## Prerequisites
1. ✅ Run `CO_INVESTMENT_STAGE_APPROVAL_SYSTEM.sql` in Supabase
2. ✅ Run `TEST_CO_INVESTMENT_FLOW.sql` to verify database setup
3. ✅ Ensure you have users with different roles and advisor codes

## Co-Investment Stage Flow

### **Stage 1**: Lead Investor Creates Co-Investment Opportunity
- **Status**: Lead Investor Advisor Approval (if lead investor has advisor)
- **Auto-progression**: If no advisor, moves to Stage 2

### **Stage 2**: Lead Investor Advisor Approved → Startup Advisor Approval
- **Status**: Startup Advisor Approval (if startup has advisor)  
- **Auto-progression**: If no advisor, moves to Stage 3

### **Stage 3**: Startup Advisor Approved → Ready for Startup Review
- **Status**: Ready for Startup Review
- **Manual action**: Startup can approve/reject

### **Stage 4**: Startup Approved → Co-Investment Opportunity Active
- **Status**: Approved and Active
- **Result**: Other investors can now express interest

## Test Scenarios

### **Scenario 1: Lead Investor with Advisor + Startup with Advisor**

**Setup**:
- Lead Investor has `investment_advisor_code_entered`
- Startup has `investment_advisor_code`

**Flow**:
1. **Lead Investor** creates co-investment opportunity
2. **Stage 1**: Shows in Lead Investor's Advisor dashboard
3. **Lead Investor Advisor** approves → moves to Stage 2
4. **Stage 2**: Shows in Startup's Advisor dashboard  
5. **Startup Advisor** approves → moves to Stage 3
6. **Stage 3**: Shows in Startup dashboard for review
7. **Startup** approves → moves to Stage 4
8. **Stage 4**: Co-investment opportunity is active

### **Scenario 2: Lead Investor without Advisor + Startup with Advisor**

**Setup**:
- Lead Investor has NO `investment_advisor_code_entered`
- Startup has `investment_advisor_code`

**Flow**:
1. **Lead Investor** creates co-investment opportunity
2. **Auto-progression**: Skips Stage 1 → moves to Stage 2
3. **Stage 2**: Shows in Startup's Advisor dashboard
4. **Startup Advisor** approves → moves to Stage 3
5. **Stage 3**: Shows in Startup dashboard for review
6. **Startup** approves → moves to Stage 4

### **Scenario 3: Lead Investor with Advisor + Startup without Advisor**

**Setup**:
- Lead Investor has `investment_advisor_code_entered`
- Startup has NO `investment_advisor_code`

**Flow**:
1. **Lead Investor** creates co-investment opportunity
2. **Stage 1**: Shows in Lead Investor's Advisor dashboard
3. **Lead Investor Advisor** approves → moves to Stage 2
4. **Auto-progression**: Skips Stage 2 → moves to Stage 3
5. **Stage 3**: Shows in Startup dashboard for review
6. **Startup** approves → moves to Stage 4

### **Scenario 4: No Advisors (Fastest Path)**

**Setup**:
- Lead Investor has NO `investment_advisor_code_entered`
- Startup has NO `investment_advisor_code`

**Flow**:
1. **Lead Investor** creates co-investment opportunity
2. **Auto-progression**: Skips Stage 1 & 2 → moves to Stage 3
3. **Stage 3**: Shows in Startup dashboard for review
4. **Startup** approves → moves to Stage 4

## Testing Steps

### **Step 1: Create Co-Investment Opportunity**

**Action**: Login as Investor → Make Offer with Co-Investment checkbox checked

**Expected**:
- [ ] Co-investment opportunity created in database
- [ ] Stage set to 1
- [ ] Appropriate approval statuses set based on advisor presence

**Database Check**:
```sql
SELECT 
    id,
    startup_id,
    stage,
    lead_investor_advisor_approval_status,
    startup_advisor_approval_status,
    startup_approval_status,
    created_at
FROM co_investment_opportunities 
ORDER BY created_at DESC 
LIMIT 1;
```

### **Step 2: Test Stage Progression**

**Check Console Logs**:
```
🔄 Processing co-investment flow for opportunity X, current stage: 1
✅ Lead investor has advisor code: ABC123, keeping at stage 1 for advisor approval
```

**Or**:
```
❌ Lead investor has no advisor code, moving to stage 2
✅ Co-investment opportunity X moved to stage 2
```

### **Step 3: Test Advisor Approvals**

**For Lead Investor Advisor**:
```sql
-- Approve co-investment opportunity
SELECT approve_lead_investor_advisor_co_investment(OPPORTUNITY_ID, 'approve');
```

**Expected**:
- [ ] Stage moves to 2 or 3 (depending on startup advisor)
- [ ] `lead_investor_advisor_approval_status` = 'approved'
- [ ] `lead_investor_advisor_approval_at` timestamp set

**For Startup Advisor**:
```sql
-- Approve co-investment opportunity  
SELECT approve_startup_advisor_co_investment(OPPORTUNITY_ID, 'approve');
```

**Expected**:
- [ ] Stage moves to 3
- [ ] `startup_advisor_approval_status` = 'approved'
- [ ] `startup_advisor_approval_at` timestamp set

### **Step 4: Test Startup Approval**

**Action**: In Startup Dashboard → Offers Received → Find co-investment opportunity

**Expected**:
- [ ] Shows stage status: "✅ Stage 3: Ready for Startup Review"
- [ ] Approve/Reject buttons available

**Database Check**:
```sql
-- Approve co-investment opportunity
SELECT approve_startup_co_investment(OPPORTUNITY_ID, 'approve');
```

**Expected**:
- [ ] Stage moves to 4
- [ ] `startup_approval_status` = 'approved'
- [ ] `startup_approval_at` timestamp set

### **Step 5: Verify Final State**

**Database Check**:
```sql
SELECT 
    id,
    stage,
    lead_investor_advisor_approval_status,
    startup_advisor_approval_status,
    startup_approval_status,
    status
FROM co_investment_opportunities 
WHERE id = OPPORTUNITY_ID;
```

**Expected**:
- [ ] `stage` = 4
- [ ] All approval statuses = 'approved' or 'not_required'
- [ ] `status` = 'active'

## Dashboard Testing

### **Lead Investor Dashboard**
- [ ] Shows co-investment opportunities created by them
- [ ] Shows stage status for each opportunity
- [ ] Can track approval progress

### **Lead Investor Advisor Dashboard**
- [ ] Shows co-investment opportunities at Stage 1
- [ ] Can approve/reject opportunities
- [ ] Approvals move opportunities to next stage

### **Startup Advisor Dashboard**
- [ ] Shows co-investment opportunities at Stage 2
- [ ] Can approve/reject opportunities
- [ ] Approvals move opportunities to Stage 3

### **Startup Dashboard**
- [ ] Shows co-investment opportunities at Stage 3
- [ ] Shows stage status: "✅ Stage 3: Ready for Startup Review"
- [ ] Can approve/reject opportunities
- [ ] Approvals move opportunities to Stage 4

## Error Handling Tests

### **Test 1: Invalid Approval Action**
```sql
-- This should fail
SELECT approve_lead_investor_advisor_co_investment(1, 'invalid_action');
```

**Expected**: Error message about invalid action

### **Test 2: Non-existent Opportunity**
```sql
-- This should fail
SELECT approve_lead_investor_advisor_co_investment(99999, 'approve');
```

**Expected**: Error message about opportunity not found

### **Test 3: Rejection Flow**
```sql
-- Reject at any stage
SELECT approve_lead_investor_advisor_co_investment(OPPORTUNITY_ID, 'reject');
```

**Expected**:
- [ ] Stage moves back to previous stage
- [ ] Approval status = 'rejected'
- [ ] Opportunity status = 'rejected'

## Success Criteria

✅ **Complete Stage-Wise Flow Works When**:
1. Co-investment opportunities start at Stage 1
2. Auto-progression works based on advisor presence
3. Manual approvals move opportunities through stages
4. Rejections move opportunities back
5. Final approval activates the opportunity
6. All dashboards show correct stage information
7. Database maintains proper stage and approval statuses

## Integration with Regular Investment Offers

The co-investment stage-wise approval system follows the exact same pattern as regular investment offers:

- **Same Stage Numbers**: 1, 2, 3, 4
- **Same Approval Logic**: Advisor presence determines auto-progression
- **Same UI Patterns**: Stage status display, approval buttons
- **Same Database Structure**: Stage, approval statuses, timestamps

This ensures consistency across the entire platform and makes it easy for users to understand both flows.




