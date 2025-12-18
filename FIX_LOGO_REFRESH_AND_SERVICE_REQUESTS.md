# Fix Logo Refresh and Service Requests Issues

## 🐛 **Issues Fixed**

### Issue 1: Logo Not Updating for Investors/Startups
**Problem**: When an investment advisor changes their logo, it doesn't update for their investors and startups.

**Root Causes**: 
1. **RLS Policy Issue**: Authenticated users (investors/startups) couldn't read Investment Advisor profiles from `user_profiles` table to get `logo_url`
2. The `AdvisorAwareLogo` component only fetches advisor info once when it mounts
3. No refresh mechanism to pick up logo updates
4. Browser caching prevents new logo from loading

**Solutions Applied**:
1. **Fixed RLS Policy**: Added policy to allow authenticated users to read Investment Advisor profiles (for `logo_url` access)
2. Added periodic refresh (every 30 seconds) to re-fetch advisor info
3. Added cache-busting timestamp to logo URL (`?t=${Date.now()}`)
4. Component now automatically picks up logo updates

### Issue 2: Service Requests Not Showing
**Problem**: Service requests don't appear in the investment advisor dashboard for new registrations.

**Root Causes**:
1. `getAllUsers()` only queries `users` table, not `user_profiles` table
2. New registrations use `user_profiles` table, so they're missing from the `users` array
3. Filtering logic checks `user.id === startup.user_id`, but:
   - For new registrations: `user.id` is profile ID, `startup.user_id` is `auth_user_id`
   - They don't match!

**Solutions Applied**:
1. **Updated `getAllUsers()`** to fetch from both `users` and `user_profiles` tables
2. **Merged data** - maps `user_profiles` to match `users` structure
3. **Fixed filtering logic** - now checks both `user.id` and `user.auth_user_id` for matching
4. **Added debug logging** to help troubleshoot

## ✅ **Files Changed**

### 1. `components/AdvisorAwareLogo.tsx`
- Added periodic refresh (30 seconds)
- Added cache-busting to logo URL
- Logo now updates automatically when advisor changes it

### 2. `components/InvestmentAdvisorView.tsx`
- Fixed startup filtering to check both `user.id` and `user.auth_user_id`
- Added debug logging for service requests
- Now works with both old and new registrations

### 3. `lib/database.ts`
- Updated `getAllUsers()` to fetch from both `users` and `user_profiles` tables
- Merges data with `user_profiles` taking precedence for new registrations
- Maps `user_profiles` fields to match `users` structure for compatibility

## 🧪 **Testing**

### Test Logo Refresh:
1. Login as an investment advisor
2. Change your logo
3. Login as an investor/startup under that advisor
4. Logo should update within 30 seconds (or refresh page)

### Test Service Requests:
1. Create a new investor/startup registration with an advisor code
2. Login as that investment advisor
3. Check Service Requests tab
4. Should see the new registration

## 📋 **Next Steps**

1. **Run the SQL fix** (CRITICAL - fixes RLS policy for logo access):
   - `FIX_LOGO_AND_SERVICE_REQUESTS_USER_PROFILES.sql`
   - This adds the RLS policy to allow authenticated users to read Investment Advisor profiles

2. **Test the fixes**:
   - Logo refresh should work automatically (after RLS fix)
   - Service requests should now appear

3. **Check browser console**:
   - Look for debug logs showing service request filtering
   - Should see counts of users from both tables
   - Check for any RLS errors when fetching advisor logo

## 🔐 **RLS Policy Fix Details**

The critical fix is in the `user_profiles` table RLS policy. The authenticated policy now includes:
```sql
-- Allow authenticated users to read Investment Advisor profiles (for logo_url)
role = 'Investment Advisor'
```

This allows investors/startups (authenticated users) to read Investment Advisor profiles to get the `logo_url` field via `getInvestmentAdvisorByCode()`.

## 🔍 **Debug Information**

The code now includes console logs to help debug:
- `🔍 Service Requests: Startup check:` - Shows why startups are/aren't included
- `🔍 Service Requests: Investor check:` - Shows why investors are/aren't included
- `Users fetched successfully:` - Shows counts from both tables

## ⚠️ **Important Notes**

- Logo refresh happens every 30 seconds automatically
- Service requests now work with both `users` and `user_profiles` tables
- Old registrations continue to work (backward compatible)
- New registrations now work correctly

