# Execute Migration Step-by-Step

## 🎯 Phase 1: Run 7 Ready Scripts (Do This First)

### Step 1.1: Run `accept_startup_advisor_request` Migration
**File:** `MIGRATE_ACCEPT_STARTUP_ADVISOR_REQUEST_FUNCTION.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function accept_startup_advisor_request() migrated to use user_profiles only (NO FALLBACK - OPTIMIZED)`

**Test:**
- Try accepting an advisor request in the frontend
- Verify it still works

**Status:** ⏳ Ready to run

---

### Step 1.2: Run `get_advisor_clients` Migration
**File:** `MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function get_advisor_clients() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)`

**Test:**
- Check if advisor dashboard shows clients correctly
- Verify data is displayed

**Status:** ⏳ Ready to run

---

### Step 1.3: Run `get_advisor_investors` Migration
**File:** `MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function get_advisor_investors() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)`

**Test:**
- Check if advisor dashboard shows investors correctly
- Verify data is displayed

**Status:** ⏳ Ready to run

---

### Step 1.4: Run `get_all_co_investment_opportunities` Migration
**File:** `MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function get_all_co_investment_opportunities() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)`

**Test:**
- Check if co-investment opportunities display correctly
- Verify data is displayed

**Status:** ⏳ Ready to run

---

### Step 1.5: Run `get_center_by_user_email` Migration
**File:** `MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function get_center_by_user_email() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)`

**Test:**
- Check if center lookup works (if used in frontend)
- Verify data is returned correctly

**Status:** ⏳ Ready to run

---

### Step 1.6: Run `get_co_investment_opportunities_for_user` Migration
**File:** `MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function get_co_investment_opportunities_for_user() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)`

**Test:**
- Check if user co-investment opportunities display correctly
- Verify data is displayed

**Status:** ⏳ Ready to run

---

### Step 1.7: Run `get_startup_by_user_email` Migration
**File:** `MIGRATE_GET_STARTUP_BY_USER_EMAIL_FUNCTION.sql`

**Action:**
1. Open Supabase SQL Editor
2. Copy and paste the entire script
3. Click "Run"
4. Verify you see: `✅ Function get_startup_by_user_email() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)`

**Test:**
- Check if startup lookup by email works (if used in frontend)
- Verify data is returned correctly

**Status:** ⏳ Ready to run

---

## ✅ After Phase 1 Complete

**Result:** 17 functions migrated ✅ (10 already done + 7 from Phase 1)

**Next:** Continue with Phase 2 - Create scripts for remaining 23 functions

---

## 📝 Notes

- Run scripts one at a time
- Test after each migration
- If any script fails, check the error message
- All scripts are safe (function signatures unchanged)
- Can rollback if needed (DROP FUNCTION and recreate)


