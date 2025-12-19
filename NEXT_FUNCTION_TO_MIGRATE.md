# Next Function to Migrate

## 🎯 Get Function Definition

Run this query in Supabase SQL Editor to get the function definition:

```sql
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'assign_facilitator_code';
```

---

## 📋 Remaining Functions (17 total)

### **Code Generation Functions (8 functions):**
1. `assign_facilitator_code` ⬅️ **START HERE**
2. `assign_mentor_code`
3. `generate_ca_code`
4. `generate_cs_code`
5. `generate_facilitator_code`
6. `generate_investment_advisor_code`
7. `generate_investor_code`
8. `generate_mentor_code`

### **Utility Functions (9 functions):**
9. `assign_evaluators_to_application`
10. `create_advisor_relationships_automatically`
11. `create_existing_investment_advisor_relationships`
12. `create_investment_offers_automatically`
13. `create_missing_offers`
14. `create_missing_relationships`
15. `get_applications_with_codes`
16. `get_facilitator_by_code`
17. `get_facilitator_code`
18. `get_opportunities_with_codes`
19. `safe_delete_startup_user`
20. `set_facilitator_code_on_opportunity`
21. `update_investment_advisor_relationship`
22. `update_startup_investment_advisor_relationship`

---

## 🚀 Next Step

**Get the function definition for `assign_facilitator_code`** using the query above, then share the `function_definition` result with me, and I'll create the migration script!


