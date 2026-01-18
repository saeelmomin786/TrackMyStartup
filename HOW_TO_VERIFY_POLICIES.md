# 🔍 HOW TO VERIFY ACTUAL POLICIES IN SUPABASE

## **Quick Answer**

✅ **YES, you need to verify by running Supabase queries!**

The SQL files in your workspace show what policies *should* exist, but we need to verify what's actually deployed in your live database.

---

## **Step-by-Step Verification**

### **Method 1: Supabase Dashboard (Easiest)**

1. Go to **https://app.supabase.com/**
2. Click on your project: **dlesebbmlrewsbmqvuza**
3. Navigate to **SQL Editor** → Click **+ New query**
4. Copy and paste this query:

```sql
-- CHECK ALL POLICIES IN YOUR DATABASE
SELECT 
    tablename,
    policyname,
    cmd as operation,
    roles as applicable_roles
FROM pg_policies
WHERE tablename IN (
    'user_subscriptions',
    'payment_transactions',
    'billing_cycles',
    'subscription_changes'
)
ORDER BY tablename, policyname;
```

5. Click **Run** and you'll see all actual policies
6. Compare output with [SUPABASE_POLICIES_VERIFICATION.md](SUPABASE_POLICIES_VERIFICATION.md)

---

### **Method 2: More Detailed Policy Conditions**

Use this query to see the actual policy conditions (what we analyzed):

```sql
-- DETAILED POLICY CONDITIONS
SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as policy_condition,
    with_check as insert_update_check
FROM pg_policies
WHERE tablename IN (
    'user_subscriptions',
    'payment_transactions',
    'billing_cycles',
    'subscription_changes'
)
ORDER BY tablename, policyname;
```

---

### **Method 3: Check Functions**

To verify which functions are deployed:

```sql
-- LIST ALL CUSTOM FUNCTIONS
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
INNER JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN (
    'is_subscription_valid',
    'handle_autopay_cancellation',
    'handle_subscription_payment_failure',
    'create_subscription'
)
ORDER BY p.proname;
```

---

## **What You'll Find**

Based on my analysis of your SQL files, you likely have:

### **Expected to be deployed:**
- ✅ `user_subscriptions_user_read` policy
- ✅ `user_subscriptions_user_insert` policy  
- ✅ `user_subscriptions_advisor_read` policy (might be)
- ✅ `user_subscriptions_advisor_insert` policy (might be)
- ✅ `payment_transactions` read policy
- ⚠️ `billing_cycles` read policy (MIGHT BE BROKEN)
- ✅ `subscription_changes` read policy

### **Functions:**
- ✅ `is_subscription_valid(UUID)` - Feature access validation
- ✅ `handle_autopay_cancellation()` - Autopay cancellation
- ✅ `handle_subscription_payment_failure()` - Payment failure handling
- ❓ `create_subscription()` - Advisor credit system (different context)

---

## **Critical Issue to Check**

When you run the query above, look specifically at the **billing_cycles** policy.

**❌ If you see:**
```sql
AND user_subscriptions.user_id = auth.uid()
```

**✅ Should be:**
```sql
INNER JOIN user_profiles up ON up.id = user_subscriptions.user_id
WHERE ... AND up.auth_user_id = auth.uid()
```

---

## **After You Verify**

1. **Run the SQL queries in Supabase Dashboard**
2. **Compare the output with [SUPABASE_POLICIES_VERIFICATION.md](SUPABASE_POLICIES_VERIFICATION.md)**
3. **Report back what you find** - I'll help you fix any mismatches

---

## **Quick Reference**

| Query | Purpose |
|-------|---------|
| `SELECT * FROM pg_policies WHERE tablename = 'user_subscriptions';` | Check subscription policies |
| `SELECT * FROM pg_policies WHERE tablename = 'billing_cycles';` | Check billing cycle policies |
| `SELECT proname FROM pg_proc WHERE proname LIKE 'handle_%' OR proname = 'is_subscription_valid';` | Check functions exist |

---

## **Commands to Run Now**

Copy **each query** and run in Supabase SQL Editor:

### Query 1: List All Policies
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename LIKE '%subscription%' OR tablename LIKE '%billing%'
ORDER BY tablename;
```

### Query 2: Check billing_cycles Specifically  
```sql
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'billing_cycles';
```

### Query 3: Check Functions
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('is_subscription_valid', 'handle_autopay_cancellation', 'handle_subscription_payment_failure')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

**Once you run these, share the results and I'll tell you exactly what needs to be fixed!**
