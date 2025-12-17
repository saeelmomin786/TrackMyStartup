# Diagnosing Profile Login Issues

## Your Situation:
- ✅ Profile exists in `user_profiles` table
- ❌ Can't login - "Invalid login credentials"
- ❌ Forgot password says "email not registered"
- ❌ Create account shows "email available"

## Root Causes:

### 1. **Auth User Doesn't Exist**
The profile in `user_profiles` has `auth_user_id: '96bcf1bb-4781-425f-896f-8ab1c6680fdd'`, but this user might not exist in `auth.users`.

**Check:**
- Go to Supabase Dashboard > Authentication > Users
- Search for email: `omkar.sardesai22@pccoepune.org`
- If user doesn't exist → That's the problem!

**Fix:**
- You need to create the auth user. Since the profile was created manually, you have two options:
  1. **Use Forgot Password flow** (if auth user exists but password is wrong)
  2. **Delete the profile and re-register** (recommended - ensures everything is set up correctly)

### 2. **check_email_exists Function Not Deployed**
The function might not exist in your database, causing email checking to fail.

**Check:**
- Run `FIX_MANUAL_PROFILE_ISSUE.sql` in Supabase SQL Editor
- Check Step 3 - if function doesn't exist, run `CREATE_CHECK_EMAIL_EXISTS_FUNCTION.sql`

**Fix:**
- Run `CREATE_CHECK_EMAIL_EXISTS_FUNCTION.sql` in Supabase SQL Editor

### 3. **Password Not Set**
If auth user exists but password wasn't set during registration, login will fail.

**Fix:**
- Use "Forgot Password" flow to set a new password
- OR use Supabase Dashboard > Authentication > Users > Reset Password

## Recommended Solution:

**Since the profile was created manually, the best approach is:**

1. **Delete the manual profile:**
   ```sql
   DELETE FROM public.user_profiles 
   WHERE email = 'omkar.sardesai22@pccoepune.org';
   ```

2. **Ensure `check_email_exists` function exists:**
   - Run `CREATE_CHECK_EMAIL_EXISTS_FUNCTION.sql`

3. **Re-register through the normal flow:**
   - Go to Create Account page
   - Fill registration form
   - Verify OTP
   - This will create:
     - Auth user in `auth.users` ✅
     - Profile in `user_profiles` ✅
     - Session in `user_profile_sessions` ✅
     - Set password correctly ✅

4. **Then login will work!**

## Alternative (If you want to keep the profile):

1. **Check if auth user exists:**
   - Supabase Dashboard > Authentication > Users
   - Search for the email

2. **If auth user exists:**
   - Use "Forgot Password" to set/reset password
   - Then login should work

3. **If auth user doesn't exist:**
   - You need to create it via API or delete profile and re-register
   - Can't create auth users directly via SQL

## Why This Happened:

When you manually inserted into `user_profiles`, you bypassed the registration flow which:
- Creates auth user in `auth.users`
- Sets the password
- Creates session in `user_profile_sessions`
- Links everything correctly

Manual inserts only create the profile, not the auth user or password!

