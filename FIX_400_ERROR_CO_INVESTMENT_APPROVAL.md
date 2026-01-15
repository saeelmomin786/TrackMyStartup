# Fix 400 Error for approve_co_investment_offer_investor_advisor

## Problem
The `approve_co_investment_offer_investor_advisor` RPC function is returning a 400 error when called from the frontend.

## Root Cause
The function may not exist in the database, or it may be querying the wrong table (`investment_offers` instead of `co_investment_offers`).

## Solution

### Step 1: Run the Fix SQL
Run `FIX_APPROVE_CO_INVESTMENT_OFFER_INVESTOR_ADVISOR.sql` in your Supabase SQL Editor. This will:
- Drop any incorrect versions of the function
- Create the correct function that queries `co_investment_offers` table
- Add proper error handling and validation
- Grant execute permissions to authenticated users

### Step 2: Test the Function
Run `TEST_APPROVE_CO_INVESTMENT_FUNCTION.sql` to:
- Verify the function exists
- Check for offers pending approval
- Verify RLS policies
- Test the function with a sample offer

### Step 3: Verify in Frontend
The frontend code has been updated to show better error messages. If you still see errors:
1. Check the browser console for detailed error messages
2. Verify the offer ID being passed is from `co_investment_offers` table
3. Ensure the offer status is `pending_investor_advisor_approval` or `investor_advisor_approval_status` is `pending`

## Common Issues

### Issue 1: Function Not Found (Error Code 42883)
**Solution**: Run `FIX_APPROVE_CO_INVESTMENT_OFFER_INVESTOR_ADVISOR.sql`

### Issue 2: Offer Not Found
**Solution**: Verify the offer ID exists in `co_investment_offers` table:
```sql
SELECT id, status, investor_advisor_approval_status 
FROM co_investment_offers 
WHERE id = <your_offer_id>;
```

### Issue 3: Wrong Status
**Solution**: The offer must have:
- `status = 'pending_investor_advisor_approval'` OR
- `investor_advisor_approval_status = 'pending'`

### Issue 4: RLS Policy Blocking Access
**Solution**: Ensure RLS policies allow the authenticated user to read/update `co_investment_offers` table. Check policies:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'co_investment_offers';
```

## Files Changed
1. `FIX_APPROVE_CO_INVESTMENT_OFFER_INVESTOR_ADVISOR.sql` - SQL fix for the function
2. `TEST_APPROVE_CO_INVESTMENT_FUNCTION.sql` - Test/debug queries
3. `lib/database.ts` - Enhanced error handling
4. `components/InvestmentAdvisorView.tsx` - Better error messages for users
