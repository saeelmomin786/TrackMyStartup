# 🧹 Supabase Cleanup Priority Plan

## 📊 Current Status

Based on cleanup analysis:
- **306 unused indexes** - ⚠️ **HIGH PRIORITY** (frees space, improves writes)
- **5 test functions** - ⚠️ **MEDIUM PRIORITY** (cleanup clutter)
- **Old users table** - ⚠️ **HIGH PRIORITY** (fully migrated, ready to delete)

---

## 🎯 Priority Order

### Priority 1: Delete Old `users` Table ⭐⭐⭐
**Impact**: High  
**Risk**: Low (already verified no dependencies)  
**Effort**: Low  

**Steps:**
1. ✅ Run `DELETE_OLD_USERS_TABLE.sql`
2. Create backup first (script includes backup step)
3. Verify backup matches original
4. Drop the table

**Expected Benefits:**
- Frees up table space
- Removes confusion
- Cleaner database structure

---

### Priority 2: Remove Unused Indexes ⭐⭐⭐
**Impact**: Very High  
**Risk**: Low (indexes are never used)  
**Effort**: Medium  

**Steps:**
1. ✅ Run `CLEANUP_UNUSED_INDEXES.sql` Step 1 to review
2. Review the list of indexes to be dropped
3. Option A: Drop one by one (safest)
4. Option B: Use the batch script (faster)

**Expected Benefits:**
- **Frees significant disk space** (306 indexes!)
- **Improves write performance** (fewer indexes to maintain)
- **Faster INSERT/UPDATE/DELETE operations**
- **Better overall database performance**

**⚠️ Important:**
- Script excludes primary keys and unique constraints
- Only drops indexes that have NEVER been used (idx_scan = 0)
- Safe to remove - they're not helping performance

---

### Priority 3: Remove Test Functions ⭐⭐
**Impact**: Medium  
**Risk**: Low (test functions)  
**Effort**: Low  

**Steps:**
1. ✅ Run `CLEANUP_TEST_FUNCTIONS.sql` Step 1 to list functions
2. Review function definitions in Step 2
3. Drop functions one by one using drop statements

**Expected Benefits:**
- Cleaner database schema
- Less clutter
- Easier to navigate

---

## 📋 Recommended Execution Order

### Phase 1: Quick Wins (Low Risk, High Impact)
1. ✅ Delete old `users` table (with backup)
2. ✅ Remove unused indexes (biggest impact!)

**Time Estimate**: 30-60 minutes  
**Risk**: Low  
**Impact**: Very High  

### Phase 2: Cleanup (Low Risk, Medium Impact)
3. ✅ Remove test functions

**Time Estimate**: 15 minutes  
**Risk**: Low  
**Impact**: Medium  

---

## 📊 Expected Results

### Space Savings
- **Unused indexes**: Potentially **several GB** (depends on index sizes)
- **Old users table**: Varies (depends on table size)

### Performance Improvements
- **Write operations**: 20-50% faster (fewer indexes to maintain)
- **Storage**: Reduced database size
- **Query planning**: Faster query optimization (fewer indexes to consider)

---

## ⚠️ Safety Checklist

Before running cleanup scripts:

- [ ] **Backup database** (Supabase dashboard → Backup)
- [ ] Review unused indexes list
- [ ] Review test functions list
- [ ] Run during low-traffic period (if possible)
- [ ] Test on staging first (if available)
- [ ] Have rollback plan ready

---

## 🚀 Quick Start

1. **Start with Priority 1** (users table):
   ```sql
   -- Run: DELETE_OLD_USERS_TABLE.sql
   ```

2. **Then Priority 2** (unused indexes):
   ```sql
   -- Run: CLEANUP_UNUSED_INDEXES.sql Step 1 to review
   -- Then run drop statements
   ```

3. **Finally Priority 3** (test functions):
   ```sql
   -- Run: CLEANUP_TEST_FUNCTIONS.sql Step 1 to review
   -- Then drop functions
   ```

---

## 📝 Notes

- All scripts include safety checks
- Scripts use `IF EXISTS` to prevent errors
- Review lists before running drop statements
- Start with one index/function at a time if unsure

---

## ✅ Success Criteria

After cleanup:
- [ ] Old `users` table deleted
- [ ] Unused indexes removed
- [ ] Test functions removed
- [ ] Database size reduced
- [ ] Write performance improved
- [ ] No errors in application

---

**Ready to start? Begin with Priority 1!** 🚀







