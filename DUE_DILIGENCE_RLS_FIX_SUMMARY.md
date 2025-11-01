# Due Diligence RLS Access Fix

## Problem Identified

When investors or investment advisors click "Due Diligence" in the discover page and access a startup's dashboard, the data is not loading properly. This includes:

- **Equity Allocation tab**: Showing zeros/null values for Total Shares, Price/Share, Total Funding, etc.
- **Employees tab**: Showing zeros for all employee data and ESOP configuration warnings
- **Financial records**: Not loading properly
- **Investment records**: Not accessible

## Root Cause

The RLS (Row Level Security) policies on the following tables only allow:
1. Startup owners to view their own data
2. CA/CS/Admin roles to view all data

**However, there were NO policies allowing:**
- Investors with completed due diligence requests to view startup data
- Investment advisors to view startup data for their advisory role

## Solution

Created comprehensive RLS policies in `FIX_DUE_DILIGENCE_RLS_ACCESS.sql` that:

### 1. **For Investors with Completed Due Diligence**
- Check if user has a `completed` status due diligence request for the startup
- Allow SELECT access to:
  - `startups` table
  - `financial_records` table
  - `employees` table
  - `investment_records` table
  - `startup_shares` table
  - `founders` table

### 2. **For Investment Advisors**
- Allow Investment Advisors to view ALL startup data (for their advisory role)
- No due diligence requirement needed for advisors

### 3. **Data Type Handling**
- Handles the fact that `due_diligence_requests.startup_id` is TEXT while most other tables use INTEGER
- Policies check both `ddr.startup_id::INTEGER = table.startup_id` and `ddr.startup_id = table.startup_id::TEXT`

## Tables Affected

1. ✅ **startups** - Main startup data
2. ✅ **financial_records** - Financial data shown in Financials tab
3. ✅ **employees** - Employee data shown in Employees tab
4. ✅ **investment_records** - Investment history shown in CapTable
5. ✅ **startup_shares** - Share data shown in Equity Allocation tab
6. ✅ **founders** - Founder information

## How to Apply

1. **Run the SQL script:**
   ```sql
   -- Execute FIX_DUE_DILIGENCE_RLS_ACCESS.sql in your Supabase SQL editor
   ```

2. **Verify policies were created:**
   ```sql
   SELECT policyname, cmd FROM pg_policies 
   WHERE tablename IN ('financial_records', 'employees', 'investment_records', 'startups', 'startup_shares', 'founders')
   ORDER BY tablename, policyname;
   ```

3. **Test the fix:**
   - As an investor, request due diligence for a startup
   - Startup owner approves the request (status = 'completed')
   - Investor clicks "Due Diligence" again - should now have full access
   - Check that all tabs load data properly:
     - Dashboard ✅
     - Equity Allocation ✅
     - Employees ✅
     - Financials ✅
     - CapTable ✅

## Testing Checklist

### For Investors:
- [ ] Request due diligence for a startup
- [ ] Startup approves request (verify status = 'completed' in database)
- [ ] Investor clicks "Due Diligence" again
- [ ] Verify startup dashboard loads
- [ ] Check Equity Allocation tab - should show shares, valuation, funding
- [ ] Check Employees tab - should show employee count and ESOP data
- [ ] Check Financials tab - should show financial records
- [ ] Check CapTable tab - should show investment records

### For Investment Advisors:
- [ ] Investment advisor clicks on any startup
- [ ] Should have immediate access without due diligence request
- [ ] All tabs should load data properly
- [ ] No RLS blocking errors in console

## Policy Logic

Each policy uses an OR condition to allow access if ANY of these are true:

1. **User has completed due diligence:**
   ```sql
   EXISTS (
     SELECT 1 FROM users u
     JOIN due_diligence_requests ddr ON ddr.user_id = u.id
     WHERE u.id = auth.uid()
       AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
       AND (ddr.startup_id::INTEGER = table.startup_id OR ddr.startup_id = table.startup_id::TEXT)
       AND ddr.status = 'completed'
   )
   ```

2. **User is an Investment Advisor:**
   ```sql
   EXISTS (
     SELECT 1 FROM users
     WHERE id = auth.uid() AND role = 'Investment Advisor'
   )
   ```

3. **User owns the startup:**
   ```sql
   EXISTS (
     SELECT 1 FROM startups
     WHERE id = table.startup_id AND user_id = auth.uid()
   )
   ```

4. **User is CA/CS/Admin:**
   ```sql
   EXISTS (
     SELECT 1 FROM users
     WHERE id = auth.uid() AND role IN ('CA', 'CS', 'Admin')
   )
   ```

## Notes

- Policies are **permissive** (OR logic), so if any condition is true, access is granted
- Policies handle TEXT to INTEGER conversion for `startup_id` fields
- Investment advisors have broader access (all startups) without needing due diligence
- Regular investors need completed due diligence for each startup individually

## Status

✅ **Fix Created** - `FIX_DUE_DILIGENCE_RLS_ACCESS.sql`
⏳ **Pending** - Run SQL script in database
⏳ **Pending** - Test with actual investor and advisor accounts

