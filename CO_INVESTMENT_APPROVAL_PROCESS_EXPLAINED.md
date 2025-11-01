# Co-Investment Approval Process - Complete Guide

## 📋 Overview

When an investor creates a co-investment opportunity, it goes through a **4-stage approval process**. The opportunity only becomes visible in the **Co-Investment Opportunities tab** after **ALL approvals are completed (Stage 4)**.

## 🔄 Complete Approval Flow

### **Stage 1: Lead Investor Creates Co-Investment Opportunity**

**What happens:**
1. Investor makes an offer and checks "Looking for Co-Investment Partners"
2. System creates a co-investment opportunity with:
   - `status = 'active'` (but not yet visible publicly)
   - `stage = 1`
   - `startup_approval_status = 'pending'`

**Where it shows:**
- ✅ **Lead Investor Dashboard** → Offers tab → "Co-Investment You Created" section
- ✅ **Lead Investor's Advisor Dashboard** (if advisor exists) → Needs approval

**Who can see it:**
- Lead investor who created it
- Lead investor's advisor (if exists)

**Auto-progression:**
- If lead investor has **NO advisor**: Auto-progresses to Stage 2
- If lead investor **has advisor**: Waits for advisor approval

---

### **Stage 2: Lead Investor Advisor Approval** (if advisor exists)

**What happens:**
- Lead investor's advisor reviews the opportunity
- Advisor can approve or reject

**If APPROVED:**
- Moves to Stage 2 (if startup has advisor) or Stage 3 (if startup has no advisor)

**If REJECTED:**
- Stays at Stage 1 with status 'rejected'

**Where it shows:**
- ✅ **Lead Investor's Advisor Dashboard** → Co-investment opportunities at Stage 1
- ✅ **Lead Investor Dashboard** → Shows pending advisor approval status

---

### **Stage 2/3: Startup Advisor Approval** (if startup has advisor)

**What happens:**
- Startup's advisor reviews the opportunity
- Advisor can approve or reject

**If APPROVED:**
- Moves to Stage 3 (ready for startup review)

**If REJECTED:**
- Status set to 'rejected'

**Where it shows:**
- ✅ **Startup's Advisor Dashboard** → Co-investment opportunities at Stage 2
- ✅ **Startup Dashboard** → Shows pending advisor approval status

---

### **Stage 3: Startup Review**

**What happens:**
- Startup owner reviews the co-investment opportunity
- Startup can approve or reject

**If APPROVED:**
- Moves to **Stage 4** → `status = 'active'` → **NOW VISIBLE IN PUBLIC TAB**

**If REJECTED:**
- Status set to 'rejected'

**Where it shows:**
- ✅ **Startup Dashboard** → Offers Received → Co-investment opportunities
- ✅ **Lead Investor Dashboard** → Shows pending startup approval

---

### **Stage 4: Approved and Active** ✅

**What happens:**
- `stage = 4`
- `startup_approval_status = 'approved'`
- `status = 'active'`

**Where it shows:**
- ✅ **Co-Investment Opportunities Tab** (Public/Recommendations tab) - **NOW VISIBLE TO ALL INVESTORS**
- ✅ **Lead Investor Dashboard** → Shows as approved
- ✅ **Startup Dashboard** → Shows as active

**Result:**
- Other investors can now see this opportunity
- Other investors can make offers to join the co-investment
- Opportunity appears in the "Co-Investment Opportunities" table

---

## 🔍 Current Issue

Looking at the code, I see that:

1. **When created**: `status = 'active'` is set immediately
2. **Query filter**: Co-Investment Opportunities tab filters by `status = 'active'`
3. **Problem**: Opportunities show up **BEFORE** all approvals are done

**This means opportunities are visible BEFORE they should be!**

## ✅ Correct Behavior Should Be

**Opportunities should ONLY show in Co-Investment Opportunities tab when:**
- `stage = 4` (all approvals done)
- `startup_approval_status = 'approved'`
- `status = 'active'`

**Opportunities should NOT show in public tab when:**
- `stage = 1, 2, or 3` (approvals pending)
- `startup_approval_status = 'pending'` or `'rejected'`

## 🔧 Fix Required

The query in `InvestorView.tsx` should filter not just by `status = 'active'`, but also by:
- `stage = 4` (final approval done)
- `startup_approval_status = 'approved'`

This ensures only fully approved opportunities are visible to all investors.

---

## 📊 Stage Summary Table

| Stage | Status | Visible to Lead Investor | Visible to Advisors | Visible to Startup | Visible in Public Tab |
|-------|--------|-------------------------|---------------------|-------------------|----------------------|
| 1 | Pending Lead Advisor | ✅ Yes | ✅ If advisor exists | ❌ No | ❌ No |
| 2 | Pending Startup Advisor | ✅ Yes | ✅ If advisor exists | ❌ No | ❌ No |
| 3 | Pending Startup Review | ✅ Yes | ✅ Approved | ✅ Yes | ❌ No |
| 4 | Approved & Active | ✅ Yes | ✅ Approved | ✅ Yes | ✅ **YES** |

---

## 🎯 Summary

**When investor creates co-investment:**
1. ✅ Shows in Lead Investor's dashboard immediately
2. ✅ Goes through approval stages (1→2→3→4)
3. ✅ After Stage 4 (startup approval): **Shows in Co-Investment Opportunities tab for all investors**

**Current Problem:**
- Opportunities are visible too early (immediately after creation)
- Should only be visible after Stage 4 approval

**Solution:**
- Update the query to filter by `stage = 4` AND `startup_approval_status = 'approved'` in addition to `status = 'active'`

