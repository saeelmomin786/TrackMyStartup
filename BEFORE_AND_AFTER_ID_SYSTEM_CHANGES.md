# Before and After: ID System Changes

## Summary

**BEFORE (Early/Old Way):**
- ❌ Used `currentUser.id` (Profile ID from `user_profiles` table)
- ❌ Used `profile.id` (Profile ID)
- ❌ Direct queries with profile IDs

**AFTER (New Way):**
- ✅ Use `auth.uid()` (Authentication User ID from `auth.users` table)
- ✅ Fetch `auth.uid()` from `supabase.auth.getUser()`
- ✅ Use `auth.uid()` in all RLS-protected queries

---

## The Problem

### Two Different ID Systems:

1. **Profile ID** (`currentUser.id` or `user_profiles.id`)
   - Different UUID for each profile
   - Example: `478e8624-8229-451a-93f8-e1f261e8ca94`
   - One user can have multiple profile IDs (Startup, Mentor, Investor, etc.)

2. **Auth User ID** (`auth.uid()` or `auth.users.id`)
   - Same UUID for all profiles of one user
   - Example: `7322be22-6fbe-41ed-942b-b80c8721cd77`
   - One per email account

### Why This Caused Issues:

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

**RLS Policies Check:**
```sql
CREATE POLICY "Users can update their own profile"
USING (id = auth.uid())  -- Checks auth.uid(), NOT profile ID!
```

**Old Code (WRONG):**
```typescript
// ❌ Used profile ID
await supabase
  .from('users')
  .update(updates)
  .eq('id', currentUser.id)  // profile ID ≠ auth.uid()
```

**Result:** ❌ RLS blocks the query because `profile_id ≠ auth.uid()`

---

## What Changed

### 1. Profile Updates

**BEFORE:**
```typescript
// ❌ OLD WAY - Used profile ID
const updateResult = await authService.updateProfile(currentUser.id, profileData);
```

**AFTER:**
```typescript
// ✅ NEW WAY - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id; // Fallback for safety
const updateResult = await authService.updateProfile(authUserId, profileData);
```

### 2. Database Queries

**BEFORE:**
```typescript
// ❌ OLD WAY - Used profile ID
const { data, error } = await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', currentUser.id);  // profile ID
```

**AFTER:**
```typescript
// ✅ NEW WAY - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id;
const { data, error } = await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', authUserId);  // auth.uid()
```

### 3. Due Diligence Requests

**BEFORE:**
```typescript
// ❌ OLD WAY - Used profile ID
await supabase
  .from('due_diligence_requests')
  .insert({ user_id: currentUser.id, startup_id: startupId });
```

**AFTER:**
```typescript
// ✅ NEW WAY - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id;
await supabase
  .from('due_diligence_requests')
  .insert({ user_id: authUserId, startup_id: startupId });
```

### 4. Service Functions

**BEFORE:**
```typescript
// ❌ OLD WAY - Service received profile ID
async getMandatesByAdvisor(advisorId: string) {
  return await supabase
    .from('advisor_mandates')
    .select('*')
    .eq('advisor_id', advisorId);  // profile ID
}
```

**AFTER:**
```typescript
// ✅ NEW WAY - Service fetches auth.uid() internally
async getMandatesByAdvisor(advisorId: string) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const authUserId = authUser?.id || advisorId;
  return await supabase
    .from('advisor_mandates')
    .select('*')
    .eq('advisor_id', authUserId);  // auth.uid()
}
```

---

## Files Changed

### Components Updated:
1. ✅ `components/InvestmentAdvisorView.tsx`
2. ✅ `components/EditProfileModal.tsx`
3. ✅ `components/InvestorView.tsx`
4. ✅ `components/MentorView.tsx`
5. ✅ `components/investment-advisor/InvestmentAdvisorProfileForm.tsx`
6. ✅ `components/investor/InvestorProfileForm.tsx`
7. ✅ `components/PublicInvestorPage.tsx`

### Services Updated:
1. ✅ `lib/auth.ts` - `updateProfile()` function
2. ✅ `lib/paymentService.ts` - Due diligence functions
3. ✅ `lib/advisorMandateService.ts` - Mandate functions

---

## Why This Change Was Necessary

### RLS Policies Use `auth.uid()`

All RLS policies check against `auth.uid()`, not profile IDs:

```sql
-- RLS Policy Example
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (id = auth.uid());  -- Checks auth.uid(), NOT profile ID!
```

### Profile IDs ≠ Auth User IDs

- `currentUser.id` = Profile ID (different for each profile)
- `auth.uid()` = Auth User ID (same for all profiles)

**Example:**
- User has Startup profile: `currentUser.id = "profile-001"`
- User has Mentor profile: `currentUser.id = "profile-002"`
- But `auth.uid()` = `"abc-123"` (same for both!)

### The Mismatch

```typescript
// Query with profile ID
.eq('id', currentUser.id)  // "profile-001"

// RLS checks
id = auth.uid()  // "abc-123"

// Result: "profile-001" ≠ "abc-123" → RLS BLOCKS! ❌
```

---

## Current System

### How It Works Now:

1. **Get Auth User ID:**
   ```typescript
   const { data: { user: authUser } } = await supabase.auth.getUser();
   const authUserId = authUser?.id || currentUser.id; // Fallback
   ```

2. **Use in Queries:**
   ```typescript
   await supabase
     .from('users')
     .update(updates)
     .eq('id', authUserId);  // Uses auth.uid()
   ```

3. **RLS Allows:**
   ```sql
   -- RLS Policy
   USING (id = auth.uid())  -- "abc-123" = "abc-123" ✅
   ```

### Works for All Profiles:

✅ **Startup Profile:**
- `auth.uid()` = `"abc-123"`
- RLS allows access ✅

✅ **Mentor Profile:**
- `auth.uid()` = `"abc-123"` (same!)
- RLS allows access ✅

✅ **Investor Profile:**
- `auth.uid()` = `"abc-123"` (same!)
- RLS allows access ✅

---

## Summary Table

| Aspect | BEFORE (Old Way) | AFTER (New Way) |
|--------|------------------|-----------------|
| **ID Used** | `currentUser.id` (Profile ID) | `auth.uid()` (Auth User ID) |
| **Source** | `user_profiles.id` | `auth.users.id` |
| **Value** | Different per profile | Same for all profiles |
| **RLS Match** | ❌ Doesn't match | ✅ Matches |
| **Works Across Profiles** | ❌ No | ✅ Yes |
| **Example** | `"profile-001"` | `"abc-123"` |

---

## Key Takeaway

**Always use `auth.uid()` for RLS-protected queries:**

```typescript
// ✅ CORRECT Pattern
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id; // Fallback
.eq('id', authUserId)  // Use auth.uid()
```

**Never use `currentUser.id` directly for RLS queries:**

```typescript
// ❌ WRONG Pattern
.eq('id', currentUser.id)  // Profile ID - won't work with RLS!
```

---

## Benefits of the Change

1. ✅ **Works across all profiles** (Startup, Mentor, Investor, etc.)
2. ✅ **Matches RLS policies** (which check `auth.uid()`)
3. ✅ **Consistent behavior** (same auth user ID for all profiles)
4. ✅ **No data loading issues** (RLS allows access)
5. ✅ **Can add/update data** (RLS allows writes)

---

## Migration Status

- ✅ Profile updates fixed
- ✅ Due diligence requests fixed
- ✅ Advisor mandates fixed
- ✅ Investment advisor recommendations fixed
- ✅ All Investment Advisor Dashboard sections fixed
- ✅ All Investor View sections fixed
- ✅ All Mentor View sections fixed

**All critical sections now use `auth.uid()` instead of profile IDs!**


