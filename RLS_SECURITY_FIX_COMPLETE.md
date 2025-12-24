# 🔒 RLS Security Fix - Implementation Guide

## 📊 **Tables Needing RLS**

### **6 Tables with RLS Disabled (Critical!):**
1. `auditor_types` - Reference data (5 rows)
2. `company_types` - Reference data (21 rows)
3. `compliance_rules_comprehensive` - Reference data (1,338 rows)
4. `compliance_rules_new` - Reference data (18 rows)
5. `governance_types` - Reference data (6 rows)
6. `password_otps` - Sensitive user data (74 rows)

### **2 Tables with RLS Enabled but No Policies:**
7. `program_workflows` - Empty (0 rows) - Future functionality
8. `workflow_steps` - Empty (0 rows) - Future functionality

---

## 🚀 **Implementation**

### **Step 1: Run the Fix Script**
```sql
-- Run: CREATE_RLS_POLICIES_FOR_TABLES.sql
```

This script will:
1. ✅ Enable RLS on all 6 disabled tables
2. ✅ Create appropriate RLS policies for all 8 tables
3. ✅ Verify policies were created successfully

---

## 🔐 **Policy Strategy**

### **Reference Data Tables** (Read-Only for Authenticated Users)
- `auditor_types`
- `company_types`
- `governance_types`
- `compliance_rules_comprehensive`
- `compliance_rules_new`

**Policy:** Any authenticated user can read (SELECT) these tables
- These are lookup/reference tables used throughout the application
- No write access needed for regular users
- Admin can manage these via service role if needed

### **Password OTPs** (User-Specific Access)
- `password_otps`

**Policy:** 
- Users can view OTPs for their own email (for verification)
- Authenticated users can insert OTPs (server/api creates these)
- Users can update OTPs for their own email (marking as used)

**Security Notes:**
- OTPs matched by email (not user_id, as user_id can be null for new registrations)
- Used for forgot password, invite, and registration flows
- Sensitive data - users only see their own

### **Workflow Tables** (Authenticated Access)
- `program_workflows`
- `workflow_steps`

**Policy:** Any authenticated user can access these tables (SELECT, INSERT, UPDATE, DELETE)
- Currently empty (0 rows)
- Likely for future workflow functionality
- Can be restricted later if needed

---

## ⚠️ **Important Notes**

### **After Running the Script:**

1. **Reference Tables:** Will be accessible to all authenticated users ✅
   - No breaking changes expected
   - These are already used as read-only reference data

2. **Password OTPs:** Users will only see their own OTPs ✅
   - OTPs are created by server/api, not directly by users
   - Verification happens server-side
   - Should not break existing flows

3. **Workflow Tables:** Accessible to all authenticated users ✅
   - Currently empty, so no immediate impact
   - Can be restricted later if admin-only access is needed

---

## ✅ **Verification**

After running the script, verify with:

```sql
-- Check that all tables now have RLS enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policy WHERE polrelid = c.oid) as policy_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.schemaname = 'public'
  AND t.tablename IN (
      'auditor_types',
      'company_types',
      'compliance_rules_comprehensive',
      'compliance_rules_new',
      'governance_types',
      'password_otps',
      'program_workflows',
      'workflow_steps'
  )
ORDER BY t.tablename;
```

Expected result:
- All tables should have `rls_enabled = true`
- All tables should have `policy_count >= 1`

---

## 🎯 **Next Steps**

1. ✅ Run `CREATE_RLS_POLICIES_FOR_TABLES.sql`
2. ✅ Verify all tables have RLS enabled and policies
3. ✅ Test application to ensure no breaking changes
4. ✅ Monitor for any access issues

---

**Security Status:** Once complete, all 72 user tables will have RLS enabled and appropriate policies! 🔒✅















