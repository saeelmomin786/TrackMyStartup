# 🗑️ Safe Table Cleanup Guide

## ⚠️ **IMPORTANT: Table Deletion is More Risky**

Unlike indexes and functions, deleting tables:
- ✅ **Removes data permanently** (unless you backup first)
- ✅ **Can break applications** if they reference the table
- ✅ **Can break other tables** if they have foreign keys to it
- ✅ **Cannot be easily undone** (unless you have a backup)

**⚠️ Always backup and verify before deleting tables!**

---

## 🔍 **Step 1: Identify Unused Tables**

Run `ANALYZE_UNUSED_TABLES.sql` to see:
- Tables with zero activity
- Tables with very low activity
- Tables that are referenced by other tables
- All tables with activity summary

---

## ✅ **Safe Candidates for Deletion**

### **Category 1: Empty Tables with No Activity (Safest)**
- ✅ `n_live_tup = 0` (no rows)
- ✅ `n_tup_ins = 0` (never inserted)
- ✅ `n_tup_upd = 0` (never updated)
- ✅ `n_tup_del = 0` (never deleted)
- ✅ Not referenced by other tables

**Example:** Test tables, old migration tables, abandoned feature tables

### **Category 2: Empty Tables with Minimal Activity (Review)**
- ⚠️ `n_live_tup = 0` (empty now)
- ⚠️ Some historical activity (but currently unused)
- ⚠️ Check if referenced by other tables

---

## ⚠️ **Unsafe to Delete**

### **Tables to NEVER Delete:**
- ❌ Tables referenced by foreign keys
- ❌ Tables used by views
- ❌ Tables used by functions
- ❌ Tables with data (even if inactive)
- ❌ Core application tables

### **Before Deleting, Check:**
1. ✅ No foreign key references (use `ANALYZE_TABLE_DEPENDENCIES.sql`)
2. ✅ No views using it
3. ✅ No functions using it
4. ✅ Empty (no data)
5. ✅ No recent activity
6. ✅ Not critical to application

---

## 📋 **Safe Cleanup Process**

### **Step 1: Run Analysis**
```sql
-- Run: ANALYZE_UNUSED_TABLES.sql
```
Review the results - focus on:
- Empty tables with zero activity
- Check if they're referenced

### **Step 2: Check Dependencies (For Each Candidate Table)**
```sql
-- Run: ANALYZE_TABLE_DEPENDENCIES.sql
-- Replace 'YOUR_TABLE_NAME_HERE' with actual table name
```
Verify:
- No foreign keys pointing to it
- No views using it
- No functions using it

### **Step 3: Backup (REQUIRED)**
```sql
-- Create backup before deletion
CREATE TABLE backup_table_name AS SELECT * FROM table_name;
```

### **Step 4: Delete (After Verification)**
```sql
-- Only after all checks pass
DROP TABLE IF EXISTS table_name CASCADE;
```

---

## 🎯 **Common Unused Tables to Look For**

### **Test/Debug Tables:**
- `test_*`
- `debug_*`
- `temp_*`
- `tmp_*`

### **Old Migration Tables:**
- `_old`
- `_backup`
- `_migration_*`

### **Deprecated Feature Tables:**
- Tables for features that were removed
- Legacy tables from old versions

---

## 📊 **Example Safe Deletion**

```sql
-- Example: Safe to delete empty test table

-- Step 1: Verify it's empty
SELECT COUNT(*) FROM test_table_name;  -- Should be 0

-- Step 2: Check activity
-- (Run ANALYZE_UNUSED_TABLES.sql - should show 0 activity)

-- Step 3: Check dependencies
-- (Run ANALYZE_TABLE_DEPENDENCIES.sql - should show no references)

-- Step 4: Create backup (just in case)
CREATE TABLE backup_test_table_name AS SELECT * FROM test_table_name;

-- Step 5: Delete
DROP TABLE IF EXISTS test_table_name CASCADE;
```

---

## ⚠️ **Red Flags - DO NOT DELETE**

- ⚠️ Table has foreign keys pointing to it
- ⚠️ Table is used in views
- ⚠️ Table is used in functions
- ⚠️ Table has data (even if old)
- ⚠️ Table name suggests it's important
- ⚠️ Table is part of core functionality

---

## 🎯 **Recommendation**

1. **Start with analysis** - Run `ANALYZE_UNUSED_TABLES.sql`
2. **Focus on empty tables** - Safest candidates
3. **Check dependencies** - Use `ANALYZE_TABLE_DEPENDENCIES.sql`
4. **Backup first** - Always create backup
5. **Delete one at a time** - Test after each deletion
6. **Monitor application** - Ensure nothing breaks

---

## ✅ **Safe Cleanup Checklist**

Before deleting any table:

- [ ] Table is empty (`n_live_tup = 0`)
- [ ] Zero activity (no inserts/updates/deletes)
- [ ] No foreign key references
- [ ] No views using it
- [ ] No functions using it
- [ ] Backup created
- [ ] Dependencies verified
- [ ] Application tested after deletion

**Ready to start? Run the analysis scripts first!** 🔍











