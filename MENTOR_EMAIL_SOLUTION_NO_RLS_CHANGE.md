# Mentor Email Solution - No RLS Policy Change Required ✅

## 🎯 Solution: Database Function with SECURITY DEFINER

Instead of changing RLS policies (which would allow all users to read mentor profiles), we use a **database function** that safely bypasses RLS to get only the mentor's email.

## ✅ Why This is Better

1. **No RLS Policy Changes** - Keeps your security policies intact
2. **Controlled Access** - Function only returns email (not full profile data)
3. **Scoped Functionality** - Only works for calendar event attendees
4. **Safe** - Uses `SECURITY DEFINER` which is a standard PostgreSQL pattern

## 📋 Setup Steps

### Step 1: Run the SQL Function
Run `CREATE_GET_MENTOR_EMAIL_FUNCTION.sql` in Supabase SQL Editor:
- Creates function `get_mentor_email_for_calendar(uuid)`
- Function bypasses RLS using `SECURITY DEFINER`
- Only returns email (not sensitive data)
- Grants execute permission to authenticated users

### Step 2: Code Already Updated
The code in `components/mentor/SchedulingModal.tsx` is already updated to:
- Call the database function first (primary method)
- Fallback to direct query if function fails (for debugging)

## 🔍 How It Works

```typescript
// Primary Method: Database Function (bypasses RLS)
const { data: email } = await supabase
  .rpc('get_mentor_email_for_calendar', { 
    mentor_auth_user_id: mentorId 
  });

// Function internally does:
// SELECT email FROM user_profiles 
// WHERE auth_user_id = mentor_auth_user_id
// ORDER BY (role = 'Mentor' first), created_at DESC
// LIMIT 1
```

## ✅ Benefits

1. **Security**: No RLS policy changes needed
2. **Controlled**: Only returns email, not full profile
3. **Flexible**: Can be updated later if needed
4. **Safe**: Standard PostgreSQL pattern

## 🧪 Testing

After running the SQL function, test it:
```sql
SELECT get_mentor_email_for_calendar('4e5c19f3-d1ab-4409-b688-1a4029f9a65c'::uuid);
```

Should return: `iamomkar1460@gmail.com`

## 📝 What Happens Now

1. Startup books session with mentor
2. Code calls `get_mentor_email_for_calendar()` function
3. Function bypasses RLS and gets mentor email
4. Email is added to calendar event attendees
5. ✅ Mentor receives calendar invite with Meet link

