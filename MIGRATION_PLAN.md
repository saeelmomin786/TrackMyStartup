# Complete Migration Plan: users → user_profiles

## Goal
Migrate ALL references from `public.users` table to `public.user_profiles` table so we can eventually DELETE the `users` table.

---

## Phase 1: Complete Inventory ✅

**Run:** `COMPREHENSIVE_DATABASE_INVENTORY.sql`

This will give us:
- ✅ All tables in public schema
- ✅ All functions and their reference status (uses users vs user_profiles)
- ✅ All views and their reference status
- ✅ All foreign keys pointing to users table
- ✅ Summary counts

---

## Phase 2: Migration Strategy

### Step 1: Foreign Keys Migration
**Approach:** Convert FKs to indexes (like we did for `investment_offers`)
- Drop foreign key constraints pointing to `users`
- Create indexes on those columns for performance
- Update application logic to handle referential integrity manually

**Tables with FKs to users (from audit):**
- `investment_advisor_relationships`
- `investment_advisor_recommendations`
- `co_investment_approvals`
- `co_investment_interests`
- `co_investment_opportunities`
- `contact_details_access`
- `investor_favorites`
- `advisor_startup_link_requests`
- ... and 33 more

### Step 2: Functions Migration
**Priority order:**
1. **Critical investment flow functions** (already done: create functions)
2. **Frequently used functions** (get_user_role, get_current_profile_safe, etc.)
3. **Utility functions** (generate codes, helper functions)
4. **Admin/maintenance functions** (deletion, cleanup, etc.)

### Step 3: Views Migration
- Update view definitions to use `user_profiles`
- Test each view after migration

### Step 4: RLS Policies Migration
- Update all RLS policies to use `user_profiles` instead of `users`
- Test access control after each migration

---

## Phase 3: Execution Plan

### Week 1: Critical Functions
- [ ] `accept_investment_offer_with_fee`
- [ ] `get_offers_for_investment_advisor`
- [ ] `should_reveal_contact_details`
- [ ] `set_advisor_offer_visibility`

### Week 2: Frequently Used Functions
- [ ] `get_user_role`
- [ ] `get_current_profile_safe`
- [ ] `get_user_public_info`
- [ ] `get_all_co_investment_opportunities`
- [ ] `get_co_investment_opportunities_for_user`
- [ ] `get_investor_recommendations`

### Week 3: Foreign Keys Migration (Batch 1 - Investment Related)
- [ ] Investment advisor tables
- [ ] Co-investment tables
- [ ] Investor-related tables

### Week 4: Foreign Keys Migration (Batch 2 - Other Tables)
- [ ] Facilitator/CS/CA tables
- [ ] Payment tables
- [ ] Compliance tables
- [ ] Remaining tables

### Week 5: Views & Remaining Functions
- [ ] Migrate views
- [ ] Migrate remaining utility functions
- [ ] Final testing

### Week 6: Cleanup & Validation
- [ ] Verify no references to `users` table
- [ ] Update all RLS policies
- [ ] Test complete system
- [ ] Delete `users` table (if desired)

---

## Migration Pattern for Functions

### Pattern 1: Simple User Lookup
**Before:**
```sql
SELECT * FROM public.users WHERE email = p_email;
```

**After:**
```sql
SELECT * FROM public.user_profiles 
WHERE email = p_email 
AND role = 'Investor'  -- or appropriate role
LIMIT 1;
```

### Pattern 2: JOIN with users
**Before:**
```sql
LEFT JOIN public.users u ON io.investor_id = u.id
```

**After:**
```sql
LEFT JOIN public.user_profiles u ON io.investor_id = u.auth_user_id 
AND u.role = 'Investor'  -- or appropriate role
```

### Pattern 3: Foreign Key Column
**Before:**
- Column: `investor_id` references `users(id)`

**After:**
- Column: `investor_id` (no FK, use index)
- Join using: `user_profiles.auth_user_id = investor_id AND role = 'Investor'`

---

## Testing Checklist

After each migration:
- [ ] Test the function/view/table in isolation
- [ ] Test with existing data
- [ ] Test with new data
- [ ] Test edge cases (missing users, multiple profiles, etc.)
- [ ] Verify RLS policies still work
- [ ] Check application logs for errors

---

## Rollback Plan

For each migration:
1. Keep old function/view as backup (rename with `_old` suffix)
2. Test new version thoroughly
3. If issues, revert to old version
4. Once stable, drop old version

---

## Notes

- `user_profiles.auth_user_id` is NOT unique (one user can have multiple profiles)
- Always filter by `role` when joining with `user_profiles`
- Some tables might need to store `profile_id` instead of `auth_user_id` if they need to track specific profiles
- Most tables can continue using `auth_user_id` and join with `user_profiles` filtering by role

