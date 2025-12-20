# Full Migration Plan - OPTIMIZED (No Fallbacks)

## Goal
✅ **Complete migration to `user_profiles` table ONLY**
✅ **Remove ALL fallbacks to `users` table**
✅ **Optimize for large user bases**
✅ **Prepare for deletion of `users` table**

---

## Strategy

1. **No Fallbacks** - All functions query `user_profiles` only
2. **Optimized Queries** - Single table queries, proper indexes
3. **Clean Code** - No conditional logic, no IF statements for fallbacks
4. **Performance First** - Every query optimized for scalability

---

## Migration Checklist

### ✅ Already Migrated (Verify NO fallbacks):
- [x] `get_user_role()` - Check for fallback
- [x] `get_current_profile_safe()` - Check for fallback
- [x] `get_user_public_info()` - Check for fallback

### 🔄 Need to Migrate (NO fallbacks):
- [ ] `get_co_investment_opportunities_for_user`
- [ ] `get_all_co_investment_opportunities`
- [ ] `get_investor_recommendations`
- [ ] `get_due_diligence_requests_for_startup`
- [ ] `get_startup_by_user_email`
- [ ] `get_advisor_clients`
- [ ] All other functions referencing `users` table

### 🔧 Database Objects:
- [ ] 40 Foreign Keys → Convert to indexes
- [ ] 2 Views → Migrate to use `user_profiles`
- [ ] RLS Policies → Already done ✅

---

## Principles for All Migrations

1. **Single Source of Truth**: `user_profiles` table only
2. **No Conditionals**: No IF statements for fallback
3. **Proper Indexes**: Use `auth_user_id` indexes
4. **Most Recent Profile**: If multiple profiles, use `ORDER BY created_at DESC LIMIT 1`
5. **Performance**: Optimize every query

---

## After Migration

Once ALL migrations complete:
1. Verify all functions work
2. Delete `users` table
3. Update documentation



