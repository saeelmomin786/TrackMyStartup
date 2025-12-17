# Fix Investment Advisor Discover Pitches - Due Diligences & Recommendations

## Problem
In the Investment Advisor Dashboard, the "Discover Pitches" section is not showing:
1. Due diligences (requests made by the advisor)
2. Recommendations (recommendations created by the advisor)

## Root Cause
The frontend code uses `currentUser.id` which might be a profile ID, but the RLS policies use `auth.uid()`. While RLS should automatically use `auth.uid()` from the JWT token, there might be a mismatch.

## Solution

### Option 1: Use `auth.uid()` directly in queries (Recommended)
Update the frontend to use `auth.uid()` directly instead of `currentUser.id`:

```typescript
// Get auth.uid() from Supabase
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id;

// Use authUserId instead of currentUser.id
const { data, error } = await supabase
  .from('due_diligence_requests')
  .select('startup_id, status')
  .eq('user_id', authUserId)  // Use auth.uid() instead of currentUser.id
  .in('status', ['pending', 'approved', 'completed']);
```

### Option 2: Ensure currentUser.id is auth.uid()
Make sure `currentUser.id` is set to `auth.uid()` when the user logs in.

## Files to Update

1. **components/InvestmentAdvisorView.tsx**
   - Line 1372: `.eq('user_id', currentUser.id)` → Use `auth.uid()`
   - Line 3137: `.eq('investment_advisor_id', currentUser.id)` → Use `auth.uid()`
   - Line 3332: `investment_advisor_id: currentUser?.id` → Use `auth.uid()`

## Testing

Run `DIAGNOSE_INVESTMENT_ADVISOR_DISCOVER_DATA.sql` to check:
1. If there's data in the tables
2. If RLS policies are correct
3. What data an Investment Advisor can see




