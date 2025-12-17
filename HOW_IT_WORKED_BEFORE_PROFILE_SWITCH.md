# How It Worked Before Profile Switch

## Your Questions

1. **"Is auth_user_id different from auth.uid()?"**
2. **"How was it working in the older version before profile switch?"**

## Answers

1. **NO, `auth_user_id` should equal `auth.uid()`** - they're the same value, just stored in different places
2. **Before profile switch, `currentUser.id` = `auth.uid()`** - that's why it worked!

---

## Understanding the IDs

### auth.uid() vs auth_user_id

**`auth.uid()`:**
- Function that returns authenticated user's ID
- Value: `"abc-123"` (from `auth.users` table)
- Same for all profiles of one user

**`auth_user_id`:**
- Column in `user_profiles` table
- Stores the link to `auth.users.id`
- Value: `"abc-123"` (should equal `auth.uid()`)
- Same for all profiles of one user

**They are the SAME value, just:**
- `auth.uid()` = Function (dynamic, from token)
- `auth_user_id` = Column (stored in database)

---

## How It Worked Before Profile Switch

### Old System (Before Profile Switch):

**Only `users` table existed:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,  -- This was the same as auth.users.id!
    email TEXT,
    role TEXT,
    ...
);
```

**How it worked:**
```
User: john@example.com
├── auth.users.id = "abc-123" (auth.uid() = "abc-123")
└── users table:
    └── id = "abc-123" (SAME as auth.uid()!)
```

**Frontend:**
```typescript
const currentUser = await getCurrentUser();
// currentUser.id = "abc-123" (from users table)
// This equals auth.uid() = "abc-123" ✅
```

**RLS Policy:**
```sql
CREATE POLICY "Users can update their own profile"
USING (id = auth.uid());  -- Checks "abc-123" = "abc-123"
```

**Query:**
```typescript
await supabase
  .from('users')
  .update(updates)
  .eq('id', currentUser.id);  // Uses "abc-123"
```

**What RLS sees:**
- Query: `id = "abc-123"` (from frontend)
- RLS check: `id = auth.uid()` = `"abc-123"`
- **Result: "abc-123" = "abc-123" → RLS ALLOWS! ✅**

**Why it worked:**
- ✅ `currentUser.id` = `users.id` = `auth.uid()` (all same!)
- ✅ No mismatch
- ✅ RLS allows access

---

## How It Broke After Profile Switch

### New System (After Profile Switch):

**Added `user_profiles` table:**
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,        -- Unique per profile (DIFFERENT!)
    auth_user_id UUID,          -- Links to auth.uid() (SAME!)
    role TEXT,
    ...
);
```

**How it works now:**
```
User: john@example.com
├── auth.users.id = "abc-123" (auth.uid() = "abc-123")
├── user_profiles (Startup):
│   ├── id = "profile-001" (DIFFERENT from auth.uid()!)
│   └── auth_user_id = "abc-123" (SAME as auth.uid()!)
└── user_profiles (Mentor):
    ├── id = "profile-002" (DIFFERENT from auth.uid()!)
    └── auth_user_id = "abc-123" (SAME as auth.uid()!)
```

**Frontend (Before Fix):**
```typescript
const currentUser = await getCurrentUser();
// currentUser.id = "profile-001" (from user_profiles table)
// This does NOT equal auth.uid() = "abc-123" ❌
```

**RLS Policy (Still the same):**
```sql
CREATE POLICY "Users can update their own profile"
USING (id = auth.uid());  -- Checks "abc-123" = "abc-123"
```

**Query (Before Fix):**
```typescript
await supabase
  .from('users')
  .update(updates)
  .eq('id', currentUser.id);  // Uses "profile-001"
```

**What RLS sees:**
- Query: `id = "profile-001"` (from frontend)
- RLS check: `id = auth.uid()` = `"abc-123"`
- **Result: "profile-001" ≠ "abc-123" → RLS BLOCKS! ❌**

**Why it broke:**
- ❌ `currentUser.id` = `"profile-001"` (profile ID)
- ❌ `auth.uid()` = `"abc-123"` (auth user ID)
- ❌ Mismatch!
- ❌ RLS blocks access

---

## The Key Difference

### Before Profile Switch:

```
currentUser.id = users.id = auth.uid()
     "abc-123"  =  "abc-123"  =  "abc-123"
     ✅ ALL SAME!
```

**Result:** ✅ Works perfectly!

---

### After Profile Switch (Before Fix):

```
currentUser.id ≠ auth.uid()
   "profile-001" ≠ "abc-123"
   ❌ DIFFERENT!
```

**Result:** ❌ RLS blocks!

---

### After Profile Switch (After Fix):

```
authUserId = auth.uid()
   "abc-123" = "abc-123"
   ✅ SAME!
```

**Result:** ✅ Works perfectly!

---

## Visual Comparison

### Before Profile Switch:

```
┌─────────────────────────────────────┐
│  auth.users                          │
│  id = "abc-123"                      │
└─────────────────────────────────────┘
           │
           │ (same value)
           ▼
┌─────────────────────────────────────┐
│  users table                         │
│  id = "abc-123" ← currentUser.id     │
└─────────────────────────────────────┘
           │
           │ (same value)
           ▼
┌─────────────────────────────────────┐
│  RLS Policy Check                    │
│  id = auth.uid()                     │
│  "abc-123" = "abc-123" ✅            │
└─────────────────────────────────────┘
```

**All values are the same! ✅**

---

### After Profile Switch (Before Fix):

```
┌─────────────────────────────────────┐
│  auth.users                          │
│  id = "abc-123"                      │
└─────────────────────────────────────┘
           │
           │ (same value)
           ▼
┌─────────────────────────────────────┐
│  user_profiles                       │
│  id = "profile-001" ← currentUser.id │
│  auth_user_id = "abc-123"            │
└─────────────────────────────────────┘
           │
           │ (different values!)
           ▼
┌─────────────────────────────────────┐
│  RLS Policy Check                    │
│  id = auth.uid()                     │
│  "profile-001" = "abc-123" ❌        │
└─────────────────────────────────────┘
```

**Values don't match! ❌**

---

### After Profile Switch (After Fix):

```
┌─────────────────────────────────────┐
│  auth.users                          │
│  id = "abc-123"                      │
└─────────────────────────────────────┘
           │
           │ (get auth.uid())
           ▼
┌─────────────────────────────────────┐
│  Frontend Code                       │
│  authUserId = "abc-123"              │
└─────────────────────────────────────┘
           │
           │ (same value)
           ▼
┌─────────────────────────────────────┐
│  RLS Policy Check                    │
│  id = auth.uid()                     │
│  "abc-123" = "abc-123" ✅            │
└─────────────────────────────────────┘
```

**Values match! ✅**

---

## Summary

### Before Profile Switch:

**System:**
- Only `users` table
- `users.id` = `auth.users.id` = `auth.uid()`
- `currentUser.id` = `auth.uid()`

**Why it worked:**
- ✅ All IDs were the same
- ✅ No mismatch
- ✅ RLS allowed access

---

### After Profile Switch (Before Fix):

**System:**
- Added `user_profiles` table
- `user_profiles.id` ≠ `auth.uid()` (different!)
- `currentUser.id` = profile ID ≠ `auth.uid()`

**Why it broke:**
- ❌ Profile ID ≠ auth.uid()
- ❌ Mismatch
- ❌ RLS blocked access

---

### After Profile Switch (After Fix):

**System:**
- `user_profiles` table exists
- Frontend uses `auth.uid()` instead of profile ID
- `authUserId` = `auth.uid()`

**Why it works:**
- ✅ Using auth.uid() directly
- ✅ Matches what RLS checks
- ✅ RLS allows access

---

## Answer to Your Questions

### 1. Is auth_user_id different from auth.uid()?

**NO, they should be the SAME value:**
- `auth.uid()` = Function that returns `"abc-123"`
- `auth_user_id` = Column that stores `"abc-123"`
- Both represent the same authenticated user ID

**But:**
- `user_profiles.id` (profile ID) = `"profile-001"` (DIFFERENT!)
- `auth_user_id` = `"abc-123"` (SAME as auth.uid())

---

### 2. How was it working before profile switch?

**It worked because:**
- `currentUser.id` = `users.id` = `auth.uid()` (all same!)
- No mismatch
- RLS allowed access

**After profile switch:**
- `currentUser.id` = `user_profiles.id` ≠ `auth.uid()` (different!)
- Mismatch
- RLS blocked access

**The fix:**
- Use `auth.uid()` directly instead of `currentUser.id`
- Matches what RLS checks
- RLS allows access

---

## Bottom Line

**Before Profile Switch:**
- ✅ `currentUser.id` = `auth.uid()` → Worked!

**After Profile Switch:**
- ❌ `currentUser.id` ≠ `auth.uid()` → Broke!
- ✅ Use `auth.uid()` directly → Works!

**The key:** Before, profile ID equaled auth.uid(). After, they're different, so we must use auth.uid() directly!


