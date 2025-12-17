# Troubleshooting: Investment Interests Not Showing

## Quick Diagnosis Steps

### Step 1: Run the Diagnostic SQL Script
Run `DIAGNOSE_INVESTMENT_INTERESTS_NOT_SHOWING.sql` in your Supabase SQL Editor. This will show:
- If there are any favorites in the database
- If investors have advisor codes entered
- If investors are accepted
- If the data matches correctly

### Step 2: Check Browser Console
Open the browser console (F12) and look for these logs when you click the Investment Interests tab:

```
🔍 Loading investment interests for investors: [count] [ids]
🔍 Advisor code: [code]
🔍 myInvestors details: [array]
🔍 Query result: { dataCount, error, ... }
```

**Common Issues to Look For:**

1. **"No accepted investors found"**
   - **Problem**: `myInvestors` is empty
   - **Solution**: Accept investor requests first in the "My Investors" tab

2. **"Query succeeded but returned 0 results"**
   - **Problem**: Either no favorites exist OR RLS is blocking
   - **Check**: Look at the "Direct check" log to see if favorites exist

3. **Error code `42501` or `PGRST301`**
   - **Problem**: RLS policy is blocking the query
   - **Solution**: Verify RLS policies are set up correctly (run `CHECK_FAVORITES_TABLE_STATUS.sql`)

4. **Error code `PGRST116`**
   - **Problem**: Table doesn't exist
   - **Solution**: Run `CREATE_INVESTOR_FAVORITES_TABLE.sql`

## Common Issues and Solutions

### Issue 1: No Accepted Investors
**Symptoms:**
- Investment Interests tab shows "No Investment Interests"
- Console shows: "⚠️ No accepted investors found"

**Solution:**
1. Go to "My Investors" tab
2. Accept investor requests (investors who entered your advisor code)
3. Refresh the Investment Interests tab

### Issue 2: Investors Haven't Favorited Any Startups
**Symptoms:**
- Console shows: "Query succeeded but returned 0 results"
- Direct check shows 0 favorites

**Solution:**
1. Have investors go to the Discover page
2. Have them click the heart icon on startups they like
3. Check that favorites are being saved (check browser console for ❤️ logs)

### Issue 3: ID Mismatch
**Symptoms:**
- Favorites exist in database
- Direct check finds favorites
- But query with joins returns 0 results

**Possible Causes:**
- `investor_favorites.investor_id` uses `auth.uid()` (auth user ID)
- `myInvestors` uses `users.id` (might be profile ID)
- These don't match

**Solution:**
Run this query to check:
```sql
-- Check if investor IDs match
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(if.id) as favorite_count
FROM users u
LEFT JOIN investor_favorites if ON if.investor_id = u.id
WHERE u.role = 'Investor'
AND u.advisor_accepted = true
GROUP BY u.id, u.name, u.email;
```

### Issue 4: RLS Policy Not Working
**Symptoms:**
- Error code `42501` or `PGRST301`
- Console shows RLS error

**Solution:**
1. Verify RLS is enabled: Run `CHECK_FAVORITES_TABLE_STATUS.sql`
2. Check policy exists: Should see "Investment Advisors can view assigned investor favorites"
3. Verify policy uses `auth.uid()` correctly
4. Test the policy manually in SQL Editor (while logged in as Investment Advisor)

## Testing Checklist

- [ ] Table `investor_favorites` exists
- [ ] RLS is enabled on the table
- [ ] Policy "Investment Advisors can view assigned investor favorites" exists
- [ ] You have at least one accepted investor (`advisor_accepted = true`)
- [ ] At least one accepted investor has favorited a startup
- [ ] Advisor code matches between advisor and investor
- [ ] Browser console shows no errors
- [ ] Query returns data (check console logs)

## Manual Test Query

Run this in Supabase SQL Editor (replace `YOUR_ADVISOR_CODE` with your actual code):

```sql
-- This should return investment interests
SELECT 
    if.id,
    if.investor_id,
    if.startup_id,
    if.created_at,
    investor.name as investor_name,
    startup.name as startup_name
FROM investor_favorites if
INNER JOIN users investor ON investor.id = if.investor_id
INNER JOIN users advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
INNER JOIN startups startup ON startup.id = if.startup_id
WHERE advisor.role = 'Investment Advisor'
AND advisor.investment_advisor_code = 'YOUR_ADVISOR_CODE'
AND investor.role = 'Investor'
AND investor.advisor_accepted = true
ORDER BY if.created_at DESC;
```

If this query returns results but the UI doesn't show them, there's likely a frontend issue.

## Still Not Working?

1. **Check the diagnostic SQL script results** - It will tell you exactly what's missing
2. **Check browser console** - Look for error messages or warnings
3. **Verify data exists** - Make sure investors have actually favorited startups
4. **Check RLS policies** - Make sure they're set up correctly
5. **Test with a simple query** - Use the manual test query above


