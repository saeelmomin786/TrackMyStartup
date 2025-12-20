# Migration Strategy - OPTIMIZED (No Fallbacks)

## Goal
✅ **Complete migration to `user_profiles` table ONLY**  
✅ **NO fallbacks to `users` table**  
✅ **Optimized for large user bases**  
✅ **Ready to delete `users` table**

---

## Core Principles

### 1. NO FALLBACKS
- ❌ NO: `IF NOT FOUND THEN SELECT FROM users`
- ❌ NO: `COALESCE(profile_data, users_data)`
- ✅ YES: Query `user_profiles` only
- ✅ YES: If not found, return NULL/empty (function behavior)

### 2. OPTIMIZED QUERIES
- ✅ Single table queries when possible
- ✅ Use proper indexes (`auth_user_id` indexed)
- ✅ `ORDER BY created_at DESC LIMIT 1` for most recent profile
- ✅ Efficient JOINs when needed

### 3. FUNCTION SIGNATURES STAY SAME
- ✅ Keep same function name
- ✅ Keep same parameters
- ✅ Keep same return type/format
- ✅ Only internal implementation changes

---

## Migration Pattern for Each Function

### Pattern 1: Simple SELECT (Role, Name, Email, etc.)
```sql
-- OLD (with fallback):
SELECT role FROM users WHERE id = user_id;
-- Fallback to users table if not found

-- NEW (optimized, no fallback):
SELECT role::TEXT
FROM public.user_profiles
WHERE auth_user_id = user_id
ORDER BY created_at DESC
LIMIT 1;
```

### Pattern 2: JOIN with users table
```sql
-- OLD:
SELECT u.name, u.email
FROM some_table s
JOIN users u ON s.user_id = u.id

-- NEW:
SELECT up.name, up.email
FROM some_table s
JOIN user_profiles up ON s.user_id = up.auth_user_id
-- Get most recent profile if multiple
```

### Pattern 3: EXISTS checks
```sql
-- OLD:
EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'Investor')

-- NEW:
EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE auth_user_id = user_id 
    AND role = 'Investor'
    LIMIT 1
)
```

---

## Verification Steps

After each migration:
1. ✅ Function creates successfully
2. ✅ Function signature unchanged
3. ✅ No syntax errors
4. ✅ Test with sample data
5. ✅ Verify performance (should be faster)

---

## Progress Tracking

- ✅ = Migrated (no fallback)
- 🔄 = In progress
- ⏳ = Pending



