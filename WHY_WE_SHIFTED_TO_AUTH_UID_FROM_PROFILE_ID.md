# Why We Shifted to auth.uid() from Profile ID

## The Evolution Story

### Phase 1: Before Profile Switching (Old System)

**System:**
- Only `users` table existed
- One user = One profile
- `users.id` = `auth.uid()` (same value)
- Profile ID = Auth User ID

**How it worked:**
```typescript
// ✅ Worked fine - Profile ID = Auth User ID
const userId = currentUser.id;  // "abc-123"
await supabase
  .from('users')
  .update(updates)
  .eq('id', userId);  // "abc-123" = auth.uid() ✅
```

**RLS Policy:**
```sql
CREATE POLICY "Users can update their own profile"
USING (id = auth.uid());  -- Checks "abc-123" = "abc-123" ✅
```

**Result:** ✅ Everything worked!

---

### Phase 2: After Adding Profile Switching (Multi-Profile System)

**System:**
- Added `user_profiles` table
- One user can have multiple profiles
- `user_profiles.id` ≠ `auth.uid()` (different values!)
- Profile ID ≠ Auth User ID

**The Problem:**
```typescript
// ❌ BROKE - Profile ID ≠ Auth User ID
const userId = currentUser.id;  // "profile-001" (from user_profiles)
await supabase
  .from('users')
  .update(updates)
  .eq('id', userId);  // "profile-001" ≠ auth.uid() ("abc-123") ❌
```

**RLS Policy (still checking auth.uid()):**
```sql
CREATE POLICY "Users can update their own profile"
USING (id = auth.uid());  -- Checks "abc-123" = "abc-123"
```

**What RLS sees:**
- Query: `id = "profile-001"` (from frontend)
- RLS check: `id = "abc-123"` (from auth.uid())
- **Result: "profile-001" ≠ "abc-123" → RLS BLOCKS! ❌**

**Result:** ❌ Nothing worked! Data not loading, updates failing!

---

### Phase 3: The Real Problem

**The Issue:**
When `user_profiles` table was added:
- Each profile got a **different ID** (`user_profiles.id`)
- But RLS policies still checked `auth.uid()` (same for all profiles)
- Frontend code used `currentUser.id` (profile ID)
- **Mismatch:** Profile ID ≠ Auth User ID

**Example:**
```
User: john@example.com
├── auth.users.id = "abc-123" (auth.uid() = "abc-123")
├── user_profiles (Startup profile)
│   ├── id = "profile-001" ← currentUser.id (DIFFERENT!)
│   └── auth_user_id = "abc-123" ← auth.uid() (SAME!)
└── user_profiles (Mentor profile)
    ├── id = "profile-002" ← currentUser.id (DIFFERENT!)
    └── auth_user_id = "abc-123" ← auth.uid() (SAME!)
```

**The Problem:**
- Frontend uses: `currentUser.id` = `"profile-001"` (profile ID)
- RLS checks: `auth.uid()` = `"abc-123"` (auth user ID)
- **Mismatch!** → RLS blocks all queries

---

### Phase 4: Why user_profiles Couldn't Fetch Another Profile's Data

**The Specific Problem:**

When you switch profiles:
1. `currentUser.id` changes (new profile ID)
2. But `auth.uid()` stays the same (same auth user)
3. If tables reference `user_profiles.id` (profile ID):
   - Data was created with one profile ID
   - But you're querying with different profile ID
   - RLS blocks because profile IDs don't match

**Example:**
```typescript
// User creates mandate as Startup profile
const startupProfileId = "profile-001";
await supabase
  .from('advisor_mandates')
  .insert({ advisor_id: startupProfileId });  // Uses profile ID

// User switches to Mentor profile
const mentorProfileId = "profile-002";  // Different profile ID!

// Try to fetch mandates
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', mentorProfileId);  // "profile-002" ≠ "profile-001" ❌
```

**Result:** ❌ Cannot fetch data created by another profile!

---

### Phase 5: The Solution - Use auth.uid()

**The Fix:**

Instead of using profile IDs, use `auth.uid()` (which is the same for all profiles):

```typescript
// ✅ CORRECT - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id;  // "abc-123" (same for all profiles)

await supabase
  .from('advisor_mandates')
  .insert({ advisor_id: authUserId });  // Uses auth.uid()

// User switches to Mentor profile
// auth.uid() still = "abc-123" (same!)

// Fetch mandates
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', authUserId);  // "abc-123" = "abc-123" ✅
```

**Result:** ✅ Works! Can fetch data from all profiles!

---

## Why auth.uid() Solves the Problem

### 1. **Same for All Profiles**

```
User: john@example.com
├── auth.uid() = "abc-123" (Startup profile)
├── auth.uid() = "abc-123" (Mentor profile)  ← SAME!
└── auth.uid() = "abc-123" (Investor profile)  ← SAME!
```

**Benefit:** All profiles share the same `auth.uid()`, so data is accessible across profiles.

---

### 2. **Matches RLS Policies**

**RLS Policy:**
```sql
CREATE POLICY "Users can view their own data"
USING (user_id = auth.uid());  -- Checks auth.uid()
```

**Frontend Code:**
```typescript
.eq('user_id', authUserId)  // Uses auth.uid()
```

**Result:** ✅ Matches! RLS allows access.

---

### 3. **Works Across Profile Switches**

**Scenario:**
1. User creates mandate as Startup profile → Uses `auth.uid()` = `"abc-123"`
2. User switches to Mentor profile → `auth.uid()` still = `"abc-123"`
3. User can still see the mandate → `auth.uid()` matches!

**Result:** ✅ Data accessible from all profiles!

---

## The Complete Picture

### Before Profile Switching:
```
users table:
├── id = "abc-123" (same as auth.uid())
└── One row per user

Frontend:
currentUser.id = "abc-123"  ✅ Matches auth.uid()

RLS:
id = auth.uid()  ✅ Matches

Result: ✅ Everything works!
```

---

### After Profile Switching (Before Fix):
```
user_profiles table:
├── id = "profile-001" (Startup) ← Different!
├── id = "profile-002" (Mentor) ← Different!
└── auth_user_id = "abc-123" (both) ← Same!

Frontend:
currentUser.id = "profile-001"  ❌ Doesn't match auth.uid()

RLS:
id = auth.uid()  ✅ Checks "abc-123"

Result: ❌ Mismatch! RLS blocks!
```

---

### After Profile Switching (After Fix):
```
user_profiles table:
├── id = "profile-001" (Startup)
├── id = "profile-002" (Mentor)
└── auth_user_id = "abc-123" (both) ← Same!

Frontend:
authUserId = "abc-123"  ✅ Matches auth.uid()

RLS:
id = auth.uid()  ✅ Checks "abc-123"

Result: ✅ Matches! RLS allows!
```

---

## Summary

### Why We Shifted to auth.uid():

1. **Profile IDs are Different**
   - Each profile has different ID
   - Cannot share data between profiles

2. **auth.uid() is Same for All Profiles**
   - All profiles share same `auth.uid()`
   - Can share data across profiles

3. **RLS Policies Check auth.uid()**
   - Policies always check `auth.uid()`
   - Must use `auth.uid()` to match

4. **Cannot Fetch Another Profile's Data**
   - If using profile IDs, data is tied to specific profile
   - Cannot access from other profiles
   - Using `auth.uid()` allows access from all profiles

---

## Bottom Line

**Before Profile Switching:**
- Used profile ID (which = auth.uid())
- ✅ Worked fine

**After Profile Switching:**
- Profile IDs ≠ auth.uid()
- ❌ Didn't work
- **Solution:** Use `auth.uid()` instead of profile IDs
- ✅ Works for all profiles!

**The key insight:** `auth.uid()` is the same for all profiles, so using it allows data to be shared across profiles, which is exactly what we need for the multi-profile system!



