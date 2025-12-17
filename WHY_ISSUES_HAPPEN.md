# Why These Issues Are Happening - Root Cause Analysis

## 🎯 **Overview**
Your system has migrated from a **single-profile system** (`users` table) to a **multi-profile system** (`user_profiles` table). This architectural change is causing these issues because some code still assumes the old structure.

---

## 📋 **Issue 1: 400/409 Errors When Querying Tables**

### **Why It Happens:**
1. **New users are created in `user_profiles`, not `users` table**
   - When you register a new account, it goes to `user_profiles` table
   - Old code was still querying `users` table directly
   - Query fails with 400/409 because the user doesn't exist in `users` table

2. **Missing Fallback Logic**
   - Code should check `user_profiles` first, then fall back to `users` (for old users)
   - Some functions weren't updated to do this check

### **Example:**
```typescript
// ❌ OLD CODE (causes 400 error for new users)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)  // User doesn't exist here!

// ✅ NEW CODE (checks both tables)
// First check user_profiles
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('auth_user_id', user.id)
  .maybeSingle();

if (!profile) {
  // Fallback to users table (old users)
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
}
```

---

## 📋 **Issue 2: Startup Not Showing After Creation**

### **Why It Happens:**
1. **Too Restrictive Query**
   - The query was requiring BOTH `user_id` AND `startup_name` to match exactly
   - If startup name in database doesn't exactly match profile startup_name, it won't be found
   - Example: Profile has "TMS", but database has "TMS " (with space) → not found

2. **Timing Issues**
   - Startup creation might succeed, but query happens before transaction commits
   - RLS (Row Level Security) policies might delay visibility

3. **ID Confusion**
   - Code might be using profile ID instead of auth_user_id
   - `startups.user_id` needs `auth_user_id`, not profile ID

### **Example:**
```typescript
// ❌ OLD CODE (too restrictive)
const { data } = await supabase
  .from('startups')
  .select('*')
  .eq('user_id', authUserId)
  .eq('name', startupName)  // Requires exact match - too strict!
  .maybeSingle();

// ✅ NEW CODE (more flexible)
// First get all startups for this user
const { data: startups } = await supabase
  .from('startups')
  .select('*')
  .eq('user_id', authUserId);

if (startups && startups.length > 0) {
  // If multiple, prefer one matching startup_name
  const matched = startupName 
    ? startups.find(s => s.name === startupName) || startups[0]
    : startups[0];
}
```

---

## 📋 **Issue 3: Profile ID vs Auth User ID Confusion**

### **Why It Happens:**
This is the **core architectural issue**. Your system now has **two different ID systems**:

#### **1. Auth User ID (`auth_user_id`)**
- **Source:** `auth.users` table (Supabase Auth)
- **One per email address**
- **Used in:** `startups.user_id`, `user_profiles.auth_user_id`

#### **2. Profile ID**
- **Source:** `user_profiles.id` (UUID)
- **Multiple per email address** (one profile per role)
- **Used in:** Profile-specific queries, `user_profile_sessions.current_profile_id`

### **The Problem:**
Mixing these IDs causes queries to fail:

```typescript
// ❌ WRONG: Using profile ID where auth_user_id is needed
await supabase
  .from('startups')
  .select('*')
  .eq('user_id', profileId)  // Wrong! startups.user_id needs auth_user_id

// ✅ CORRECT: Using auth_user_id
const { data: { user } } = await supabase.auth.getUser();
const authUserId = user.id;  // This is auth_user_id

await supabase
  .from('startups')
  .select('*')
  .eq('user_id', authUserId)  // Correct!
```

---

## 🔍 **Why This Migration Was Needed**

### **Old System (Single Profile):**
```
auth.users (1 user)
    ↓
users table (1 row per user)
    ↓
startups table (linked by user.id)
```

### **New System (Multi-Profile):**
```
auth.users (1 user)
    ↓
user_profiles table (multiple rows - one per role)
    ↓
user_profile_sessions (tracks active profile)
    ↓
startups table (linked by auth_user_id, not profile ID)
```

### **Why Multi-Profile?**
- One person can be both an **Investor** and a **Startup**
- Each role needs its own profile data
- But they share the same email/auth account

---

## 🛠️ **How We're Fixing It**

### **1. Updated All Queries to Check Both Tables**
```typescript
// Always check user_profiles first, then fallback to users
async getCurrentUser() {
  // 1. Check user_profiles (new system)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  
  if (profile) return profile;
  
  // 2. Fallback to users (old system)
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();
  
  return data;
}
```

### **2. Made Startup Queries More Flexible**
- Query by `user_id` first (gets all startups for user)
- If multiple found, prefer one matching `startup_name`
- Fallback to querying by name if not found by user_id

### **3. Ensured Correct ID Usage**
- Always get `auth_user_id` from `supabase.auth.getUser()`
- Use `auth_user_id` for `startups.user_id`
- Use `profile_id` only for `user_profiles` queries

---

## 📊 **Which Tables Use Which ID?**

| Table | Column | Uses | Notes |
|-------|--------|------|-------|
| `auth.users` | `id` | `auth_user_id` | Supabase Auth table |
| `user_profiles` | `id` | `profile_id` | One per role |
| `user_profiles` | `auth_user_id` | `auth_user_id` | Links to auth.users |
| `startups` | `user_id` | `auth_user_id` | ⚠️ NOT profile_id! |
| `investment_advisor_profiles` | `user_id` | `profile_id` | Links to user_profiles |
| `investor_profiles` | `user_id` | `profile_id` | Links to user_profiles |

---

## ✅ **Summary**

**Root Causes:**
1. ✅ **Code migration incomplete** - Some functions still use old `users` table
2. ✅ **ID confusion** - Mixing `profile_id` and `auth_user_id`
3. ✅ **Too restrictive queries** - Requiring exact matches when flexible matching needed
4. ✅ **Missing fallback logic** - Not checking both old and new tables

**Solutions:**
1. ✅ Check `user_profiles` first, fallback to `users`
2. ✅ Use correct ID type for each table
3. ✅ Make queries more flexible (match by user_id first, then filter)
4. ✅ Add proper error handling for conflicts

**Status:**
- ✅ Most issues fixed
- ✅ Form 2 registration working
- ✅ Profile queries updated
- ⚠️ Some edge cases might still exist (like the startup not showing issue)

