# SQL Queries Safety Analysis & Execution Guide

## ✅ **ALL QUERIES ARE SAFE - They will NOT affect existing functionality**

## Safety Analysis

### 1. CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql
**Status**: ✅ **SAFE**
- Creates NEW table only (`CREATE TABLE IF NOT EXISTS`)
- Uses `IF NOT EXISTS` for all indexes and policies
- No modifications to existing tables
- No functions/triggers created or modified
- **Impact**: None on existing functionality

### 2. ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql
**Status**: ✅ **SAFE** (only if table exists)
- Adds column with `ADD COLUMN IF NOT EXISTS`
- Uses `ON DELETE SET NULL` (safe foreign key)
- Creates index with `IF NOT EXISTS`
- **Impact**: None on existing functionality
- **Note**: Will fail gracefully if table doesn't exist (error message only)

### 3. UPDATE_MENTOR_EQUITY_MAKE_AGREEMENT_OPTIONAL.sql
**Status**: ✅ **SAFE** (only if table exists)
- Makes column nullable (`DROP NOT NULL`)
- Safe operation - doesn't delete data
- **Impact**: None on existing functionality
- **Note**: Will fail if table doesn't exist or column doesn't have NOT NULL constraint

## Which Queries to Run?

### **Scenario 1: Fresh Installation (Table doesn't exist yet)**
**Run ONLY:**
```sql
CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql
```
**Why**: This creates everything from scratch including:
- Table with all columns (including `request_id` and nullable `signed_agreement_url`)
- All indexes
- All RLS policies

**Do NOT run:**
- ❌ ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql (column already included)
- ❌ UPDATE_MENTOR_EQUITY_MAKE_AGREEMENT_OPTIONAL.sql (already nullable)

---

### **Scenario 2: Table Already Exists (from previous installation)**
**Run in this order:**

**Step 1:** Check if table exists
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mentor_equity_records'
);
```

**Step 2A:** If table exists BUT `request_id` column is missing:
```sql
ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql
```

**Step 2B:** If table exists AND `signed_agreement_url` has NOT NULL constraint:
```sql
UPDATE_MENTOR_EQUITY_MAKE_AGREEMENT_OPTIONAL.sql
```

**Step 2C:** If table exists but missing RLS policies:
```sql
-- Run only the RLS policy sections from CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql
-- (Lines 36-135)
```

---

## Recommended Execution Strategy

### **Option A: Safe Approach (Recommended)**
Run queries one by one and check for errors:

```sql
-- Step 1: Create table (safe - won't overwrite if exists)
-- Run: CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql

-- Step 2: Check if request_id column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'mentor_equity_records' 
AND column_name = 'request_id';

-- Step 3: If column doesn't exist, add it
-- Run: ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql

-- Step 4: Check if signed_agreement_url is nullable
SELECT is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mentor_equity_records' 
AND column_name = 'signed_agreement_url';

-- Step 5: If NOT NULL, make it nullable
-- Run: UPDATE_MENTOR_EQUITY_MAKE_AGREEMENT_OPTIONAL.sql
```

### **Option B: All-in-One Approach**
If you're sure the table doesn't exist, just run:
```sql
CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql
```

---

## Dependencies Check

Before running, ensure these tables exist:
- ✅ `public.startups` (required - referenced by foreign key)
- ✅ `public.mentor_requests` (required - referenced by request_id)
- ✅ `public.users` (required - used in RLS policies)

**Check dependencies:**
```sql
-- Check if required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('startups', 'mentor_requests', 'users');
```

---

## Verification After Execution

After running queries, verify success:

```sql
-- 1. Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'mentor_equity_records';

-- 2. Check all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mentor_equity_records'
ORDER BY ordinal_position;

-- 3. Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'mentor_equity_records';

-- 4. Check RLS policies exist
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'mentor_equity_records';
```

---

## What These Queries Do NOT Affect

✅ **Existing Tables**: No modifications to any existing tables
✅ **Existing Functions**: No functions created, modified, or dropped
✅ **Existing Triggers**: No triggers created, modified, or dropped
✅ **Existing Data**: No data is deleted or modified
✅ **Existing RLS Policies**: No existing policies are modified
✅ **Existing Indexes**: No existing indexes are modified

---

## Error Handling

All queries use safe patterns:
- `CREATE TABLE IF NOT EXISTS` - Won't fail if table exists
- `ADD COLUMN IF NOT EXISTS` - Won't fail if column exists
- `CREATE INDEX IF NOT EXISTS` - Won't fail if index exists
- `CREATE POLICY` with DO block - Checks if policy exists first

**If you get errors:**
- Table already exists → Safe, skip CREATE TABLE
- Column already exists → Safe, skip ADD COLUMN
- Index already exists → Safe, skip CREATE INDEX
- Policy already exists → Safe, skip CREATE POLICY

---

## Final Recommendation

**For Most Users:**
1. Run `CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql` first
2. If you get "table already exists" error, then run:
   - `ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql` (if request_id missing)
   - `UPDATE_MENTOR_EQUITY_MAKE_AGREEMENT_OPTIONAL.sql` (if agreement is NOT NULL)

**All queries are safe to run multiple times** - they use `IF NOT EXISTS` patterns.














