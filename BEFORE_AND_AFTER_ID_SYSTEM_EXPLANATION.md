# Before vs After: ID System Changes

## What We Were Using BEFORE (The Problem)

### ❌ **OLD APPROACH - BROKEN**

**Frontend:**
```typescript
// ❌ WRONG - Used currentUser.id (could be profile ID)
const mandates = await advisorMandateService.getMandatesByAdvisor(currentUser.id);
// currentUser.id might be:
// - users.id (if from old system) ✅
// - user_profiles.id (if from new multi-profile system) ❌
```

**RLS Policies:**
```sql
-- RLS policies checked auth.uid()
CREATE POLICY "Advisors can view their own mandates"
USING (advisor_id = auth.uid());  -- Checks auth.uid()
```

**The Problem:**
- If `currentUser.id` = `user_profiles.id` (profile ID, e.g., "profile-123")
- But `auth.uid()` = `auth.users.id` (auth ID, e.g., "abc-123")
- RLS blocks: `"profile-123" ≠ "abc-123"` ❌
- **Result:** No data loads!

---

## What We Are Using NOW (The Fix)

### ✅ **NEW APPROACH - FIXED**

**Frontend Services:**
```typescript
// ✅ CORRECT - Use auth.uid() directly
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || advisorId;  // auth.uid()

const mandates = await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', authUserId);  // Uses auth.uid()
```

**RLS Policies:**
```sql
-- RLS policies still check auth.uid() (unchanged)
CREATE POLICY "Advisors can view their own mandates"
USING (advisor_id = auth.uid());  -- Checks auth.uid()
```

**The Fix:**
- Frontend now uses `auth.uid()` (from `supabase.auth.getUser()`)
- RLS policies check `auth.uid()`
- Both match: `"abc-123" = "abc-123"` ✅
- **Result:** Data loads correctly!

---

## ID System Comparison

### **Three Types of IDs in Your System:**

1. **`auth.users.id`** = `auth.uid()` ✅
   - Authentication user ID
   - One per email account
   - Same for ALL profiles of a user
   - **This is what RLS policies check**

2. **`users.id`** = Should equal `auth.users.id` ✅
   - Public users table ID
   - Should match `auth.users.id`
   - **This is what FK constraints should reference**

3. **`user_profiles.id`** = Profile ID ❌
   - Different UUID per profile
   - One user can have multiple profiles
   - **NOT the same as `auth.uid()`**
   - **This is what was causing the problem!**

---

## Example: User with Multiple Profiles

### **User: john@example.com**

```
auth.users.id = "abc-123"  ← auth.uid() = "abc-123"

user_profiles:
├── Startup Profile
│   ├── id = "profile-001"  ← Different UUID!
│   └── auth_user_id = "abc-123"  ← Links to auth.users
│
└── Mentor Profile
    ├── id = "profile-002"  ← Different UUID!
    └── auth_user_id = "abc-123"  ← Same auth user
```

### **BEFORE (Broken):**

```typescript
// User switches to Startup profile
currentUser.id = "profile-001"  // Profile ID

// Service uses currentUser.id
.eq('advisor_id', "profile-001")  // ❌ Wrong!

// RLS checks
advisor_id = auth.uid()  // "profile-001" = "abc-123" ❌ FALSE
// Result: Blocked! No data.
```

### **NOW (Fixed):**

```typescript
// User switches to Startup profile
currentUser.id = "profile-001"  // Profile ID (ignored)

// Service uses auth.uid()
const { data: { user } } = await supabase.auth.getUser();
const authUserId = user.id;  // "abc-123" ✅

.eq('advisor_id', "abc-123")  // ✅ Correct!

// RLS checks
advisor_id = auth.uid()  // "abc-123" = "abc-123" ✅ TRUE
// Result: Allowed! Data loads.
```

---

## What Changed in Code

### **1. Service Files (lib/advisorMandateService.ts)**

**BEFORE:**
```typescript
async getMandatesByAdvisor(advisorId: string) {
  // ❌ Used advisorId directly (could be profile ID)
  return supabase
    .from('advisor_mandates')
    .select('*')
    .eq('advisor_id', advisorId);
}
```

**NOW:**
```typescript
async getMandatesByAdvisor(advisorId: string) {
  // ✅ Get auth.uid() first
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const authUserId = authUser?.id || advisorId;
  
  // ✅ Use auth.uid() instead
  return supabase
    .from('advisor_mandates')
    .select('*')
    .eq('advisor_id', authUserId);  // Uses auth.uid()
}
```

### **2. RLS Policies (Unchanged)**

**BEFORE & NOW (Same):**
```sql
CREATE POLICY "Advisors can view their own mandates"
USING (advisor_id = auth.uid());  -- Always checked auth.uid()
```

**Why unchanged?** RLS policies were already correct! The problem was the frontend using the wrong ID.

---

## Summary Table

| Aspect | BEFORE ❌ | NOW ✅ |
|--------|-----------|--------|
| **Frontend uses** | `currentUser.id` (profile ID) | `auth.uid()` (from `getUser()`) |
| **RLS checks** | `auth.uid()` | `auth.uid()` (unchanged) |
| **Match?** | ❌ No (profile ID ≠ auth.uid()) | ✅ Yes (auth.uid() = auth.uid()) |
| **Data loads?** | ❌ No | ✅ Yes |
| **Works across profiles?** | ❌ No | ✅ Yes (all profiles share same auth.uid()) |

---

## Key Insight

**The fix wasn't changing RLS policies** - they were already correct!

**The fix was changing the frontend** to use `auth.uid()` instead of `currentUser.id`.

**Why this works for all profiles:**
- All profiles of a user share the same `auth.uid()`
- Startup profile: `auth.uid() = "abc-123"`
- Mentor profile: `auth.uid() = "abc-123"` (same!)
- So RLS works for both! ✅

---

## Files Changed

1. ✅ `lib/advisorMandateService.ts` - Now uses `auth.uid()`
2. ✅ `lib/advisorAddedInvestorService.ts` - Already fixed
3. ✅ `lib/advisorAddedStartupService.ts` - Already fixed
4. ✅ `components/InvestmentAdvisorView.tsx` - Updated to use services correctly

## Files to Check/Fix

- ⚠️ Other services that use `currentUser.id` for RLS-protected queries
- ⚠️ Tables that need FK constraints added (like `advisor_mandates`)




