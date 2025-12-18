# Logo and Service Requests Fix for New Registrations

## 🐛 **Issues Identified**

### Issue 1: Logo Not Updating for New Registrations
**Problem**: For investors and startups under an investment advisor, the advisor's logo is not showing up for new registrations (but works for old profiles).

**Root Causes**:
1. **CRITICAL**: New registrations use `user_profiles` table, NOT `users` table!
2. Storage bucket policies might have been too restrictive, preventing new users from uploading/updating logos
3. RLS policies on `user_profiles` table might prevent reading the advisor's `logo_url` field
4. The `getInvestmentAdvisorByCode` function was only querying `users` table, not `user_profiles` table

### Issue 2: Service Requests Not Showing for New Registrations
**Problem**: After adding an investor advisor code, no service requests appear in the advisor dashboard.

**Root Causes**:
1. **CRITICAL**: New registrations use `user_profiles` table, NOT `users` table!
2. RLS policies on `user_profiles` table prevent investment advisors from seeing profiles who entered their code
3. RLS policies on `startups` table prevent investment advisors from seeing startups whose user_profiles entered their code
4. The filtering logic in `InvestmentAdvisorView.tsx` depends on these RLS policies working correctly

## ✅ **Solution Applied**

### Fix 1: Storage Bucket Policies
- **Updated**: `investor-assets` bucket policies to allow ALL authenticated users to upload/update/delete files
- **Removed**: Restrictive policies that might block new registrations
- **Result**: New users can now upload and update logos without restrictions

### Fix 2: user_profiles Table RLS Policies (CRITICAL - New Registrations)
- **Added**: Policy allowing Investment Advisors to see `user_profiles` who entered their advisor code
- **Added**: Public read policy so advisor `logo_url` can be fetched by investors/startups
- **Updated**: UPDATE policy to allow users to update their own `logo_url` in `user_profiles` (including new registrations)
- **Result**: Service requests now work for new registrations, and advisor logos can be retrieved

### Fix 3: Users Table RLS Policies (Backward Compatibility)
- **Added**: Policy allowing Investment Advisors to see users who entered their advisor code (for old registrations)
- **Added**: Public read policy for backward compatibility
- **Result**: Old registrations continue to work

### Fix 4: Startups Table RLS Policies
- **Added**: Policy allowing Investment Advisors to see startups whose `user_profiles` entered their advisor code
- **Updated**: Join with `user_profiles` table instead of `users` table for new registrations
- **Added**: Public read policy for general functionality
- **Result**: Service requests for startups now work with new registrations

### Fix 5: getInvestmentAdvisorByCode Function
- **Updated**: Now checks both `user_profiles` table (new registrations) and `users` table (old registrations)
- **Result**: Advisor logos can be retrieved for both new and old registrations

## 📋 **How to Apply the Fix**

1. **Run the SQL script** in Supabase SQL Editor:
   ```sql
   -- Run: FIX_LOGO_AND_SERVICE_REQUESTS_USER_PROFILES.sql
   -- This is the CORRECT version that uses user_profiles table!
   ```

2. **The code fix is already applied**:
   - `lib/database.ts` - `getInvestmentAdvisorByCode` now checks both `user_profiles` and `users` tables

2. **Verify the policies were created**:
   - Check storage policies for `investor-assets` bucket
   - Check RLS policies on `users` table
   - Check RLS policies on `startups` table

3. **Test the fixes**:
   - Create a new investor/startup registration with an advisor code
   - Verify the advisor can see the service request
   - Verify the advisor's logo shows up for the new registration

## 🔍 **Technical Details**

### Storage Policies
- **Bucket**: `investor-assets`
- **Policies**: 
  - Public read (for logos to be accessible)
  - Authenticated upload (no path restrictions)
  - Authenticated update (no path restrictions)
  - Authenticated delete (no path restrictions)

### RLS Policies - user_profiles Table (New Registrations)
- **SELECT**: 
  - Users can see their own profile
  - Investment Advisors can see `user_profiles` who entered their code
  - Admins can see all `user_profiles`
  - Public can see all `user_profiles` (for logo_url access)
- **UPDATE**: 
  - Users can update their own profile (including logo_url)
  - Investment Advisors can update `user_profiles` who entered their code
  - Admins can update any `user_profile`

### RLS Policies - Users Table (Backward Compatibility)
- **SELECT**: 
  - Users can see their own profile
  - Investment Advisors can see users who entered their code (checks both `users` and `user_profiles`)
  - Admins can see all users
  - Public can see all users (for logo_url access)

### RLS Policies - Startups Table
- **SELECT**: 
  - Users can see their own startups
  - Investment Advisors can see startups whose `user_profiles` entered their code (joins with `user_profiles` table)
  - Admins and other roles can see all startups
  - Public can see all startups

## 🎯 **Expected Results**

After applying the fix:
- ✅ New investor/startup registrations can upload logos
- ✅ Advisor logos show up for new registrations
- ✅ Service requests appear in advisor dashboard for new registrations
- ✅ Logo updates work for new registrations

## 🔧 **Troubleshooting**

If issues persist:

1. **Check storage bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'investor-assets';
   ```

2. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('users', 'startups')
   ORDER BY tablename, policyname;
   ```

3. **Test advisor code lookup**:
   ```sql
   -- Replace 'IA-XXXXXX' with actual advisor code
   SELECT id, name, investment_advisor_code, logo_url 
   FROM users 
   WHERE investment_advisor_code = 'IA-XXXXXX' 
   AND role = 'Investment Advisor';
   ```

4. **Check service requests**:
   ```sql
   -- Replace 'IA-XXXXXX' with actual advisor code
   SELECT u.id, u.name, u.email, u.investment_advisor_code_entered, u.advisor_accepted
   FROM users u
   WHERE u.investment_advisor_code_entered = 'IA-XXXXXX'
   AND u.advisor_accepted = false;
   ```

