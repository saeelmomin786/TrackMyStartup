# Final Check - Remaining 5 Functions

## ✅ Just Completed

- ✅ `create_missing_relationships` - Migrated

---

## 📊 Current Status

**Total Migrated: 41 functions** ✅

**Remaining to Check: 5 functions**

---

## 🔍 Check These 5 Functions

Run these queries in Supabase SQL Editor (one by one or all at once):

### **Query 1: assign_evaluators_to_application**
```sql
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'assign_evaluators_to_application';
```

### **Query 2: create_advisor_relationships_automatically**
```sql
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_advisor_relationships_automatically';
```

### **Query 3: create_existing_investment_advisor_relationships**
```sql
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_existing_investment_advisor_relationships';
```

### **Query 4: create_investment_offers_automatically**
```sql
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_investment_offers_automatically';
```

### **Query 5: create_missing_offers**
```sql
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_missing_offers';
```

---

## 📋 What To Do

1. **Run all 5 queries** (or use the `CHECK_REMAINING_FUNCTIONS.sql` file)
2. **Share the results** with me
3. **For each function:**
   - If `❌ USES users TABLE` → I'll create migration script
   - If `✅ NO users TABLE` → Already done, no action needed

---

## 🎯 After This Check

We'll have:
- ✅ All functions checked
- ✅ Migration scripts created for any that need it
- ✅ **100% migration complete!**





