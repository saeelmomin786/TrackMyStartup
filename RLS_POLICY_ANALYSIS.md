# RLS Policy Analysis for Startup Dashboard Access

## Issue Identified

When investors and investment advisors view startup dashboards, **RLS (Row Level Security) policies** may be blocking access to certain tables, causing:
- Missing profile data (subsidiaries, international operations)
- Missing company documents
- Incomplete data in various tabs

## Tables Affected

The following tables are queried when loading startup dashboard data:

1. ✅ **startups** - Has RLS policies (should be accessible)
2. ✅ **fundraising_details** - Has RLS policies (should be accessible)
3. ⚠️ **startup_shares** - May have restrictive policies
4. ⚠️ **founders** - May have restrictive policies
5. ❌ **subsidiaries** - **Likely missing RLS policies**
6. ❌ **international_operations** - **Likely missing RLS policies**
7. ❌ **company_documents** - **Likely missing RLS policies**

## Current RLS Policy Status

### Tables with Existing Policies

1. **startups table**
   - Policy: "Investors with due diligence can view startups"
   - Policy: "Investment Advisors can view all startups"
   - OR: "startups_select_all" (allows anyone to view)

2. **fundraising_details table**
   - Policy: "fundraising_details_read_all" (allows all authenticated users)

3. **startup_shares table**
   - May have policies for investors with due diligence
   - May have policies for investment advisors

4. **founders table**
   - May have policies for investors with due diligence
   - May have policies for investment advisors

### Tables Likely Missing Policies

1. **subsidiaries table**
   - **Problem**: If RLS is enabled but no policies exist, all queries will fail
   - **Impact**: Profile tab and Compliance tab won't show subsidiaries

2. **international_operations table**
   - **Problem**: If RLS is enabled but no policies exist, all queries will fail
   - **Impact**: Profile tab and Compliance tab won't show international operations

3. **company_documents table**
   - **Problem**: If RLS is enabled but no policies exist, all queries will fail
   - **Impact**: Company Documents section in Compliance tab won't show documents

## Solution

Created `FIX_STARTUP_DASHBOARD_RLS_POLICIES.sql` which:

1. **Checks current RLS status** for all relevant tables
2. **Creates missing policies** for:
   - subsidiaries table
   - international_operations table
   - company_documents table
3. **Verifies existing policies** for:
   - fundraising_details
   - startup_shares
   - founders
4. **Ensures Investment Advisors** can view all data
5. **Ensures Investors with due diligence** can view data
6. **Allows startup owners** to view their own data

## How to Apply the Fix

1. Open Supabase SQL Editor
2. Run `FIX_STARTUP_DASHBOARD_RLS_POLICIES.sql`
3. Verify policies were created (the script includes verification queries)
4. Test startup dashboard access from investor/investment advisor views

## Policy Structure

Each table now has policies that allow:

1. **Investment Advisors** - Can view all data (full access)
2. **Investors with Due Diligence** - Can view data for startups they have access to
3. **Startup Owners** - Can view their own data
4. **CA/CS/Admin** - Can view all data

## Testing Checklist

After applying the fix, verify:

- [ ] Investors can view startup dashboards
- [ ] Investment advisors can view startup dashboards
- [ ] Profile tab shows subsidiaries
- [ ] Profile tab shows international operations
- [ ] Compliance tab shows company documents
- [ ] All tabs load without errors
- [ ] No console errors about RLS policies

## Error Messages to Watch For

If RLS policies are still blocking access, you may see:

- `new row violates row-level security policy`
- `permission denied for table`
- `policy violation`
- Empty data arrays when data should exist

## Additional Notes

- The script uses `DO $$` blocks to handle tables that may not exist (like `international_operations`)
- Policies are created with `IF NOT EXISTS` checks to avoid conflicts
- All policies use `TO authenticated` to ensure only logged-in users can access data
- The script includes verification queries at the end to confirm policies were created




