# Investment Advisor Dashboard - Complete Fix Workflow

## Overview
This document explains how to check and fix RLS policies for all 4 sections of the Investment Advisor Dashboard:
1. **Service Requests** - Startups and Investors who entered advisor code
2. **Investor Offers** - Offers from assigned investors
3. **Startup Offers** - Offers for assigned startups
4. **Co-Investment Opportunities** - All co-investment opportunities

## Step-by-Step Workflow

### Step 1: Check Existing Policies
**Run this first to see what already exists:**
```sql
CHECK_EXISTING_RLS_POLICIES.sql
```

This will show:
- All existing RLS policies for each table
- Which policies are missing
- Whether RLS is enabled on each table

### Step 2: Apply Fixes (Only What's Missing)
**Run this to fix missing policies:**
```sql
COMPLETE_INVESTMENT_ADVISOR_DASHBOARD_FIX.sql
```

This script:
- ✅ Checks existing policies BEFORE making changes
- ✅ Only creates policies that don't exist
- ✅ Skips if public read policies already exist
- ✅ Provides NOTICE messages about what it's doing
- ✅ Won't break existing functionality

### Step 3: Verify Everything Works
**Run this to verify all sections are configured:**
```sql
COMPREHENSIVE_INVESTMENT_ADVISOR_DASHBOARD_TEST.sql
```

This will show:
- ✅/❌ Status for each section
- Policy counts per table
- Final verification summary

## What Each Section Needs

### 1. Service Requests
**Tables:**
- `advisor_connection_requests` - Needs Investment Advisor policy
- `users` - Needs Investment Advisor OR Public read policy
- `startups` - Needs Investment Advisor OR Public read policy

**Why:** Investment Advisors need to see:
- Connection requests from startups/investors
- Users (to find investors who entered their code)
- Startups (to find startups who entered their code)

### 2. Investor Offers
**Tables:**
- `investment_offers` - Needs Investment Advisor policy for investors

**Why:** Investment Advisors need to see offers made by their assigned investors.

**Note:** Should already be fixed by `FIX_INVESTMENT_ADVISOR_OFFERS_RLS_SAFE.sql`

### 3. Startup Offers
**Tables:**
- `investment_offers` - Needs Investment Advisor policy for startups

**Why:** Investment Advisors need to see offers received by their assigned startups.

**Note:** Should already be fixed by `FIX_INVESTMENT_ADVISOR_OFFERS_RLS_SAFE.sql`

### 4. Co-Investment Opportunities
**Tables:**
- `co_investment_opportunities` - Needs Investment Advisor OR Public read policy
- `co_investment_offers` - Needs Investment Advisor policy

**Why:** Investment Advisors need to see all co-investment opportunities and offers from their clients.

## Safety Features

The fix script (`COMPLETE_INVESTMENT_ADVISOR_DASHBOARD_FIX.sql`) is designed to be safe:

1. **Checks First** - Verifies existing policies before making changes
2. **Additive Only** - Only adds missing policies, doesn't remove existing ones
3. **Respects Public Policies** - If a table has public read access, it skips creating Investment Advisor policy
4. **Idempotent** - Can be run multiple times safely
5. **Informative** - Provides NOTICE messages about what it's doing

## Expected Results

After running the fix script, you should see:

```
✅ Service Requests configured
✅ Investor Offers configured  
✅ Startup Offers configured
✅ Co-Investment Opportunities configured
```

## Troubleshooting

### If Service Requests still don't work:
1. Check if `users` and `startups` tables have public read policies OR Investment Advisor policies
2. Verify `advisor_connection_requests` has Investment Advisor policy
3. Check browser console for RLS errors (usually 42501 or PGRST301)

### If Investor/Startup Offers don't work:
1. Verify `FIX_INVESTMENT_ADVISOR_OFFERS_RLS_SAFE.sql` was run
2. Check if policies exist: `SELECT policyname FROM pg_policies WHERE tablename = 'investment_offers' AND qual LIKE '%Investment Advisor%'`

### If Co-Investment Opportunities don't work:
1. Check if `co_investment_opportunities` has Investment Advisor or Public policy
2. Verify `co_investment_offers` has Investment Advisor policy
3. Check if `CREATE_CO_INVESTMENT_OFFERS_TABLE.sql` was run

## Files Created

1. **CHECK_EXISTING_RLS_POLICIES.sql** - Check what exists
2. **COMPLETE_INVESTMENT_ADVISOR_DASHBOARD_FIX.sql** - Fix missing policies (safe)
3. **COMPREHENSIVE_INVESTMENT_ADVISOR_DASHBOARD_TEST.sql** - Verify everything
4. **CHECK_USERS_AND_STARTUPS_RLS_FOR_ADVISORS.sql** - Specific check for users/startups
5. **FIX_USERS_STARTUPS_RLS_FOR_ADVISORS.sql** - Fix users/startups access

## Next Steps

1. Run `CHECK_EXISTING_RLS_POLICIES.sql` to see current state
2. Run `COMPLETE_INVESTMENT_ADVISOR_DASHBOARD_FIX.sql` to fix missing policies
3. Run `COMPREHENSIVE_INVESTMENT_ADVISOR_DASHBOARD_TEST.sql` to verify
4. Test the dashboard in the browser




