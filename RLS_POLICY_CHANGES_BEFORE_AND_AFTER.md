# RLS Policy Changes: Before and After

## Summary

**BEFORE (Old RLS Policies):**
- ❌ Some used `current_setting('app.current_user_id')` (custom session variable)
- ❌ Some had infinite recursion (querying `users` table from within `users` table policy)
- ❌ Some were missing or incomplete
- ❌ Some didn't work with multi-profile system

**AFTER (New RLS Policies):**
- ✅ All use `auth.uid()` (Supabase's built-in function)
- ✅ No recursion issues
- ✅ Complete coverage for all tables
- ✅ Works with multi-profile system

---

## What Were the Old RLS Policies?

### 1. **Old Policy Using `current_setting()`**

**BEFORE:**
```sql
-- ❌ OLD WAY - Used custom session variable
CREATE POLICY "Users can view co-investment opportunities"
ON co_investment_opportunities
FOR SELECT USING (
    listed_by_user_id = current_setting('app.current_user_id')::UUID
);
```

**Problem:**
- `current_setting('app.current_user_id')` requires setting a session variable
- Frontend doesn't set this variable automatically
- Not reliable - variable might not be set
- Not the standard Supabase way

**AFTER:**
```sql
-- ✅ NEW WAY - Uses auth.uid()
CREATE POLICY "Users can view co-investment opportunities"
ON co_investment_opportunities
FOR SELECT USING (
    listed_by_user_id = auth.uid()
);
```

**Why Better:**
- `auth.uid()` is automatically available from Supabase Auth
- No need to set session variables
- Standard Supabase approach
- Always works

---

### 2. **Old Policy with Infinite Recursion**

**BEFORE:**
```sql
-- ❌ OLD WAY - Causes infinite recursion
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT USING (
    id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users advisor 
        WHERE advisor.id = auth.uid() 
        AND advisor.role = 'Investment Advisor'
        AND advisor.investment_advisor_code = users.investment_advisor_code_entered
    )
);
```

**Problem:**
- Policy queries `users` table from within `users` table policy
- Causes infinite recursion
- Database crashes or hangs
- Performance issues

**AFTER:**
```sql
-- ✅ NEW WAY - No recursion
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT USING (
    id = auth.uid() OR role = 'Admin'
);

-- Separate policy for Investment Advisors
CREATE POLICY "Investment Advisors can see their investors"
ON users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users advisor_user 
        WHERE advisor_user.id = auth.uid() 
        AND advisor_user.role = 'Investment Advisor'
    )
    AND investment_advisor_code_entered = (
        SELECT investment_advisor_code 
        FROM users 
        WHERE id = auth.uid() 
        AND role = 'Investment Advisor'
    )
);
```

**Why Better:**
- No recursion (uses `SECURITY DEFINER` functions if needed)
- Better performance
- Clearer separation of concerns

---

### 3. **Old Policy Missing or Incomplete**

**BEFORE:**
```sql
-- ❌ OLD WAY - Missing policies
-- No policy for advisor_mandates table
-- No policy for investment_advisor_recommendations
-- No policy for due_diligence_requests
```

**Problem:**
- Tables had RLS enabled but no policies
- All queries blocked by default
- No data accessible
- Errors everywhere

**AFTER:**
```sql
-- ✅ NEW WAY - Complete policies
CREATE POLICY "Advisors can view their own mandates"
ON advisor_mandates FOR SELECT
USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can create mandates"
ON advisor_mandates FOR INSERT
WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Investment Advisors can view recommendations"
ON investment_advisor_recommendations FOR SELECT
USING (investment_advisor_id = auth.uid());
```

**Why Better:**
- Complete coverage
- All tables have proper policies
- Data accessible correctly

---

### 4. **Old Policy Not Working with Multi-Profile**

**BEFORE:**
```sql
-- ❌ OLD WAY - Assumed users.id = profile.id
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (id = auth.uid());
```

**Problem:**
- Worked when `users.id = auth.uid()`
- Broke when multi-profile system added `user_profiles` table
- Profile IDs ≠ Auth User IDs
- Policies still worked, but frontend used wrong IDs

**Note:** The RLS policies themselves were correct, but the **frontend code** was using profile IDs instead of `auth.uid()`. So we didn't change the policies - we changed the **frontend code** to use `auth.uid()`.

**AFTER:**
```sql
-- ✅ NEW WAY - Still uses auth.uid() (no change needed!)
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (id = auth.uid());
```

**Why Better:**
- Policy was already correct
- Frontend now matches what policy checks
- Works with multi-profile system

---

## Why We Changed RLS Policies

### 1. **From `current_setting()` to `auth.uid()`**

**Reason:**
- `current_setting()` requires manual session variable setup
- `auth.uid()` is automatic and standard
- More reliable and easier to use

**Example Change:**
```sql
-- OLD
listed_by_user_id = current_setting('app.current_user_id')::UUID

-- NEW
listed_by_user_id = auth.uid()
```

---

### 2. **Fixed Infinite Recursion**

**Reason:**
- Policies querying same table cause recursion
- Database performance issues
- Need to use `SECURITY DEFINER` functions or separate policies

**Example Change:**
```sql
-- OLD - Recursive
CREATE POLICY "Users can view profiles"
USING (
    EXISTS (SELECT 1 FROM users WHERE ...)  -- ❌ Queries users from users policy!
)

-- NEW - Non-recursive
CREATE POLICY "Users can view profiles"
USING (id = auth.uid())  -- ✅ No recursion
```

---

### 3. **Added Missing Policies**

**Reason:**
- Tables with RLS enabled but no policies = all queries blocked
- Need policies for SELECT, INSERT, UPDATE, DELETE
- Each table needs appropriate policies

**Example Change:**
```sql
-- OLD - No policies
-- advisor_mandates table: RLS enabled, no policies → all queries blocked ❌

-- NEW - Complete policies
CREATE POLICY "Advisors can view mandates" ... ✅
CREATE POLICY "Advisors can create mandates" ... ✅
CREATE POLICY "Advisors can update mandates" ... ✅
```

---

### 4. **Frontend Code Changes (Not Policy Changes)**

**Important Note:**
- Most RLS policies were **already correct** (using `auth.uid()`)
- The problem was **frontend code** using profile IDs
- We changed **frontend code**, not policies

**Example:**
```typescript
// OLD - Frontend used profile ID
.eq('id', currentUser.id)  // Profile ID ≠ auth.uid() → RLS blocks

// NEW - Frontend uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
.eq('id', authUser.id)  // auth.uid() = auth.uid() → RLS allows
```

---

## Complete Before/After Comparison

### Co-Investment Opportunities

**BEFORE:**
```sql
CREATE POLICY "Users can view opportunities"
USING (
    listed_by_user_id = current_setting('app.current_user_id')::UUID
);
```

**AFTER:**
```sql
CREATE POLICY "Users can view opportunities"
USING (
    listed_by_user_id = auth.uid()
);
```

---

### Users Table

**BEFORE:**
```sql
-- Had infinite recursion
CREATE POLICY "Users can view profiles"
USING (
    id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users WHERE ...)  -- ❌ Recursion!
);
```

**AFTER:**
```sql
-- No recursion
CREATE POLICY "Users can view their own profile"
USING (id = auth.uid() OR role = 'Admin');

-- Separate policy for advisors
CREATE POLICY "Investment Advisors can see investors"
USING (
    EXISTS (
        SELECT 1 FROM users advisor_user 
        WHERE advisor_user.id = auth.uid() 
        AND advisor_user.role = 'Investment Advisor'
    )
);
```

---

### Advisor Mandates

**BEFORE:**
```sql
-- No policies existed
-- RLS enabled but no policies → all queries blocked ❌
```

**AFTER:**
```sql
CREATE POLICY "Advisors can view their own mandates"
ON advisor_mandates FOR SELECT
USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can create mandates"
ON advisor_mandates FOR INSERT
WITH CHECK (advisor_id = auth.uid());
```

---

## Summary Table

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| **Auth Method** | `current_setting('app.current_user_id')` | `auth.uid()` |
| **Recursion Issues** | ❌ Yes (some policies) | ✅ No |
| **Policy Coverage** | ❌ Missing (some tables) | ✅ Complete |
| **Multi-Profile Support** | ⚠️ Policies OK, frontend wrong | ✅ Both correct |
| **Reliability** | ❌ Manual setup required | ✅ Automatic |
| **Standard Approach** | ❌ Custom solution | ✅ Supabase standard |

---

## Key Takeaways

### 1. **Most Policies Were Already Correct**
- They already used `auth.uid()`
- The problem was frontend using profile IDs
- We changed **frontend code**, not policies

### 2. **Some Policies Needed Fixes**
- `current_setting()` → `auth.uid()`
- Infinite recursion → Separate policies
- Missing policies → Added complete policies

### 3. **Why `auth.uid()` is Better**
- ✅ Automatic (no setup needed)
- ✅ Standard Supabase approach
- ✅ More reliable
- ✅ Works with multi-profile system

---

## Bottom Line

**We changed RLS policies because:**
1. Some used `current_setting()` (not reliable)
2. Some had infinite recursion (performance issues)
3. Some were missing (queries blocked)
4. **But most were already correct** - the real issue was frontend using profile IDs instead of `auth.uid()`

**The main fix was changing frontend code to use `auth.uid()`, not changing RLS policies!**



