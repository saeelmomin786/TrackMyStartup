# Why currentUser.id ≠ auth.uid() Broke Everything

## Your Question

**"After profile switch: currentUser.id ≠ auth.uid() → broke. Why?"**

## The Answer

**Because RLS policies check `auth.uid()` directly, and when frontend uses `currentUser.id` (profile ID) which doesn't equal `auth.uid()`, RLS sees a mismatch and blocks the query.**

---

## The Mismatch Problem

### What Happens When Values Don't Match:

**RLS Policy:**
```sql
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (id = auth.uid());  -- Checks if id equals auth.uid()
```

**Frontend Query (After Profile Switch):**
```typescript
const currentUser = await getCurrentUser();
// currentUser.id = "profile-001" (profile ID from user_profiles)

await supabase
  .from('users')
  .update(updates)
  .eq('id', currentUser.id);  // Uses "profile-001"
```

**What RLS Sees:**
```
Query: id = "profile-001" (from frontend)
RLS Check: id = auth.uid() = "abc-123" (from auth token)

Comparison: "profile-001" = "abc-123"
Result: FALSE → RLS BLOCKS! ❌
```

---

## Step-by-Step: Why It Breaks

### Step 1: Frontend Sends Query

```typescript
// Frontend code
const currentUser = await getCurrentUser();
// currentUser.id = "profile-001" (from user_profiles table)

await supabase
  .from('users')
  .update({ name: "John" })
  .eq('id', currentUser.id);  // Sends "profile-001"
```

**What gets sent to database:**
```sql
UPDATE users 
SET name = 'John'
WHERE id = 'profile-001';  -- Profile ID from frontend
```

---

### Step 2: RLS Policy Checks

**RLS Policy runs:**
```sql
-- RLS evaluates the USING clause
USING (id = auth.uid())

-- What RLS sees:
id = auth.uid()
"profile-001" = "abc-123"  -- FALSE!
```

**RLS Decision:**
- Query value: `"profile-001"` (from frontend)
- RLS check: `auth.uid()` = `"abc-123"` (from auth token)
- **Comparison: FALSE**
- **Action: BLOCK QUERY ❌**

---

### Step 3: Result

**Database Response:**
```
❌ Error: Row Level Security policy violation
❌ Query blocked
❌ No data returned
❌ Update fails
```

**Frontend sees:**
```
❌ 406 Not Acceptable error
❌ Profile update fails
❌ User frustrated
```

---

## Visual Flow: Why It Breaks

### The Query Flow:

```
┌─────────────────────────────────────┐
│  Frontend Code                      │
│  currentUser.id = "profile-001"     │
│  .eq('id', currentUser.id)          │
└─────────────────────────────────────┘
           │
           │ Sends: id = "profile-001"
           ▼
┌─────────────────────────────────────┐
│  Database Query                      │
│  UPDATE users                        │
│  SET name = 'John'                   │
│  WHERE id = 'profile-001'           │
└─────────────────────────────────────┘
           │
           │ RLS Policy Checks
           ▼
┌─────────────────────────────────────┐
│  RLS Policy Evaluation              │
│  USING (id = auth.uid())            │
│                                     │
│  Comparison:                        │
│  "profile-001" = "abc-123"          │
│  Result: FALSE ❌                    │
└─────────────────────────────────────┘
           │
           │ Decision: BLOCK
           ▼
┌─────────────────────────────────────┐
│  Result                              │
│  ❌ Query Blocked                     │
│  ❌ 406 Error                         │
│  ❌ Update Fails                     │
└─────────────────────────────────────┘
```

---

## Why RLS Blocks When Values Don't Match

### RLS Security Model:

**RLS is a security feature:**
- It checks if the query matches the policy
- If values don't match, it assumes unauthorized access
- It blocks the query to protect data

**In our case:**
```
Query: id = "profile-001" (profile ID)
Policy: id = auth.uid() = "abc-123" (auth user ID)

"profile-001" ≠ "abc-123"
→ RLS thinks: "This doesn't match! Unauthorized!"
→ RLS blocks: "Deny access!"
```

---

## Comparison: Before vs After

### Before Profile Switch (Worked):

```
Frontend:
  currentUser.id = "abc-123"

Query:
  .eq('id', "abc-123")

RLS Check:
  id = auth.uid()
  "abc-123" = "abc-123"  ✅ TRUE

Result: ✅ ALLOWED
```

---

### After Profile Switch (Broke):

```
Frontend:
  currentUser.id = "profile-001"

Query:
  .eq('id', "profile-001")

RLS Check:
  id = auth.uid()
  "profile-001" = "abc-123"  ❌ FALSE

Result: ❌ BLOCKED
```

---

### After Fix (Works):

```
Frontend:
  authUserId = "abc-123" (from auth.uid())

Query:
  .eq('id', "abc-123")

RLS Check:
  id = auth.uid()
  "abc-123" = "abc-123"  ✅ TRUE

Result: ✅ ALLOWED
```

---

## Real Example: Profile Update

### Scenario: User tries to update profile

**After Profile Switch (Before Fix):**

```typescript
// Frontend
const currentUser = await getCurrentUser();
// currentUser.id = "profile-001"

const updateResult = await authService.updateProfile(
  currentUser.id,  // "profile-001"
  { name: "John" }
);
```

**What happens:**

1. **Frontend sends:**
   ```sql
   UPDATE users 
   SET name = 'John'
   WHERE id = 'profile-001';
   ```

2. **RLS checks:**
   ```sql
   -- RLS Policy
   USING (id = auth.uid())
   
   -- Evaluation
   "profile-001" = "abc-123"  -- FALSE!
   ```

3. **RLS blocks:**
   ```
   ❌ Row Level Security policy violation
   ❌ Query denied
   ```

4. **Result:**
   ```
   ❌ 406 Not Acceptable error
   ❌ Profile not updated
   ❌ User sees error
   ```

---

**After Fix:**

```typescript
// Frontend
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id;  // "abc-123"

const updateResult = await authService.updateProfile(
  authUserId,  // "abc-123"
  { name: "John" }
);
```

**What happens:**

1. **Frontend sends:**
   ```sql
   UPDATE users 
   SET name = 'John'
   WHERE id = 'abc-123';
   ```

2. **RLS checks:**
   ```sql
   -- RLS Policy
   USING (id = auth.uid())
   
   -- Evaluation
   "abc-123" = "abc-123"  -- TRUE!
   ```

3. **RLS allows:**
   ```
   ✅ Policy check passed
   ✅ Query allowed
   ```

4. **Result:**
   ```
   ✅ Profile updated successfully
   ✅ User sees success
   ```

---

## Why RLS Doesn't "Understand" the Link

### What You Might Think:

**"Profile ID links to auth.uid() via auth_user_id, so RLS should allow it, right?"**

**What Actually Happens:**

**RLS Policy:**
```sql
USING (id = auth.uid())  -- Direct comparison only!
```

**RLS Does NOT:**
- ❌ Check `auth_user_id` column
- ❌ Do JOINs to find relationships
- ❌ Look up in `user_profiles` table
- ❌ Follow foreign keys
- ❌ Understand table relationships

**RLS Only Does:**
- ✅ Direct value comparison
- ✅ Checks `auth.uid()` function
- ✅ Compares with query value
- ✅ Blocks if values don't match

---

## The Security Model

### Why RLS Blocks Mismatches:

**RLS is designed for security:**
- If values don't match, it assumes unauthorized access
- It blocks queries to protect data
- It doesn't trust relationships - only direct matches

**In our case:**
```
Query: id = "profile-001"
Policy: id = auth.uid() = "abc-123"

Mismatch detected!
→ RLS thinks: "Unauthorized access attempt!"
→ RLS blocks: "Deny!"
```

**This is by design:**
- RLS is strict for security
- It only allows exact matches
- It doesn't do relationship lookups

---

## Summary

### Why `currentUser.id ≠ auth.uid()` Broke Everything:

1. **RLS Checks `auth.uid()` Directly**
   - Policy: `id = auth.uid()`
   - Checks: `"abc-123"` (from auth token)

2. **Frontend Uses Profile ID**
   - Query: `id = "profile-001"` (from currentUser.id)
   - Different from what RLS checks

3. **Mismatch Detected**
   - `"profile-001" ≠ "abc-123"`
   - RLS sees mismatch

4. **RLS Blocks Query**
   - Security feature blocks mismatches
   - Query denied
   - Error returned

5. **Everything Breaks**
   - Updates fail
   - Queries return no data
   - User can't do anything

---

## The Fix

### Use `auth.uid()` Instead of Profile ID:

```typescript
// ❌ WRONG - Uses profile ID
.eq('id', currentUser.id)  // "profile-001"

// ✅ CORRECT - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
.eq('id', authUser.id)  // "abc-123"
```

**Why this works:**
- ✅ Matches what RLS checks
- ✅ No mismatch
- ✅ RLS allows query
- ✅ Everything works

---

## Bottom Line

**`currentUser.id ≠ auth.uid()` broke everything because:**

1. ❌ RLS checks `auth.uid()` directly
2. ❌ Frontend used profile ID (different value)
3. ❌ Mismatch detected
4. ❌ RLS blocks for security
5. ❌ Everything fails

**The fix:**
- ✅ Use `auth.uid()` in queries
- ✅ Matches what RLS checks
- ✅ No mismatch
- ✅ Everything works

**RLS is strict - it only allows exact matches. That's why the mismatch broke everything!**



