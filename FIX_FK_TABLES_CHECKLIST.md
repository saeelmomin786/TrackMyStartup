# Tables with FK to users(id) - Fix Checklist

## Tables That Need Fixing (15 tables)

These tables have foreign keys to `users(id)` and **MUST** use `auth.uid()` in their RLS policies (not profile IDs).

### Quick Fix Script
Run `FIX_FK_TO_USERS_TABLES.sql` to fix all of these at once.

### Manual Fix (One by One)

1. ✅ **advisor_startup_link_requests**
   - Column: Check with `IDENTIFY_PROBLEMATIC_TABLES.sql`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

2. ✅ **co_investment_approvals**
   - Column: `investor_id` or `advisor_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

3. ✅ **co_investment_interests**
   - Column: `investor_id` or `user_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

4. ✅ **co_investment_offers**
   - Column: `investor_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

5. ⚠️ **co_investment_opportunities**
   - Note: May not have direct user_id (role-based)
   - Check structure first

6. ✅ **contact_details_access**
   - Column: `investor_id` or `user_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

7. ✅ **evaluators**
   - Column: `user_id` or `evaluator_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

8. ✅ **investment_advisor_commissions**
   - Column: `advisor_id` or `investor_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

9. ✅ **investment_advisor_offer_visibility**
   - Column: `advisor_id`
   - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

10. ✅ **investment_advisor_recommendations**
    - Column: `advisor_id` or `investor_id`
    - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

11. ✅ **investment_advisor_relationships**
    - Column: `advisor_id` or `investor_id`
    - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

12. ✅ **investment_offers**
    - Column: `investor_id`
    - Fix: Already fixed, but verify

13. ✅ **investor_favorites**
    - Column: `investor_id`
    - Fix: Already fixed, but verify

14. ⚠️ **startups**
    - Column: `user_id`
    - Fix: Already fixed in previous script, verify

15. ✅ **user_submitted_compliances**
    - Column: `user_id`
    - Fix: Use `FIX_SINGLE_TABLE_RLS_SIMPLE.sql`

## Testing After Fix

For each table:
1. ✅ Run the fix script
2. ✅ Test INSERT operation
3. ✅ Test SELECT operation
4. ✅ Test UPDATE operation (if applicable)
5. ✅ Test DELETE operation (if applicable)
6. ✅ Check browser console for errors
7. ✅ Mark as complete

## Quick Fix Option

**Run `FIX_FK_TO_USERS_TABLES.sql`** - This will fix all 15 tables automatically in one go!

Then test each table's functionality to ensure everything works.



