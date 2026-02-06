# Co-Investment Offer Complete Flow Documentation

## Overview
This document describes the complete co-investment workflow from creation through approval to network visibility. The system involves multiple approval stages to ensure proper due diligence and visibility across the investment network.

---

## 1. CREATION PHASE - How Investor Creates Co-Investment Offer

### 1.1 Investor Creates Co-Investment Opportunity

**Location**: `InvestorView.tsx` (Component: Investor Dashboard)

**Flow**:
1. Investor selects a startup they're interested in
2. Investor checks "Want to co-invest with other investors?" checkbox
3. Sets co-investment parameters:
   - Investment amount (lead investor's commitment)
   - Equity percentage
   - Minimum co-investment amount (minimum any co-investor must commit)
   - Maximum co-investment amount (total room available for co-investors)
   - Description (optional details about the opportunity)

4. **Database Table**: `co_investment_opportunities` gets created

**Table Structure** - `co_investment_opportunities`:
```sql
- id (SERIAL PRIMARY KEY)
- startup_id (FK to startups)
- listed_by_user_id (FK to users - the lead investor who created it)
- listed_by_type (VARCHAR: 'Investor' or 'Investment Advisor')
- investment_amount (DECIMAL - lead investor's commitment)
- equity_percentage (DECIMAL)
- minimum_co_investment (DECIMAL)
- maximum_co_investment (DECIMAL)
- description (TEXT)
- created_at / updated_at (TIMESTAMP)
```

### 1.2 Co-Investor Makes Investment Offer

**Location**: `InvestorView.tsx` (Component: Investor Dashboard - Co-Investment Opportunities section)

**Entry Point**: User sees available co-investment opportunities and selects "Make Offer"

**Process**:
1. Co-investor enters:
   - Investment amount (must be between min and max)
   - Equity percentage
   - Upfront fee (optional)
   - Success fee (optional)

2. **Function Called**: `db.createInvestmentOffer()` from `lib/database.ts`

3. **Data Routing**:
   - Checks if `co_investment_opportunity_id` is provided
   - If YES → Routes to `co_investment_offers` table
   - If NO → Routes to standard `investment_offers` table

### 1.3 Offer Stored in Co-Investment Offers Table

**Database Function Called**: `create_co_investment_offer()`

**Parameters**:
```sql
p_co_investment_opportunity_id INTEGER  -- Links to the opportunity
p_investor_email TEXT
p_startup_name TEXT
p_offer_amount DECIMAL
p_equity_percentage DECIMAL
p_currency TEXT (DEFAULT 'USD')
p_startup_id INTEGER (optional)
p_investment_id INTEGER (optional)
```

**Table Structure** - `co_investment_offers`:
```sql
- id (SERIAL PRIMARY KEY)
- co_investment_opportunity_id (FK to co_investment_opportunities)
- investor_email TEXT
- investor_id UUID (FK to users)
- investor_name TEXT
- startup_name TEXT
- startup_id INTEGER
- investment_id INTEGER
- offer_amount DECIMAL
- equity_percentage DECIMAL
- currency TEXT
- status (OFFER_STATUS: 'pending', 'pending_lead_investor_approval', 'pending_investor_advisor_approval', 'pending_startup_approval', 'approved', 'rejected', etc.)
- investor_advisor_approval_status (TEXT: 'not_required', 'pending', 'approved', 'rejected')
- investor_advisor_approval_at (TIMESTAMP)
- lead_investor_approval_status (TEXT: 'not_required', 'pending', 'approved', 'rejected')
- lead_investor_approval_at (TIMESTAMP)
- startup_approval_status (TEXT: 'pending', 'approved', 'rejected')
- startup_approval_at (TIMESTAMP)
- created_at / updated_at (TIMESTAMP)
```

**Initial Status Assignment**:
- If co-investor has an advisor → Status: `pending_investor_advisor_approval`
- If co-investor has NO advisor → Status: `pending_lead_investor_approval`
- Lead investor approval is ALWAYS required

---

## 2. APPROVAL PROCESS PHASE

### 2.1 Stage 1: Investor Advisor Approval (Conditional)

**Trigger**: Only if co-investor has an Investment Advisor assigned

**Who Approves**: The co-investor's Investment Advisor (if they have one)

**Where It Shows Up**: Investment Advisor Dashboard → Active Investments → Offers Made tab

**What They See**:
- List of pending co-investment offers from their investors
- Offer details: Startup, Amount, Equity %, Co-investment Opportunity details
- Status badge showing "Pending Investor Advisor Approval"
- Action buttons: Approve / Reject

**Database Function Called**: `approve_co_investment_offer_investor_advisor()`

**Parameters**:
```sql
p_offer_id INTEGER
p_approval_action TEXT ('approve' or 'reject')
```

**What Happens on Approval**:
- `investor_advisor_approval_status` → 'approved'
- `investor_advisor_approval_at` → NOW()
- Status → 'pending_lead_investor_approval' (moves to next stage)

**What Happens on Rejection**:
- `investor_advisor_approval_status` → 'rejected'
- `investor_advisor_approval_at` → NOW()
- Status → 'investor_advisor_rejected' (FINAL - stops approval flow)

**Status Transition Flow**:
```
pending_investor_advisor_approval
├── [APPROVE] → pending_lead_investor_approval
└── [REJECT] → investor_advisor_rejected (END)
```

### 2.2 Stage 2: Lead Investor Approval (Always Required)

**Trigger**: After Stage 1 is approved OR if no advisor exists, immediately after creation

**Who Approves**: The investor who created the co-investment opportunity (lead investor)

**Where It Shows Up**: Lead Investor Dashboard → (Offers received / Co-Investment Activity)

**Display Information**:
- Co-investment opportunity they listed
- New offers for that opportunity
- Co-investor details
- Investment terms
- Approval buttons

**Database Function Called**: `approve_co_investment_offer_lead_investor()`

**Parameters**:
```sql
p_offer_id INTEGER
p_lead_investor_id UUID (must match the opportunity creator)
p_approval_action TEXT ('approve' or 'reject')
```

**Validation**: 
- Only the investor who created the co-investment opportunity can approve/reject
- Function verifies: `co_investment_record.listed_by_user_id == p_lead_investor_id`

**What Happens on Approval**:
- `lead_investor_approval_status` → 'approved'
- `lead_investor_approval_at` → NOW()
- Status → 'pending_startup_approval' (moves to next stage)

**What Happens on Rejection**:
- `lead_investor_approval_status` → 'rejected'
- `lead_investor_approval_at` → NOW()
- Status → 'lead_investor_rejected' (FINAL - stops approval flow)

**Status Transition Flow**:
```
pending_lead_investor_approval
├── [APPROVE] → pending_startup_approval
└── [REJECT] → lead_investor_rejected (END)
```

### 2.3 Stage 3: Startup Advisor Approval (Final)

**Trigger**: After Stage 2 is approved

**Who Approves**: The startup's Advisor (if assigned)

**Where It Shows Up**: Startup Advisor Dashboard → (Investment Management / Offers section)

**Display Information**:
- Offer details
- Both investors (lead + co-investor) information
- Total investment commitment
- Status badges

**Database Function Called**: `approve_co_investment_offer_startup()`

**Parameters**:
```sql
p_offer_id INTEGER
p_approval_action TEXT ('approve' or 'reject')
```

**What Happens on Approval**:
- `startup_approval_status` → 'approved'
- `startup_approval_at` → NOW()
- Status → 'approved' (FINAL - offer is accepted)
- Offer is now officially in the portfolio

**What Happens on Rejection**:
- `startup_approval_status` → 'rejected'
- `startup_approval_at` → NOW()
- Status → 'startup_rejected' (FINAL - stops approval flow)

**Status Transition Flow**:
```
pending_startup_approval
├── [APPROVE] → approved (END - ACCEPTED)
└── [REJECT] → startup_rejected (END)
```

---

## 3. INVESTOR ADVISOR DASHBOARD DISPLAY - During Approval Process

### 3.1 Active Investments Tab

**Location**: Investment Advisor Dashboard → Active Investments tab (main tab)

**Sub-tabs**:
1. **Interests** - Investment interests
2. **My Investments** - Stage 4 approved investments
3. **Co-Investment** - Co-investment opportunities being tracked
4. **Offers Made** - All offers created by this advisor

### 3.2 Co-Investment Sub-tab Content

**Table Columns**:
| Column | Data | Purpose |
|--------|------|---------|
| Startup | startup_name | Which startup the offer is for |
| Lead Investor | investor_name (from opportunity creator) | Who created the co-investment opportunity |
| Investment Amount | offer_amount | How much the co-investor is investing |
| Status | status field | Current stage of approval (color-coded badges) |
| Actions | Approve/Reject buttons | Approve or reject the offer |

### 3.3 Status Display in Dashboard

**Color-Coded Status Badges**:

| Status | Badge Color | Meaning | Action Available |
|--------|------------|---------|------------------|
| pending_investor_advisor_approval | Yellow | Awaiting this advisor's approval | ✅ Approve/Reject |
| pending_lead_investor_approval | Blue | Lead investor needs to approve | ❌ None (waiting) |
| pending_startup_approval | Purple | Startup advisor needs to approve | ❌ None (waiting) |
| approved | Green | Fully approved, in portfolio | ❌ None |
| investor_advisor_rejected | Red | Rejected by investor's advisor | ❌ None |
| lead_investor_rejected | Red | Rejected by lead investor | ❌ None |
| startup_rejected | Red | Rejected by startup advisor | ❌ None |

### 3.4 Offers Made Sub-tab Content

**Shows**:
- All offers created by the advisor (both regular and co-investment)
- Separate rows for each offer
- Current approval status
- Investor and startup details

**Table Columns**:
| Column | Data | Purpose |
|--------|------|---------|
| Startup | startup_name | Target startup |
| Amount | offer_amount | Investment amount |
| Equity % | equity_percentage | Equity requested |
| Upfront Fee | upfront_fee | Fee structure |
| Success Fee | success_fee | Performance-based fee |
| Status | status field | Current stage |
| Created | created_at | When offer was made |
| Action | Buttons | Delete if rejected |

---

## 4. NETWORK VISIBILITY PHASE - After Approval

### 4.1 How It's Shown to Network

**Component**: Investment Advisor Recommendation System

**Location**: `InvestmentAdvisorView.tsx` → `handleRecommendCoInvestment()` function

**Process**:

1. **Advisor Recommends Co-Investment Opportunity**:
   - Advisor navigates to Active Investments → Co-Investment sub-tab
   - Clicks "Recommend to Network" button for a co-investment opportunity
   - Opens recommendation modal

2. **Modal Opens** with options to:
   - Select individual investors from their network
   - Select collaborators (other investment advisors)
   - Select entire mandate groups
   - Quick actions: Select All / Deselect All

3. **Advisor Selects Recipients** and submits recommendations

### 4.2 Recommendation Storage

**Database Table**: `investment_advisor_recommendations`

**Table Structure**:
```sql
- id (SERIAL PRIMARY KEY)
- investment_advisor_id UUID (FK to users - who made the recommendation)
- startup_id INTEGER (FK to startups - the co-investment opportunity)
- investor_id UUID (FK to users - recipient: either investor or collaborator)
- recommended_deal_value DECIMAL
- recommended_valuation DECIMAL
- recommendation_notes TEXT
- status VARCHAR (usually 'pending')
- created_at / updated_at (TIMESTAMP)
```

**Key Point**: The `investor_id` field stores both regular investor IDs and collaborator (advisor) IDs

### 4.3 What Recipients See in Their Dashboard

**Investors Receive**:
- Recommendation notification
- Co-investment opportunity details:
  - Lead investor commitment
  - Investment amount required
  - Equity percentage
  - Min/Max co-investment amounts
  - Opportunity description
- Option to make an offer or pass

**Collaborators (Other Advisors) Receive**:
- Same details as investors
- Can recommend further to their own investors
- Forwarding chain capability

### 4.4 Complete Network Flow After Approval

```
Approved Co-Investment Offer
        ↓
Investment Advisor Recommends
        ↓
Investment_Advisor_Recommendations Table Entry
        ↓
Recipients See in Their Dashboards
        ├→ Individual Investors
        ├→ Collaborators (Other Advisors)
        └→ Mandate Groups
        ↓
Recipients Can Make Counter-Offers or Accept Terms
```

---

## 5. COMPLETE STATUS FLOW DIAGRAM

### 5.1 Full Approval Journey

```
CO-INVESTOR MAKES OFFER
(created in co_investment_offers table)
        ↓
[IF CO-INVESTOR HAS ADVISOR]
    Status: pending_investor_advisor_approval
        ↓
    Investor Advisor Reviews
        ├─→ [APPROVE]
        │   investor_advisor_approval_status = 'approved'
        │   Status → pending_lead_investor_approval
        │
        └─→ [REJECT]
            investor_advisor_approval_status = 'rejected'
            Status → investor_advisor_rejected ❌ (STOP)
        ↓
[LEAD INVESTOR APPROVAL - ALWAYS HAPPENS]
    Status: pending_lead_investor_approval
        ↓
    Lead Investor Reviews (from their own dashboard)
        ├─→ [APPROVE]
        │   lead_investor_approval_status = 'approved'
        │   Status → pending_startup_approval
        │
        └─→ [REJECT]
            lead_investor_approval_status = 'rejected'
            Status → lead_investor_rejected ❌ (STOP)
        ↓
[STARTUP ADVISOR APPROVAL - FINAL STAGE]
    Status: pending_startup_approval
        ↓
    Startup Advisor Reviews
        ├─→ [APPROVE]
        │   startup_approval_status = 'approved'
        │   Status → approved ✅ (ACCEPTED INTO PORTFOLIO)
        │
        └─→ [REJECT]
            startup_approval_status = 'rejected'
            Status → startup_rejected ❌ (STOP)
        ↓
[NETWORK VISIBILITY]
    Investment Advisor Recommends to Network
        ↓
    Creates investment_advisor_recommendations entries
        ↓
    Recipients See in Their Dashboards
        ↓
    Network Can Make Decisions
```

### 5.2 Approval Status Summary

**Investor Advisor Status** (if applicable):
- `not_required` - No investor advisor assigned
- `pending` - Awaiting investor advisor approval
- `approved` - Investor advisor approved ✅
- `rejected` - Investor advisor rejected ❌

**Lead Investor Status** (always required):
- `not_required` - (rare, shouldn't happen normally)
- `pending` - Awaiting lead investor approval
- `approved` - Lead investor approved ✅
- `rejected` - Lead investor rejected ❌

**Startup Status** (final approval):
- `pending` - Awaiting startup advisor approval
- `approved` - Startup approved ✅
- `rejected` - Startup rejected ❌

**Overall Offer Status**:
- `pending` - Initial state
- `pending_investor_advisor_approval` - Awaiting first approval stage
- `investor_advisor_rejected` - REJECTED ❌
- `pending_lead_investor_approval` - Awaiting lead investor
- `lead_investor_rejected` - REJECTED ❌
- `pending_startup_approval` - Awaiting final approval
- `startup_rejected` - REJECTED ❌
- `approved` - FULLY APPROVED ✅

---

## 6. KEY DATA RELATIONSHIPS

### 6.1 Table Relationships

```
co_investment_opportunities
    ↓ (FK: co_investment_opportunity_id)
co_investment_offers
    ↓ (FK: startup_id)
startups
    ↓
investment_advisor_recommendations
    ↓
users (investors/advisors)
```

### 6.2 Important Fields to Track

**For Advisors**:
- `investor_advisor_approval_status` - Their approval decision
- `investor_advisor_approval_at` - When they approved
- When status is `pending_investor_advisor_approval` - It's their turn

**For Lead Investors**:
- `lead_investor_approval_status` - Their approval decision
- `lead_investor_approval_at` - When they approved
- When status is `pending_lead_investor_approval` - It's their turn

**For Startups**:
- `startup_approval_status` - Their approval decision
- `startup_approval_at` - When they approved
- When status is `pending_startup_approval` - It's their turn

---

## 7. API FUNCTIONS USED

| Function | Purpose | Called From |
|----------|---------|------------|
| `create_co_investment_offer()` | Create new offer | `lib/database.ts` createInvestmentOffer() |
| `approve_co_investment_offer_investor_advisor()` | Stage 1 approval | Investment Advisor Dashboard |
| `approve_co_investment_offer_lead_investor()` | Stage 2 approval | Lead Investor Dashboard |
| `approve_co_investment_offer_startup()` | Stage 3 approval | Startup Dashboard |

---

## 8. SUMMARY TABLE

| Phase | Who | Where | What They Do | Result |
|-------|-----|-------|--------------|--------|
| **Creation** | Investor | Investor Dashboard | Create co-investment opportunity, Set terms | `co_investment_opportunities` created |
| **Creation** | Co-Investor | Investor Dashboard | Make investment offer | `co_investment_offers` created |
| **Approval 1** | Investor Advisor | Investment Advisor Dashboard → Offers Made | Approve/Reject offer | Status changes to next stage or rejected |
| **Approval 2** | Lead Investor | Lead Investor Dashboard | Approve/Reject offer | Status changes to next stage or rejected |
| **Approval 3** | Startup Advisor | Startup Dashboard | Approve/Reject offer | Status = 'approved' or rejected |
| **Network** | Investment Advisor | Investment Advisor Dashboard → Co-Investment tab | Recommend to network | `investment_advisor_recommendations` created |
| **Network** | Recipients | Their Dashboards | See recommendations | Make informed investment decisions |

---

## 9. CURRENT IMPLEMENTATION IN COMPONENT

### 9.1 InvestmentAdvisorView.tsx Key Code Locations

- **Line 76**: `activeInvestmentsSubTab` state definition
- **Line 3766**: Fetch `co_investment_offers` data
- **Line 5491**: `handleRecommendCoInvestment()` function
- **Line 5820**: `handleSubmitRecommendations()` function
- **Line 5900**: `handleAdvisorApproval()` function
- **Line 7306-8037**: Status-based conditional rendering for approval display
- **Line 9035-9550**: Active Investments tab with 4 sub-tabs
- **Line 9354+**: Co-Investment sub-tab display

---

## 10. NOTES & OBSERVATIONS

### Important Points:
1. **Two-Stage Advisor Approval**: 
   - First: Co-investor's advisor (if exists)
   - Second: Lead investor (investor who created opportunity)

2. **Always Required**: Lead investor approval is mandatory, happens after advisor approval

3. **Final Stage**: Startup advisor must approve before offer is accepted into portfolio

4. **Network Visibility**: Happens AFTER all approvals, via recommendations system

5. **Recommendation Table**: Uses `investment_advisor_recommendations` - same table for co-investment and regular recommendations

6. **Status Tracking**: Multiple status fields allow fine-grained tracking of where approval is stuck

7. **RLS Policies**: Each user can only see their own offers and recommendations based on Supabase RLS policies

8. **Color Coding**: Different statuses shown with different colored badges for visual clarity
