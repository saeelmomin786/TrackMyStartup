# Migration Scope and Priority

## Database Statistics

- **127 Tables** total
- **261 Functions** total
- **11 Views** total
- **40 Foreign Keys** pointing to `users` table
- **22 Functions** using `users` table (from previous audit)
- **2 Views** using `users` table (from previous audit)

---

## Migration Priority Order

### Phase 1: Critical Functions (Investment Flow) - START HERE
**Status:** Some already migrated ✅

1. ✅ `create_investment_offer_with_fee` - Already migrated
2. ✅ `create_co_investment_offer` - Already migrated
3. ✅ `approve_startup_offer` - Already migrated
4. ❌ `accept_investment_offer_with_fee` - **NEEDS MIGRATION**
5. ❌ `get_offers_for_investment_advisor` - **NEEDS MIGRATION**
6. ❌ `should_reveal_contact_details` - **NEEDS MIGRATION**
7. ❌ `set_advisor_offer_visibility` - **NEEDS MIGRATION**

### Phase 2: Frequently Used Functions
8. ❌ `get_user_role`
9. ❌ `get_current_profile_safe`
10. ❌ `get_user_public_info`
11. ❌ `get_all_co_investment_opportunities`
12. ❌ `get_co_investment_opportunities_for_user`
13. ❌ `get_investor_recommendations`
14. ❌ `get_due_diligence_requests_for_startup`
15. ❌ `get_startup_by_user_email`

### Phase 3: Remaining Functions (15 more)
16-30. (Other utility/helper functions)

### Phase 4: Foreign Keys (40 total)
**Strategy:** Group by related tables, migrate in batches

**Investment Related (Priority):**
- `investment_advisor_relationships` (2 FKs)
- `investment_advisor_recommendations` (2 FKs)
- `investment_advisor_commissions` (2 FKs)
- `co_investment_approvals` (2 FKs)
- `co_investment_interests` (2 FKs)
- `co_investment_opportunities` (1 FK)
- `investor_favorites` (1 FK)
- `contact_details_access` (1 FK)

**Other Important:**
- `advisor_startup_link_requests` (2 FKs)
- `payment_logs`, `payment_transactions` (multiple FKs)
- `user_submitted_compliances` (2 FKs)
- ... and more

### Phase 5: Views (2 total)
1. ❌ `user_center_info`
2. ❌ `v_incubation_opportunities`

---

## Next Steps

**Start with Phase 1, Functions 4-7:**
1. Create migration script for `accept_investment_offer_with_fee`
2. Create migration script for `get_offers_for_investment_advisor`
3. Create migration script for `should_reveal_contact_details`
4. Create migration script for `set_advisor_offer_visibility`

Then proceed phase by phase.



