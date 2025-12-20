# Complete Migration Checklist - OPTIMIZED (No Fallbacks)

## ✅ Verified: Already Migrated Functions (NO FALLBACKS)

1. ✅ `get_user_role()` - ✅ NO FALLBACK - Uses `user_profiles` only
2. ✅ `get_current_profile_safe()` - ✅ NO FALLBACK - Uses `user_profiles` only  
3. ✅ `get_user_public_info()` - ✅ NO FALLBACK - Uses `user_profiles` only
4. ✅ `accept_investment_offer_with_fee()` - ✅ Already migrated
5. ✅ `get_offers_for_investment_advisor()` - ✅ Already migrated
6. ✅ `should_reveal_contact_details()` - ✅ Already migrated

---

## 🔄 Need to Find and Migrate (NO FALLBACKS)

### Functions that likely use `users` table:
1. [ ] `get_co_investment_opportunities_for_user` - Uses `users` table (found in CO_INVESTMENT_OPPORTUNITIES_SCHEMA.sql)
2. [ ] `get_all_co_investment_opportunities` - Uses `users` table
3. [ ] `get_advisor_clients` - Uses `users` table
4. [ ] `get_investor_recommendations` - Need to check
5. [ ] `get_due_diligence_requests_for_startup` - Need to check
6. [ ] `get_startup_by_user_email` - Need to check
7. [ ] `set_advisor_offer_visibility` - Need to check
8. [ ] Any other functions found in database audit

---

## 📋 Migration Principles (MUST FOLLOW)

For EVERY function migration:
1. ✅ **NO FALLBACKS** - Only query `user_profiles` table
2. ✅ **USE `auth_user_id`** - Match on `auth_user_id` not `id`
3. ✅ **MOST RECENT PROFILE** - If multiple profiles: `ORDER BY created_at DESC LIMIT 1`
4. ✅ **OPTIMIZE** - Single query, proper indexes
5. ✅ **NO IF STATEMENTS** - No conditional fallback logic
6. ✅ **CLEAN CODE** - Simple, straightforward queries

---

## 🎯 Next Steps

1. Find ALL functions that reference `users` table
2. Create migration scripts for each (NO FALLBACKS)
3. Migrate them one by one
4. Test after each migration
5. Continue until ALL functions migrated
6. Then handle Foreign Keys and Views
7. Finally, delete `users` table

---

## Status

**Current Progress:** 6/22+ functions migrated ✅
**Remaining:** ~16+ functions + 40 FKs + 2 Views



