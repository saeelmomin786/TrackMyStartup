# Why We Needed to Change from Profile ID to auth.uid()

## The Core Problem

**RLS (Row Level Security) policies in Supabase ONLY check `auth.uid()`, NOT profile IDs.**

When your code uses `currentUser.id` (profile ID) but RLS checks `auth.uid()`, there's a **mismatch** → RLS blocks the query → **No data loads!**

---

## Real-World Example

### Scenario: User tries to update their profile

**User has:**
- Auth User ID: `"abc-123"` (from `auth.users` table)
- Profile ID: `"profile-001"` (from `user_profiles` table)

### What Happens:

#### ❌ **BEFORE (Using Profile ID):**

```typescript
// Frontend code
await supabase
  .from('users')
  .update({ name: "John" })
  .eq('id', currentUser.id)  // Uses "profile-001"
```

**RLS Policy checks:**
```sql
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (id = auth.uid());  -- Checks if id = "abc-123"
```

**What RLS sees:**
- Query: `id = "profile-001"` (from frontend)
- RLS check: `id = "abc-123"` (from auth.uid())
- **Result: "profile-001" ≠ "abc-123" → RLS BLOCKS! ❌**

**Error:** `406 Not Acceptable` or `No rows returned`

---

#### ✅ **AFTER (Using auth.uid()):**

```typescript
// Frontend code
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id;  // Gets "abc-123"
await supabase
  .from('users')
  .update({ name: "John" })
  .eq('id', authUserId)  // Uses "abc-123"
```

**RLS Policy checks:**
```sql
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (id = auth.uid());  -- Checks if id = "abc-123"
```

**What RLS sees:**
- Query: `id = "abc-123"` (from frontend)
- RLS check: `id = "abc-123"` (from auth.uid())
- **Result: "abc-123" = "abc-123" → RLS ALLOWS! ✅**

**Success:** Profile updated!

---

## Why RLS Uses auth.uid()

### 1. **Security Design**

RLS policies are designed to check against the **authenticated user's ID** (`auth.uid()`), not profile IDs. This is a security feature:

- `auth.uid()` = The actual authenticated user (from `auth.users`)
- Profile IDs = Just data in your database (can be manipulated)

**Supabase's security model:**
- ✅ Trusts `auth.uid()` (comes from authentication system)
- ❌ Doesn't trust profile IDs (comes from your database)

### 2. **Multi-Profile System**

With a multi-profile system, one user can have multiple profiles:
- Startup profile: `id = "profile-001"`
- Mentor profile: `id = "profile-002"`
- Investor profile: `id = "profile-003"`

But they all share the same `auth.uid()` = `"abc-123"`

**If RLS checked profile IDs:**
- ❌ Would need separate policies for each profile
- ❌ Would need to know which profile is active
- ❌ More complex and error-prone

**With auth.uid():**
- ✅ One policy works for all profiles
- ✅ Simpler and more secure
- ✅ Works automatically

---

## The Mismatch Problem

### Visual Representation:

```
┌─────────────────────────────────────────────────┐
│  Frontend Query (BEFORE)                        │
│  .eq('id', currentUser.id)                       │
│  Value: "profile-001"                            │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  RLS Policy Check                                │
│  USING (id = auth.uid())                         │
│  Value: "abc-123"                                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
            "profile-001" ≠ "abc-123"
                    │
                    ▼
            ❌ RLS BLOCKS QUERY
            ❌ No data returned
            ❌ 406 Error
```

```
┌─────────────────────────────────────────────────┐
│  Frontend Query (AFTER)                          │
│  .eq('id', authUserId)                           │
│  Value: "abc-123"                                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  RLS Policy Check                                │
│  USING (id = auth.uid())                         │
│  Value: "abc-123"                                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
            "abc-123" = "abc-123"
                    │
                    ▼
            ✅ RLS ALLOWS QUERY
            ✅ Data returned
            ✅ Success
```

---

## Real Issues This Caused

### 1. **Profile Updates Failed**
- User tries to update profile → 406 error
- Changes not saved
- User frustrated

### 2. **Data Not Loading**
- Investment Advisor Dashboard: No mandates showing
- Investor View: No recommendations showing
- Mentor View: No connection requests showing

### 3. **Cannot Add Data**
- Cannot create new mandates
- Cannot create due diligence requests
- Cannot submit recommendations

### 4. **Inconsistent Behavior**
- Some queries worked (if they didn't use RLS)
- Some queries failed (if they used RLS)
- Hard to debug

---

## Why This Happened

### The System Evolution:

1. **Initially:** System used `users` table where `id = auth.uid()`
   - ✅ Worked fine
   - ✅ Profile ID = Auth User ID

2. **Later:** Multi-profile system added `user_profiles` table
   - ❌ Profile IDs became different from auth.uid()
   - ❌ Code still used `currentUser.id` (profile ID)
   - ❌ RLS policies still checked `auth.uid()`
   - ❌ **Mismatch created!**

### The Gap:

```
Old System:
users.id = auth.uid()  ✅ Match!

New System:
user_profiles.id ≠ auth.uid()  ❌ Mismatch!
```

---

## The Solution

### Change All Queries to Use auth.uid():

**Pattern to Use:**
```typescript
// ✅ CORRECT - Always use this pattern
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id; // Fallback for safety
.eq('id', authUserId)  // Use auth.uid()
```

**Why This Works:**
- ✅ Matches what RLS policies check
- ✅ Works across all profiles
- ✅ Secure (uses authenticated user ID)
- ✅ Consistent behavior

---

## Summary

### Why We Needed to Change:

1. **RLS Policies Check `auth.uid()`**
   - This is how Supabase security works
   - Cannot be changed

2. **Profile IDs ≠ Auth User IDs**
   - Profile IDs are different UUIDs
   - Auth User IDs are the same for all profiles

3. **Mismatch = Blocked Queries**
   - RLS sees different values
   - Blocks the query for security
   - No data returned

4. **Solution: Use `auth.uid()`**
   - Matches what RLS checks
   - Works for all profiles
   - Secure and consistent

---

## Bottom Line

**We HAD to change because:**
- ❌ Using profile IDs → RLS blocks → Nothing works
- ✅ Using auth.uid() → RLS allows → Everything works

**It's not optional - it's required for RLS to work correctly!**



