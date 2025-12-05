# Mentor Code System - Safety Analysis

## ✅ **SAFE TO RUN - No Impact on Existing Code**

This SQL script is designed to be **completely safe** and **non-destructive**. Here's why:

---

## 🔒 **Safety Features**

### 1. **Column Addition - Safe**
```sql
IF NOT EXISTS (...) THEN
    ALTER TABLE users ADD COLUMN mentor_code VARCHAR(10) UNIQUE;
```
- ✅ Uses `IF NOT EXISTS` check - won't error if column already exists
- ✅ Only adds a new column - doesn't modify existing columns
- ✅ UNIQUE constraint prevents duplicates

### 2. **Function Creation - Safe**
```sql
CREATE OR REPLACE FUNCTION generate_mentor_code()
CREATE OR REPLACE FUNCTION assign_mentor_code(p_user_id UUID)
CREATE OR REPLACE FUNCTION set_mentor_code()
```
- ✅ Uses `CREATE OR REPLACE` - safely updates if function exists
- ✅ **Unique function names** - no conflicts with existing functions:
  - `generate_mentor_code()` - unique to mentors
  - `assign_mentor_code()` - unique to mentors
  - `set_mentor_code()` - unique to mentors
- ✅ Other roles use different functions:
  - Investors: `generate_investor_code()`
  - CS: `generate_cs_code()`
  - CA: (different system)

### 3. **Trigger Management - Safe**
```sql
DROP TRIGGER IF EXISTS trigger_set_mentor_code ON users;
CREATE TRIGGER trigger_set_mentor_code ...
```
- ✅ Uses `DROP TRIGGER IF EXISTS` - won't error if trigger doesn't exist
- ✅ **Unique trigger name** - `trigger_set_mentor_code` doesn't conflict with:
  - `trigger_generate_investor_code` (for investors)
  - `trigger_generate_cs_code` (for CS users)
- ✅ Multiple triggers can coexist on the same table - they all fire independently

### 4. **Data Updates - Safe**
```sql
-- Only affects mentors without codes
WHERE role = 'Mentor' AND (mentor_code IS NULL OR mentor_code = '')
```
- ✅ Only updates mentors who don't have codes
- ✅ Won't overwrite existing codes
- ✅ Only affects users with role = 'Mentor'

---

## 🔍 **Potential Interactions**

### **Multiple Triggers on Users Table**
The `users` table may have multiple triggers:
- `trigger_generate_investor_code` (for Investor role)
- `trigger_generate_cs_code` (for CS role)
- `trigger_set_mentor_code` (for Mentor role) ← **NEW**

**Impact:** ✅ **SAFE**
- Each trigger only acts on its specific role
- Triggers fire independently and don't interfere with each other
- PostgreSQL handles multiple triggers correctly

### **Function Name Conflicts**
**Existing Functions:**
- `generate_investor_code()` - returns TRIGGER (different signature)
- `generate_cs_code()` - returns VARCHAR(20)
- `generate_mentor_code()` - returns VARCHAR(10) ← **NEW**

**Impact:** ✅ **SAFE**
- Different function signatures (return types)
- PostgreSQL allows function overloading
- Even if names were similar, signatures differ

---

## 📊 **What Gets Modified**

### **New Additions (No Deletions)**
1. ✅ New column: `mentor_code` in `users` table
2. ✅ New functions: 3 mentor-specific functions
3. ✅ New trigger: `trigger_set_mentor_code`
4. ✅ Data updates: Only for mentors without codes

### **What Stays Unchanged**
- ✅ All existing columns
- ✅ All existing functions (except if same name - but names are unique)
- ✅ All existing triggers (different names)
- ✅ All existing data (only adds codes, doesn't modify)
- ✅ All other user roles (Investor, CS, CA, Startup, etc.)

---

## ⚠️ **Minor Considerations**

### 1. **VARCHAR(10) Length**
The code format is `MEN-XXXXXX` (10 characters):
- ✅ Format: `MEN-` (4 chars) + 6 random chars = 10 chars total
- ✅ Column size is correct

### 2. **UNIQUE Constraint**
- ✅ Prevents duplicate codes
- ✅ Allows NULL values (multiple NULLs are allowed in UNIQUE constraints)
- ✅ Only enforces uniqueness for non-NULL values

### 3. **Trigger Execution Order**
- ✅ Trigger fires BEFORE INSERT/UPDATE
- ✅ Only runs for Mentor role
- ✅ Doesn't block other triggers

---

## 🧪 **Testing Recommendations**

Before running in production, you can test:

```sql
-- 1. Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'mentor_code';

-- 2. Check existing triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 3. Check existing functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%mentor%' OR routine_name LIKE '%code%';
```

---

## ✅ **Final Verdict**

**SAFE TO RUN** ✅

- No destructive operations
- No data loss risk
- No breaking changes to existing code
- Uses safe patterns (IF NOT EXISTS, CREATE OR REPLACE, DROP IF EXISTS)
- Unique names prevent conflicts
- Only affects Mentor role users
- Can be run multiple times safely (idempotent)

---

## 📝 **Rollback Plan (If Needed)**

If you need to remove the mentor code system:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_set_mentor_code ON users;

-- Remove functions
DROP FUNCTION IF EXISTS set_mentor_code();
DROP FUNCTION IF EXISTS assign_mentor_code(UUID);
DROP FUNCTION IF EXISTS generate_mentor_code();

-- Remove column (optional - keeps data)
-- ALTER TABLE users DROP COLUMN IF EXISTS mentor_code;
```

---

**Conclusion:** This script is production-safe and follows PostgreSQL best practices. It will not affect any existing code or functionality.

