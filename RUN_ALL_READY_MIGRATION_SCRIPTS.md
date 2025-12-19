# Run All Ready Migration Scripts

## ✅ Ready to Run (13 Scripts Total)

### Phase 1 Scripts (7 scripts - Already run ✅)
These were already executed successfully:
1. ✅ `MIGRATE_ACCEPT_STARTUP_ADVISOR_REQUEST_FUNCTION.sql`
2. ✅ `MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql`
3. ✅ `MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql`
4. ✅ `MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql`
5. ✅ `MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql`
6. ✅ `MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql`
7. ✅ `MIGRATE_GET_STARTUP_BY_USER_EMAIL_FUNCTION.sql`

---

### Phase 2 Scripts (6 scripts - Ready to Run Now)

Run these in Supabase SQL Editor, one by one:

#### 1. `MIGRATE_SET_ADVISOR_OFFER_VISIBILITY_FUNCTION.sql`
**Function:** `set_advisor_offer_visibility`
**What it does:** Sets visibility for investment advisors on offers
**Test:** Verify advisor offer visibility works correctly

---

#### 2. `MIGRATE_GET_DUE_DILIGENCE_REQUESTS_FOR_STARTUP_FUNCTION.sql`
**Function:** `get_due_diligence_requests_for_startup`
**What it does:** Returns due diligence requests for a startup
**Test:** Check if due diligence requests display correctly

---

#### 3. `MIGRATE_GET_INVESTOR_RECOMMENDATIONS_FUNCTION.sql`
**Function:** `get_investor_recommendations`
**What it does:** Returns investment recommendations for an investor
**Test:** Verify investor recommendations display correctly

---

#### 4. `MIGRATE_GET_INVESTMENT_ADVISOR_INVESTORS_FUNCTION.sql`
**Function:** `get_investment_advisor_investors`
**What it does:** Returns all investors for an investment advisor
**Test:** Check if advisor dashboard shows investors correctly

---

#### 5. `MIGRATE_GET_INVESTMENT_ADVISOR_STARTUPS_FUNCTION.sql`
**Function:** `get_investment_advisor_startups`
**What it does:** Returns all startups for an investment advisor
**Test:** Check if advisor dashboard shows startups correctly

---

#### 6. `MIGRATE_GET_USER_PROFILE_FUNCTION.sql`
**Function:** `get_user_profile`
**What it does:** Returns user profile data
**Test:** Verify user profile retrieval works correctly

---

## 📋 Execution Steps

1. Open Supabase SQL Editor
2. Open the first script file
3. Copy entire script
4. Paste into SQL Editor
5. Click "Run"
6. Verify success message (✅)
7. Test the function (if applicable)
8. Move to next script
9. Repeat for all 6 scripts

---

## ✅ After Running All Scripts

**Result:** 19 functions migrated ✅
- 7 functions (Phase 1 - already done)
- 6 functions (Phase 2 - just run)
- 6 functions (previously migrated)

**Next:** Continue creating scripts for remaining 17 functions

---

## 🎯 Quick Checklist

- [ ] Run `MIGRATE_SET_ADVISOR_OFFER_VISIBILITY_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_DUE_DILIGENCE_REQUESTS_FOR_STARTUP_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_INVESTOR_RECOMMENDATIONS_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_INVESTMENT_ADVISOR_INVESTORS_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_INVESTMENT_ADVISOR_STARTUPS_FUNCTION.sql`
- [ ] Run `MIGRATE_GET_USER_PROFILE_FUNCTION.sql`

---

## 📝 Notes

- All scripts are safe (function signatures unchanged)
- Run one at a time
- Test after each migration
- If any script fails, check the error message
- Can rollback if needed (DROP FUNCTION and recreate)


