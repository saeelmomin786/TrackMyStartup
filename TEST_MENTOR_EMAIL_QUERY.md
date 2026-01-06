# Test Mentor Email Query

## 🔍 How to Test Mentor Email Lookup

### Test Query 1: Get Email by auth_user_id
```sql
-- Test query to get mentor email from user_profiles
-- Replace '4e5c19f3-d1ab-4409-b688-1a4029f9a65c' with actual mentor auth_user_id

SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  created_at
FROM user_profiles
WHERE auth_user_id = '4e5c19f3-d1ab-4409-b688-1a4029f9a65c'
ORDER BY created_at DESC
LIMIT 1;
```

### Test Query 2: Check if Multiple Profiles Exist
```sql
-- Check if there are multiple profiles for this auth_user_id
SELECT 
  COUNT(*) as profile_count,
  array_agg(email) as emails,
  array_agg(id) as profile_ids
FROM user_profiles
WHERE auth_user_id = '4e5c19f3-d1ab-4409-b688-1a4029f9a65c';
```

### Test Query 3: Check RLS Policies
```sql
-- Check if RLS is blocking the query
-- Run this as the authenticated user (startup user)
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role
FROM user_profiles
WHERE auth_user_id = '4e5c19f3-d1ab-4409-b688-1a4029f9a65c'
ORDER BY created_at DESC
LIMIT 1;
```

## 📋 What the Code Does Now

1. **Primary Method**: Query `user_profiles` by `auth_user_id = mentorId`
   - Gets most recent profile if multiple exist (ORDER BY created_at DESC)
   - Returns email if found

2. **Fallback Method 1**: Query `user_profiles` by `id = mentorId` (if mentorId is actually a profile_id)

3. **Fallback Method 2**: Get mentor_id from assignment, then query `user_profiles`

## ✅ Expected Result

When booking a session, you should see:
```
🔍 Fetching mentor email from user_profiles for mentorId (auth_user_id): 4e5c19f3-d1ab-4409-b688-1a4029f9a65c
🔍 user_profiles query result: { email: 'iamomkar1460@gmail.com', auth_user_id: '...', ... }
✅ Found mentor email from user_profiles: iamomkar1460@gmail.com
```

## 🔧 If Email Still Not Found

1. **Check RLS Policies**: The startup user might not have permission to read mentor's profile
2. **Check if Profile Exists**: Run Test Query 1 to verify the profile exists
3. **Check Multiple Profiles**: Run Test Query 2 to see if there are multiple profiles

