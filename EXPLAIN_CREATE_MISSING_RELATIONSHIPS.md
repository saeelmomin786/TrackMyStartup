# What Does create_missing_relationships() Do?

## 🎯 Purpose

This function **automatically creates missing investment advisor relationships** between advisors and startups.

---

## 📋 What It Does (Step by Step)

### **Before Migration (Old Version):**
1. Looks at all startups that have an `investment_advisor_code`
2. Finds the advisor in the `users` table who has that code
3. Creates a relationship record in `investment_advisor_relationships` table
4. Returns how many relationships were created

### **After Migration (New Version):**
1. Looks at all startups that have an `investment_advisor_code`
2. Finds the advisor in the `user_profiles` table who has that code
3. Creates a relationship record in `investment_advisor_relationships` table
4. Returns how many relationships were created

**Same logic, different source table!**

---

## 🔍 Example Scenario

**Scenario:**
- Startup "TechCorp" has `investment_advisor_code = 'IA-12345'`
- Advisor "John Doe" has `investment_advisor_code = 'IA-12345'`
- But there's no relationship record in `investment_advisor_relationships` table

**What This Function Does:**
- Finds that TechCorp has code 'IA-12345'
- Finds that John Doe has code 'IA-12345'
- Creates relationship: `(advisor_id, startup_id, 'advisor_startup')`
- Returns: "Created 1 advisor-startup relationships"

---

## ⚠️ What Changes in Migration

### **Before:**
```sql
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE advisor.role IN ('Investment Advisor', 'Admin')
```

### **After:**
```sql
JOIN LATERAL (
  SELECT auth_user_id
  FROM public.user_profiles
  WHERE (investment_advisor_code = s.investment_advisor_code
         OR investment_advisor_code_entered = s.investment_advisor_code)
  AND role IN ('Investment Advisor', 'Admin')
  ORDER BY created_at DESC
  LIMIT 1
) advisor ON true
```

**Changes:**
- ✅ Uses `user_profiles` instead of `users`
- ✅ Uses `auth_user_id` instead of `id`
- ✅ Gets most recent profile if multiple exist
- ✅ Checks both `investment_advisor_code` and `investment_advisor_code_entered`

---

## ✅ Safety

- ✅ **Function signature unchanged** - same parameters, same return type
- ✅ **Logic is equivalent** - same results, different source
- ✅ **No frontend changes needed** - if called via RPC, works the same
- ✅ **Safe to run** - won't break existing flows

---

## 🎯 When Is This Function Used?

This is typically a **utility/maintenance function** that:
- Can be run manually to fix missing relationships
- Might be called from admin dashboard
- Helps ensure data consistency

---

## 💡 Bottom Line

**What it does:** Creates missing advisor-startup relationships automatically

**What changes:** Uses `user_profiles` table instead of `users` table

**Impact:** ✅ Safe, no breaking changes, optimized performance



