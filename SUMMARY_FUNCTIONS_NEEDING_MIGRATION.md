# Functions Needing Migration - Detailed Analysis

## Functions That ONLY Use `users` Table (Need Migration)

Based on code inspection, these functions directly query `users` table with **NO fallback** to `user_profiles`:

### Priority 1: Critical Investment Flow Functions

1. **`accept_investment_offer_with_fee`**
   - Uses: `FROM public.users` (lines 496-504 in UPDATED_INVESTMENT_FLOW_SCHEMA.sql)
   - Status: ❌ **NO fallback** - Uses ONLY `users` table
   - Impact: Used when accepting investment offers
   - **Needs migration to use `user_profiles`**

2. **`get_offers_for_investment_advisor`**
   - Uses: `LEFT JOIN public.users u ON io.investor_id = u.id` (line 366)
   - Status: ❌ **NO fallback** - Uses ONLY `users` table
   - Impact: Used for advisor dashboard to show offers
   - **Needs migration to use `user_profiles`**

3. **`should_reveal_contact_details`**
   - Uses: `LEFT JOIN public.users u ON io.investor_id = u.id` (line 315)
   - Status: ❌ **NO fallback** - Uses ONLY `users` table
   - Impact: Used to determine if contact details should be revealed
   - **Needs migration to use `user_profiles`**

### Analysis

**None of these functions use fallback logic.** They all directly query the `users` table:
- No `IF NOT FOUND THEN` fallback to `user_profiles`
- No `COALESCE` with both tables
- No conditional logic checking `user_profiles` first

## Functions That DO Use Fallback (Good!)

Some functions in other migration scripts (like `get_current_profile_safe`) use fallback logic:
- Try `user_profiles` first
- Fall back to `users` if not found

But the **Priority 1 functions above do NOT use this pattern** - they need full migration.

## Recommendation

**Migrate these 3 Priority 1 functions to use `user_profiles` only:**
1. `accept_investment_offer_with_fee` - Change to use `user_profiles` for investor lookup
2. `get_offers_for_investment_advisor` - Change to use `user_profiles` for investor name
3. `should_reveal_contact_details` - Change to use `user_profiles` for advisor code check

The pattern should be:
- Use `user_profiles` table with `auth_user_id = investor_id`
- Filter by role if needed
- No fallback to `users` table


