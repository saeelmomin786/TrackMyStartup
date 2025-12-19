# Complete Migration Audit Results

## Summary

The audit found significant remaining references to the `users` table. Here's what needs to be migrated:

### 📊 Counts

- **22 Functions** still using `users` table
- **2 Views** still using `users` table  
- **41 Foreign Keys** still pointing to `users` table
- **Many Triggers** (mostly FK constraint triggers - will auto-update when FKs are migrated)

---

## Priority 1: Critical Functions (Investment Flow)

### ✅ Already Migrated (Working)
- `create_investment_offer_with_fee` ✅
- `create_co_investment_offer` ✅
- `approve_startup_offer` ✅
- `approve_investor_advisor_offer` ✅ (no user lookup needed)
- `approve_startup_advisor_offer` ✅ (no user lookup needed)

### ⚠️ Needs Migration (Still Using `users`)
1. `accept_investment_offer_with_fee` - Used when accepting offers
2. `get_offers_for_investment_advisor` - Used for advisor dashboard
3. `should_reveal_contact_details` - Used for contact details logic
4. `set_advisor_offer_visibility` - Used for advisor visibility

---

## Priority 2: Important Functions (Still Using `users`)

5. `get_all_co_investment_opportunities`
6. `get_co_investment_opportunities_for_user`
7. `get_user_role` - Used frequently
8. `get_current_profile_safe` - Used for profile checks
9. `get_user_public_info` - Used for public profiles
10. `get_due_diligence_requests_for_startup`
11. `get_investor_recommendations`
12. `get_startup_by_user_email`

---

## Priority 3: Utility/Helper Functions

13. `create_existing_investment_advisor_relationships`
14. `create_missing_offers`
15. `create_missing_relationships`
16. `generate_ca_code`
17. `generate_cs_code`
18. `get_applications_with_codes`
19. `get_opportunities_with_codes`
20. `safe_delete_startup_user`
21. `simple_deletion_test`
22. `simple_test_startup_user_deletion`

---

## Views (2)

1. `user_center_info` - Needs migration
2. `v_incubation_opportunities` - Needs migration

---

## Foreign Keys (41 Total)

These need to be converted from foreign keys to indexes (since `user_profiles.auth_user_id` is not unique per role).

### Key Tables with FKs to `users`:

**Investment Related:**
- `investment_advisor_relationships` (investor_id, investment_advisor_id)
- `investment_advisor_recommendations` (investor_id, investment_advisor_id)
- `investment_advisor_commissions` (investor_id, investment_advisor_id)
- `investment_advisor_offer_visibility` (advisor_id)
- `investor_favorites` (investor_id)
- `co_investment_approvals` (investor_id, advisor_id)
- `co_investment_interests` (interested_user_id, user_id)
- `co_investment_opportunities` (listed_by_user_id)
- `contact_details_access` (user_id)

**Facilitator/CS/CA Related:**
- `ca_assignments` (ca_code)
- `ca_assignment_requests` (ca_code)
- `cs_assignments` (cs_code)
- `cs_assignment_requests` (cs_code)
- `compliance_access` (facilitator_id)
- `facilitator_access` (facilitator_id)
- `facilitator_startups` (facilitator_id)

**Other Important:**
- `advisor_startup_link_requests` (advisor_id, startup_user_id)
- `evaluators` (user_id, created_by)
- `payment_logs` (user_id)
- `payment_transactions` (user_id)
- `user_submitted_compliances` (submitted_by_user_id, reviewed_by_user_id)
- `user_subscriptions` (user_id)

... and many more

---

## Triggers

Most triggers are just `RI_ConstraintTrigger` (foreign key constraint triggers) that PostgreSQL creates automatically. These will be automatically updated when we migrate the foreign keys.

Custom triggers that reference `users`:
- `auto_generate_facilitator_id`
- `trigger_generate_ca_code`
- `trigger_generate_cs_code`
- `trigger_generate_investor_code`
- `trigger_set_investment_advisor_code`
- `trigger_set_mentor_code`
- `update_users_updated_at`

---

## Migration Strategy

### Phase 1: Critical Functions (Do First)
Migrate functions that affect the investment offer flow:
1. `accept_investment_offer_with_fee`
2. `get_offers_for_investment_advisor`
3. `should_reveal_contact_details`
4. `set_advisor_offer_visibility`

### Phase 2: Frequently Used Functions
Migrate functions used throughout the app:
5. `get_user_role`
6. `get_current_profile_safe`
7. `get_user_public_info`
8. `get_all_co_investment_opportunities`
9. `get_co_investment_opportunities_for_user`

### Phase 3: Foreign Keys
Convert all foreign keys to indexes (similar to what we did for `investment_offers`).

### Phase 4: Views
Migrate the 2 views.

### Phase 5: Remaining Functions
Migrate utility/helper functions.

---

## Next Steps

1. **Start with Priority 1 functions** - These affect the core investment flow
2. **Then Priority 2** - These are used frequently
3. **Then Foreign Keys** - This is a big job but can be done systematically
4. **Then Views and remaining functions**

Would you like me to start with Priority 1 functions?


