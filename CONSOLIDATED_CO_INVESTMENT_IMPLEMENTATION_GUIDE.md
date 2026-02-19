# Consolidated Co-Investment Offers Implementation Guide

## Overview
This implementation consolidates the co-investment offer flow from **creating 2 separate offers** to **creating 1 combined offer** that contains all necessary information in one record.

### Previous Flow (❌ Problematic)
```
Co-Investor applies to co-investment opportunity
    ↓
    Creates 2 offers:
    - Regular offer (investment_offers table)
    - Co-investment offer (co_investment_offers table)
    ↓
    Investor advisor sees & reviews BOTH offers (duplicate approvals)
    ↓
    Confusing, redundant, hard to track
```

### New Flow (✅ Consolidated)
```
Co-Investor applies to co-investment opportunity
    ↓
    Creates 1 COMBINED offer (investment_offers table)
    - Contains: investor amount + lead investor details + remaining amounts
    ↓
    All stakeholders see ONE clear offer with full context
    ↓
    SINGLE approval chain: Investor Advisor → Lead Investor → Startup Advisor → Startup
```

---

## Database Changes

### 1. New Columns in `investment_offers` Table
Added the following columns to store co-investment context:

```sql
-- Co-investment specific fields
remaining_co_investment_amount DECIMAL(15,2)          -- Remaining for other co-investors
lead_investor_id UUID                                  -- ID of lead investor
lead_investor_name TEXT                                -- Lead investor name (denormalized)
lead_investor_email TEXT                               -- Lead investor email (denormalized)
lead_investor_amount DECIMAL(15,2)                     -- Amount lead committed
total_co_investment_needed DECIMAL(15,2)               -- Total investment for opportunity
minimum_co_investment_amount DECIMAL(15,2)             -- Min per co-investor
maximum_co_investment_amount DECIMAL(15,2)             -- Max per co-investor
```

**Why denormalize?**
- UI displays need fast access to lead investor names without additional queries
- Reduces database round-trips during approval workflows
- Provides audit trail of what was shown to stakeholders

### 2. New SQL Functions Created

#### `create_co_investment_combined_offer()`
- **Creates:** ONE offer in `investment_offers` table
- **Parameters:**
  - `p_investor_id`: Investor UUID
  - `p_investor_email`: Investor email
  - `p_startup_id`: Startup ID
  - `p_co_investment_opportunity_id`: Opportunity ID
  - `p_offer_amount`: Amount investor is committing
  - `p_equity_percentage`: Equity percentage
  - `p_currency`: Currency code (default: USD)
- **Returns:** JSON with success status and offer details
- **Validation:**
  - Checks min/max bounds on offer amount
  - Fetches lead investor details automatically
  - Calculates remaining available amount

#### `approve_consolidated_co_investment_investor_advisor()`
- **Reviews:** Investor's participation and fit with co-investment
- **Displays:** Full context including lead investor details
- **Updates:** `investor_advisor_approval_status` and moves to stage 2
- **Next:** Leads to lead investor approval

#### `approve_consolidated_co_investment_lead_investor()`
- **Reviews:** Co-investor alignment with lead investor's strategy
- **Checks:** If startup has advisor (determines next stage)
- **Updates:** `lead_investor_approval_status`
- **Next:** To startup advisor (if exists) or startup founder

#### `approve_consolidated_co_investment_startup_advisor()`
- **Reviews:** Investment fit with startup's needs
- **Shows:** Full co-investment context with lead investor details
- **Updates:** `startup_advisor_approval_status`
- **Next:** To startup founder final approval

#### `approve_consolidated_co_investment_startup()`
- **Final Decision:** Startup founder accepts/rejects co-investor
- **Result:** `approved` or `rejected` status
- **Complete:** Ends approval chain

#### `get_consolidated_co_investment_display()`
- **Purpose:** Fetch formatted offer details for UI display
- **Returns:** Structured JSON with:
  - Co-investor information
  - Lead investor context
  - Round summary (total needed, committed, remaining)
  - Full approval chain status
  - Display-friendly text for UI

### 3. Views Created

#### `investor_advisor_co_investment_offers`
Shows investor advisor the offers they need to review with:
- Co-investor amount and equity
- Lead investor name and amount
- Remaining available for other co-investors
- Minimum/maximum bounds

#### `startup_co_investment_offers`
Shows startup founder co-investment offers with:
- Co-investor details
- Lead investor context (name, email, amount)
- Total invested so far
- Amount remaining
- Display summary text

---

## Application Changes

### 1. Database Service (`lib/database.ts`)

#### Updated `createInvestmentOffer()`
**Old Logic:**
```typescript
if (offerData.co_investment_opportunity_id) {
  // Call: create_co_investment_offer() RPC → creates in co_investment_offers table
  // Returns offer from co_investment_offers table
}
```

**New Logic:**
```typescript
if (offerData.co_investment_opportunity_id) {
  // Call: create_co_investment_combined_offer() RPC → creates in investment_offers table
  // Returns offer with all co-investment fields populated
  // Contains: investor amount, lead investor details, remaining amounts
}
```

#### New Approval Methods Added
```typescript
// Consolidated approval workflow
approveConsolidatedCoInvestmentInvestorAdvisor(offerId, action)
approveConsolidatedCoInvestmentLeadInvestor(offerId, action)
approveConsolidatedCoInvestmentStartupAdvisor(offerId, action)
approveConsolidatedCoInvestmentStartup(offerId, action)

// Display helper
getConsolidatedCoInvestmentDisplay(offerId)
```

---

## UI/Component Updates Needed

### 1. Investor Advisor View
When displaying co-investment offers for approval:

**Show Single Consolidated Offer:**
```
┌─────────────────────────────────────────┐
│ CO-INVESTMENT OFFER REVIEW              │
├─────────────────────────────────────────┤
│ ROUND STRUCTURE                         │
├─────────────────────────────────────────┤
│ Lead Investor: John Smith               │
│   → Committed: USD 600,000              │
│   → Equity: 20%                         │
│                                         │
│ This Co-Investor: Jane Doe              │
│   → Offering: USD 200,000               │
│   → Equity: 20%                         │
│                                         │
│ ROUND STATUS                            │
├─────────────────────────────────────────┤
│ Total Needed: USD 1,000,000             │
│ Total Committed: USD 800,000            │
│ Still Available: USD 200,000            │
│ Min per investor: USD 100,000           │
│ Max per investor: USD 400,000           │
├─────────────────────────────────────────┤
│ [APPROVE] [REJECT]                      │
└─────────────────────────────────────────┘
```

**Old (❌ Confusing):**
- Two separate offers shown
- Investor advisor sees normal offer + co-investment offer
- Confusing which one to approve

### 2. Lead Investor Dashboard
When reviewing co-investor applications:

**Show Combined Context:**
```
┌─────────────────────────────────────────┐
│ CO-INVESTOR APPLICATION: Jane Doe       │
├─────────────────────────────────────────┤
│ Offering: USD 200,000 for 20% equity    │
│                                         │
│ MY INVESTMENT (Lead):                   │
│ USD 600,000 for 20% equity              │
│                                         │
│ ROUND DETAILS:                          │
│ Total: USD 1,000,000                    │
│ After approval: USD 800,000 committed   │
│ Still available: USD 200,000            │
├─────────────────────────────────────────┤
│ [APPROVE] [REJECT]                      │
└─────────────────────────────────────────┘
```

### 3. Startup Founder Real Estate
When reviewing co-investor offers:

**Show Lead Investor in Context:**
```
┌─────────────────────────────────────────┐
│ CO-INVESTMENT OFFER                     │
├─────────────────────────────────────────┤
│ LEAD INVESTOR ROUND                     │
│ Led By: John Smith (john@company.com)   │
│ Lead Commitment: USD 600,000            │
│                                         │
│ NEW CO-INVESTOR                         │
│ Name: Jane Doe                          │
│ Email: jane@investor.com                │
│ Offering: USD 200,000                   │
│                                         │
│ TOTAL FROM THIS ROUND                   │
│ USD 800,000 (combined)                  │
├─────────────────────────────────────────┤
│ [ACCEPT] [REJECT]                       │
└─────────────────────────────────────────┘
```

### 4. Approval Chain Display
All stakeholders should see progression:

```
Stage 1: Investor Advisor       [✓ Approved] 
         Jane's advisor reviews fit

Stage 2: Lead Investor          [● Pending]  
         John (lead) confirms Jane joins

Stage 3: Startup Advisor        [○ Waiting]
         Tech advisor assesses fit

Stage 4: Startup Founder        [○ Waiting]
         Founder makes final decision
```

---

## Implementation Steps

### Step 1: Deploy SQL Changes
```bash
# Execute in Supabase SQL Editor:
1. CONSOLIDATE_CO_INVESTMENT_SINGLE_OFFER.sql
2. CONSOLIDATED_CO_INVESTMENT_APPROVAL_FLOWS.sql
```

### Step 2: Update Application Code
```bash
# Already done:
✅ lib/database.ts - Updated createInvestmentOffer() and added approval functions
```

### Step 3: Update UI Components (IN PROGRESS)
Components that need updates:
- InvestmentAdvisorView.tsx - Show consolidated offer
- StartupDashboardTab.tsx - Show lead investor context
- InvestorView.tsx - Show single co-investment offer in offers list
- Offer detail modals - Display all context fields

### Step 4: Test End-to-End
```
Test Scenario:
1. Lead Investor creates co-investment opportunity
2. Co-Investor applies (creates 1 consolidated offer)
3. Investor Advisor reviews (sees full context)
4. Lead Investor approves
5. Startup Advisor approves
6. Startup Founder accepts
✓ Verify offer shows as single consolidated record
✓ Verify all stakeholders see same offer details
✓ Verify no duplicate approvals
```

---

## Data Migration

### For Existing Co-Investment Offers
The SQL code includes a migration section:

```sql
-- Populate lead investor details in existing offers
UPDATE public.investment_offers io
SET 
    lead_investor_id = cio.listed_by_user_id,
    lead_investor_amount = cio.investment_amount,
    total_co_investment_needed = cio.investment_amount,
    minimum_co_investment_amount = cio.minimum_co_investment,
    maximum_co_investment_amount = cio.maximum_co_investment,
    remaining_co_investment_amount = cio.maximum_co_investment - io.offer_amount
FROM public.co_investment_opportunities cio
WHERE io.co_investment_opportunity_id = cio.id
AND io.is_co_investment = true
AND io.lead_investor_id IS NULL;
```

This ensures existing offers get lead investor information populated.

---

## Benefits of This Approach

### ✅ Investor Advisor Perspective
- **Single Review:** One offer to review, not two
- **Full Context:** Lead investor information visible
- **Clear Decision:** One approval that moves offer forward
- **Efficiency:** 50% fewer approvals to process

### ✅ Lead Investor Perspective
- **Simple Dashboard:** Co-investors listed clearly
- **Context:** See their own commitment + co-investor's
- **One Decision:** Single approve/reject per co-investor
- **Transparency:** Know exactly who's joining

### ✅ Startup Perspective
- **One Offer:** See single consolidated offer, not two
- **Leader Context:** Know who's leading the round
- **Investment Summary:** Total from this co-investment visible
- **Clear Approval:** One decision to accept/reject

### ✅ System Perspective
- **Reduced Complexity:** No more co_investment_offers table
- **Better Audit Trail:** All data in investment_offers
- **Cleaner Approvals:** Single chain, not splitting
- **Easier Queries:** One table to query for offers
- **Denormalization Benefits:** Fast UI rendering

---

## Backward Compatibility

⚠️ **Breaking Change:** After deployment, the old co_investment_offers table is deprecated.

**Migration Path:**
1. Old co-investment offers continue to work (via co_investment_offers table)
2. New co-investment offers use consolidated approach (via investment_offers)
3. Phase out old offers over time
4. Eventually deprecate co_investment_offers table

---

## Database Schema Diagram

```
NEW consolidated co-investment offer (investment_offers table):
┌─────────────────────────────────────────────┐
│ investment_offers                           │
├─────────────────────────────────────────────┤
│ id (PK)                                     │
│ investor_id, investor_email                 │
│ startup_id                                  │
│ offer_amount, equity_percentage             │
│ currency                                    │
│ is_co_investment = true                     │
│ co_investment_opportunity_id ←──────┐       │
│                                      │       │
│ ✨ NEW FIELDS:                       │       │
│ lead_investor_id ──────────┐         │       │
│ lead_investor_name         │         │       │
│ lead_investor_email        ├─────→ users    │
│ lead_investor_amount       │                │
│ remaining_co_investment_amount              │
│ total_co_investment_needed                  │
│ minimum_co_investment_amount                │
│ maximum_co_investment_amount                │
│                                      │       │
│ investor_advisor_approval_status     │       │
│ lead_investor_approval_status        │       │
│ startup_advisor_approval_status      │       │
│ stage (1-4)                          │       │
│ status                               │       │
└─────────────────────────────────────────────┘
                                       │
                                    co_investment_opportunities (parent)
```

---

## Support & Troubleshooting

### Issue: "Function not found" error when approving

**Solution:**
1. Ensure SQL files are executed in Supabase SQL Editor
2. Check function names match exactly
3. Refresh page to clear cache

### Issue: Lead investor details showing as NULL

**Solution:**
1. Verify opportunity has correct `listed_by_user_id`
2. Verify user exists in users table
3. Run migration script for existing offers

### Issue: Offer shows in two tables

**Solution:**
1. This is expected during transition period
2. New offers go to investment_offers
3. Old offers still in co_investment_offers
4. Phase out old approach after stabilization

---

## Timeline

- **Phase 1 (Current):** Deploy SQL + Update database.ts
- **Phase 2 (Next):** Update UI components to show consolidated offers
- **Phase 3:** Add feature flags to toggle between old/new
- **Phase 4:** Monitor production, fix issues
- **Phase 5 (Future):** Deprecate old co_investment_offers table
