# Step-by-Step Migration Guide

## 🎯 Current Status

### ✅ Ready to Run (7 scripts)
These scripts are ready - you can run them in Supabase SQL Editor:

1. **MIGRATE_ACCEPT_STARTUP_ADVISOR_REQUEST_FUNCTION.sql** - Remove fallback
2. **MIGRATE_GET_ADVISOR_CLIENTS_FUNCTION.sql** - Migrate to user_profiles
3. **MIGRATE_GET_ADVISOR_INVESTORS_FUNCTION.sql** - Migrate to user_profiles
4. **MIGRATE_GET_ALL_CO_INVESTMENT_OPPORTUNITIES_FUNCTION.sql** - Migrate to user_profiles
5. **MIGRATE_GET_CENTER_BY_USER_EMAIL_FUNCTION.sql** - Migrate to user_profiles
6. **MIGRATE_GET_CO_INVESTMENT_OPPORTUNITIES_FOR_USER.sql** - Migrate to user_profiles
7. **MIGRATE_GET_STARTUP_BY_USER_EMAIL_FUNCTION.sql** - Migrate to user_profiles ✅ Just created

---

## 📋 Step-by-Step Process

### **STEP 1: Run Ready Scripts (7 functions)**
1. Open Supabase SQL Editor
2. Run each script one by one
3. Test after each migration
4. Check for errors

**After Step 1:** 17 functions migrated ✅

---

### **STEP 2: Create Scripts for Remaining Functions (23 functions)**

We'll create migration scripts one by one. For each function:

1. **Get function definition** - Use `GET_FUNCTION_DEFINITION.sql` (replace FUNCTION_NAME)
2. **Create migration script** - Replace `users` with `user_profiles`
3. **Test the script** - Run in Supabase
4. **Mark as complete** - Update tracker

---

## 🔍 How to Get Function Definition

1. Open `GET_FUNCTION_DEFINITION.sql`
2. Replace `'FUNCTION_NAME'` with actual function name
3. Run in Supabase SQL Editor
4. Copy the function definition
5. Use it to create migration script

---

## 📊 Priority Order

### **High Priority (Do First):**
- `set_advisor_offer_visibility`
- `get_due_diligence_requests_for_startup`
- `get_investor_recommendations`
- `get_investment_advisor_investors`
- `get_investment_advisor_startups`
- `get_user_profile`

### **Medium Priority:**
- Code generation functions (generate_*, assign_*)

### **Low Priority:**
- Utility/test functions

---

## ✅ Next Action

**Run the 7 ready scripts first**, then we'll continue creating scripts for the remaining 23 functions.


