# Step-by-Step Migration Plan

## Phase 1: Run Ready Scripts (6 functions) - START HERE

### Step 1.1: Remove Fallback
- [ ] Run: `MIGRATE_ACCEPT_STARTUP_ADVISOR_REQUEST_FUNCTION.sql`
- [ ] Test: Verify function still works
- [ ] Status: ⚠️ → ✅

### Step 1.2: Migrate High Priority Functions
- [ ] Run: `MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql`
- [ ] Test: Verify advisor clients display correctly
- [ ] Run: `MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql`
- [ ] Test: Verify advisor investors display correctly
- [ ] Run: `MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql`
- [ ] Test: Verify co-investment opportunities display
- [ ] Run: `MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql`
- [ ] Test: Verify center lookup works
- [ ] Run: `MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql`
- [ ] Test: Verify user opportunities display

**After Phase 1:** 16 functions migrated ✅

---

## Phase 2: Create Scripts for Remaining Functions (25 functions)

We'll create migration scripts one by one, starting with the most important ones.

---

## Migration Order (Priority)

1. **Frequently Used Functions** (Do First)
2. **Code Generation Functions** (Do Second)
3. **Utility Functions** (Do Third)
4. **Test Functions** (Do Last)



