# Fix for Investment Advisor Favorites Not Working

## Problem
Investment advisors (and investors) cannot favorite/like startups - favorites are not being saved to the database.

## Solution

### Step 1: Run the SQL Script
You **MUST** run the SQL script in your Supabase database for favorites to work:

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `FIX_INVESTMENT_ADVISOR_FAVORITES.sql`
4. Click "Run" to execute the script

This script creates RLS (Row Level Security) policies that allow:
- Investment Advisors to insert their own favorites
- Investment Advisors to view their own favorites  
- Investment Advisors to delete their own favorites

### Step 2: Verify It's Working
After running the SQL script:

1. Refresh your browser
2. Log in as an Investment Advisor
3. Go to the Discovery tab
4. Click the heart icon on any startup
5. Check the browser console (F12) for logs starting with ❤️

### Expected Console Output (Success)
```
❤️ handleFavoriteToggle called for startup ID: 123
❤️ Current user ID: [your-user-id]
❤️ Current user role: Investment Advisor
❤️ Is currently favorited: false
❤️ Adding favorite...
❤️ Insert result: { error: null, data: [...] }
❤️ Updated favoritedPitches after insert: [123]
❤️ Favorite added successfully
```

### If You See an Error
If you see an error in the console, it will show:
- Error code (usually `42501` for permission denied)
- Error message
- Detailed error information

Common errors:
- **42501 (Permission denied)**: The SQL script hasn't been run yet
- **PGRST116 (Table not found)**: The `investor_favorites` table doesn't exist - run `CREATE_INVESTOR_FAVORITES_TABLE.sql` first

### Step 3: Test Persistence
1. Favorite a few startups
2. Log out
3. Log back in
4. Your favorites should still be there!

## Files Modified
- `components/InvestmentAdvisorView.tsx` - Added database save/load functionality
- `FIX_INVESTMENT_ADVISOR_FAVORITES.sql` - SQL script to fix RLS policies

## Technical Details
- Favorites are stored in the `investor_favorites` table
- Both investors and investment advisors use the same table
- The `investor_id` column stores the user's UUID (works for both roles)
- RLS policies check the user's role to determine permissions





