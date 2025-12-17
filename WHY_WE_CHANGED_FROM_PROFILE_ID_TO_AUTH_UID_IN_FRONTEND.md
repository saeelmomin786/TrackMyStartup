# Why We Changed from Profile ID to auth.uid() in Frontend

## Your Question

**"Why do we need to change from profile ID to auth.uid() in frontend? Can't we just use profile ID since it's linked to auth.uid() via auth_user_id? RLS checks auth.uid() once, right? So why can't we use profile ID to fetch data?"**

## The Answer

**❌ NO, we cannot use profile ID because RLS checks `auth.uid()` directly, not the `auth_user_id` column.**

**Even though profile IDs are linked to auth.uid() via `auth_user_id`, RLS doesn't check that column - it only checks the `auth.uid()` function.**

---

## The Critical Issue

### RLS Policies Check `auth.uid()` Function, NOT `auth_user_id` Column

**RLS Policy:**
```sql
CREATE POLICY "Users can view their own data"
ON advisor_mandates FOR SELECT
USING (advisor_id = auth.uid());  -- Checks auth.uid() FUNCTION, not column!
```

**Key Point:** RLS checks `auth.uid()` **function**, not `auth_user_id` **column**!

---

## What Happens When We Use Profile ID

### Scenario: User has Startup profile

```
Profile:
├── id = "abc-123" (profile ID)
└── auth_user_id = "123" (links to auth.uid())

auth.uid() = "123"
```

### If We Use Profile ID in Frontend:

```typescript
// ❌ WRONG - Uses profile ID
const profileId = currentUser.id;  // "abc-123"
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', profileId);  // Uses "abc-123"
```

**What RLS Sees:**
```sql
-- RLS Policy Check
advisor_id = auth.uid()  -- Checks: "123" (from auth.uid() function)

-- Query from Frontend
advisor_id = "abc-123"  -- Profile ID from frontend

-- Comparison
"abc-123" = "123"  -- ❌ FALSE! RLS BLOCKS!
```

**Result:** ❌ RLS blocks the query!

---

### If We Use auth.uid() in Frontend:

```typescript
// ✅ CORRECT - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authId = authUser.id;  // "123" (auth.uid())
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', authId);  // Uses "123"
```

**What RLS Sees:**
```sql
-- RLS Policy Check
advisor_id = auth.uid()  -- Checks: "123" (from auth.uid() function)

-- Query from Frontend
advisor_id = "123"  -- auth.uid() from frontend

-- Comparison
"123" = "123"  -- ✅ TRUE! RLS ALLOWS!
```

**Result:** ✅ RLS allows the query!

---

## Why RLS Doesn't Check `auth_user_id` Column

### RLS Only Checks `auth.uid()` Function

**RLS Policy:**
```sql
USING (advisor_id = auth.uid())  -- Checks FUNCTION, not column!
```

**What RLS Does:**
1. Gets `auth.uid()` from authentication token
2. Compares it with `advisor_id` in the query
3. **Does NOT** check `auth_user_id` column in `user_profiles` table

**Why:**
- RLS policies run at the database level
- They check the authentication token, not table relationships
- They don't do JOINs or lookups in other tables
- They only compare values directly

---

## The Link Doesn't Help RLS

### Even Though Profile ID Links to auth.uid():

```
user_profiles table:
┌─────────────┬──────────────┐
│ id          │ auth_user_id │
├─────────────┼──────────────┤
│ abc-123     │ 123          │ ← Profile links to auth.uid()
└─────────────┴──────────────┘
```

**RLS Doesn't Know About This Link!**

**RLS Policy:**
```sql
USING (advisor_id = auth.uid())  -- Only checks auth.uid() function
```

**RLS Process:**
1. Gets `auth.uid()` = `"123"` from token
2. Gets `advisor_id` = `"abc-123"` from query
3. Compares: `"abc-123" = "123"` → FALSE
4. **Does NOT** check `user_profiles.auth_user_id` column
5. **Does NOT** do JOIN to find the link
6. Blocks the query

---

## Visual Comparison

### What You're Thinking:

```
Profile ID: abc-123
  ↓ (has auth_user_id = 123)
Auth ID: 123

"Since profile ID links to auth ID, RLS should allow it, right?"
```

### What Actually Happens:

```
RLS Policy:
  advisor_id = auth.uid()  -- Checks "123"

Frontend Query:
  advisor_id = "abc-123"  -- Profile ID

RLS Comparison:
  "abc-123" = "123"  -- Direct comparison, no lookup!

Result: FALSE → BLOCKED! ❌
```

**RLS doesn't do:**
- ❌ Lookup in `user_profiles` table
- ❌ Check `auth_user_id` column
- ❌ Join tables to find relationship
- ❌ Follow foreign keys

**RLS only does:**
- ✅ Direct value comparison
- ✅ Checks `auth.uid()` function
- ✅ Compares with query value

---

## Why We Must Use auth.uid() in Frontend

### The Only Way RLS Works:

**Frontend must provide the same value that RLS checks:**

```typescript
// ✅ CORRECT - Frontend provides auth.uid()
const authId = authUser.id;  // "123"
.eq('advisor_id', authId);  // "123"

// RLS checks
advisor_id = auth.uid()  // "123"

// Comparison
"123" = "123"  // ✅ MATCH!
```

**If frontend provides profile ID:**
```typescript
// ❌ WRONG - Frontend provides profile ID
const profileId = currentUser.id;  // "abc-123"
.eq('advisor_id', profileId);  // "abc-123"

// RLS checks
advisor_id = auth.uid()  // "123"

// Comparison
"abc-123" = "123"  // ❌ NO MATCH!
```

---

## Example: Real Query Flow

### Using Profile ID (Doesn't Work):

```typescript
// Frontend
const profileId = "abc-123";  // Profile ID
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', profileId);
```

**Database Query:**
```sql
SELECT * FROM advisor_mandates 
WHERE advisor_id = 'abc-123';
```

**RLS Policy Check:**
```sql
-- RLS evaluates
advisor_id = auth.uid()
-- "abc-123" = "123"  -- FALSE!
```

**Result:** ❌ Query blocked by RLS

---

### Using auth.uid() (Works):

```typescript
// Frontend
const authId = "123";  // auth.uid()
await supabase
  .from('advisor_mandates')
  .select('*')
  .eq('advisor_id', authId);
```

**Database Query:**
```sql
SELECT * FROM advisor_mandates 
WHERE advisor_id = '123';
```

**RLS Policy Check:**
```sql
-- RLS evaluates
advisor_id = auth.uid()
-- "123" = "123"  -- TRUE!
```

**Result:** ✅ Query allowed by RLS

---

## The Key Insight

### RLS is a Direct Comparison, Not a Relationship Lookup

**What RLS Does:**
```sql
-- Simple comparison
advisor_id = auth.uid()  -- Direct value comparison
```

**What RLS Does NOT Do:**
```sql
-- Complex lookup (RLS doesn't do this!)
advisor_id IN (
    SELECT auth_user_id FROM user_profiles 
    WHERE id = advisor_id AND auth_user_id = auth.uid()
)
```

**Why:**
- RLS policies are simple and fast
- They don't do JOINs or subqueries
- They only do direct value comparisons
- They check authentication token, not table relationships

---

## Summary

### Why We Changed from Profile ID to auth.uid():

1. **RLS Checks `auth.uid()` Function**
   - Not `auth_user_id` column
   - Not table relationships
   - Only direct value comparison

2. **Profile ID ≠ auth.uid()**
   - Profile ID: `"abc-123"` (different per profile)
   - auth.uid(): `"123"` (same for all profiles)
   - Direct comparison fails

3. **The Link Doesn't Help**
   - Even though profile links to auth.uid() via `auth_user_id`
   - RLS doesn't check that column
   - RLS only checks `auth.uid()` function

4. **Must Match What RLS Checks**
   - Frontend must provide `auth.uid()`
   - Not profile ID
   - Not `auth_user_id` column
   - Only `auth.uid()` function value

---

## Bottom Line

**Even though profile IDs are linked to auth.uid() via `auth_user_id` column:**

- ❌ RLS doesn't check `auth_user_id` column
- ❌ RLS doesn't do relationship lookups
- ❌ RLS only checks `auth.uid()` function directly
- ✅ Frontend must use `auth.uid()` to match what RLS checks

**That's why we changed from profile ID to auth.uid() in the frontend!**



