# Migration Status and Next Steps

## Database Scope Summary

- **127 Tables** total
- **261 Functions** total  
- **11 Views** total
- **40 Foreign Keys** pointing to `users` table
- **22 Functions** using `users` table
- **2 Views** using `users` table

---

## ✅ Completed Migrations (Investment Flow)

### Functions Already Migrated:
1. ✅ `create_investment_offer_with_fee` - Uses `user_profiles`
2. ✅ `create_co_investment_offer` - Uses `user_profiles`
3. ✅ `approve_startup_offer` - Uses `user_profiles`
4. ✅ `approve_investor_advisor_offer` - No user lookup needed
5. ✅ `approve_startup_advisor_offer` - No user lookup needed

### Functions Migration Scripts Created (Ready to Run):
6. ✅ `MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql` - Ready!
7. ✅ `MIGRATE_GET_OFFERS_FOR_ADVISOR_FUNCTION.sql` - Ready!
8. ✅ `MIGRATE_SHOULD_REVEAL_CONTACT_DETAILS_FUNCTION.sql` - Ready!

### Functions Still Needing Migration Scripts:
9. ❌ `set_advisor_offer_visibility` - Need to create script

---

## 📋 Remaining Work

### Phase 1: Complete Critical Functions (1 more)
- [ ] Create migration script for `set_advisor_offer_visibility`
- [ ] Run all 4 critical function migrations
- [ ] Test investment flow end-to-end

### Phase 2: Frequently Used Functions (15 more)
- [ ] `get_user_role`
- [ ] `get_current_profile_safe`
- [ ] `get_user_public_info`
- [ ] `get_all_co_investment_opportunities`
- [ ] `get_co_investment_opportunities_for_user`
- [ ] ... and 10 more

### Phase 3: Foreign Keys (40 total)
- [ ] Convert FKs to indexes (batch by related tables)
- [ ] Test referential integrity

### Phase 4: Views (2 total)
- [ ] `user_center_info`
- [ ] `v_incubation_opportunities`

### Phase 5: Remaining Functions (6 more)
- Utility/helper functions

---

## Next Immediate Steps

1. **Run the 3 migration scripts created:**
   - `MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql`
   - `MIGRATE_GET_OFFERS_FOR_ADVISOR_FUNCTION.sql`
   - `MIGRATE_SHOULD_REVEAL_CONTACT_DETAILS_FUNCTION.sql`

2. **Find and migrate `set_advisor_offer_visibility` function**

3. **Test the investment flow** after running these 4 scripts

4. **Then proceed to Phase 2** (frequently used functions)

---

## Migration Scripts Created

✅ `MIGRATE_ACCEPT_INVESTMENT_OFFER_FUNCTION.sql`
✅ `MIGRATE_GET_OFFERS_FOR_ADVISOR_FUNCTION.sql`
✅ `MIGRATE_SHOULD_REVEAL_CONTACT_DETAILS_FUNCTION.sql`

**Ready to execute!**

