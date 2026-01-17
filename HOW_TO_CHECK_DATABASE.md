# 🔍 HOW TO CHECK SUPABASE DATABASE BEFORE RUNNING FIX

## Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor
1. Go to: https://app.supabase.co
2. Select your project
3. Go to: **SQL Editor** (left sidebar)
4. Click: **New Query**

---

### Step 2: Run Diagnostic Query
1. Copy entire content of: `DIAGNOSTIC_CHECK_DATABASE.sql`
2. Paste into Supabase SQL Editor
3. Click: **Run** (or Ctrl+Enter)
4. Wait for results to display

---

### Step 3: Review Results

#### **SECTION 1: Current RLS Policies**
```
What to look for:
✅ Good:   Shows user_subscriptions_user_insert, user_subscriptions_user_read, etc.
❌ Bad:    Empty or missing policies
⚠️  Warning: Policies don't mention "Investment Advisor"

What this means:
- Shows current RLS setup
- Helps verify which operations are allowed
```

---

#### **SECTION 3: CHECK FOR NEGATIVE CREDITS ⚠️ CRITICAL!**
```
Output Example 1 (GOOD):
  advisors_with_negative_credits | 0
  min_balance                    | 0
  max_balance                    | 50

Output Example 2 (BAD - BUG ACTIVE):
  advisors_with_negative_credits | 3
  min_balance                    | -5
  max_balance                    | 50
  
  advisor_user_id | credits_available | credits_used | credits_purchased
  uuid1           | -5                | 10           | 5
  uuid2           | -2                | 7            | 5
```

**What this means:**
- If ANY negative values exist → BUG IS ACTIVE! Must fix!
- If all ≥ 0 → System is working correctly (but still need CHECK constraint for safety)
```

---

#### **SECTION 10: Database Constraints**
```
What to look for:
✅ Good:
  constraint_name                      | constraint_type
  check_credits_available_non_negative | CHECK
  check_credits_used_non_negative      | CHECK
  
❌ Bad (Missing):
  (No rows returned)

What this means:
- CHECK constraints prevent negative values at database level
- If missing → Database allows negative (unprotected!)
- Fix will ADD these constraints
```

---

#### **SECTION 11: RPC Functions**
```
What to look for:
✅ Good:
  routine_name                  | routine_type
  deduct_advisor_credit_safe    | FUNCTION
  increment_advisor_credits     | FUNCTION
  
❌ Missing:
  deduct_advisor_credit_safe not listed

What this means:
- Safe function uses transaction lock to prevent race conditions
- If missing → Old unsafe UPDATE still being used
- Fix will CREATE this function
```

---

#### **SECTION 13: Summary Report**
```
Output Example (Shows all issues):

📊 DATABASE STATUS REPORT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Advisors: 5
Average Credits Per Advisor: 3.2
Advisors with NEGATIVE Credits: 2 ⚠️

🔒 DATABASE PROTECTION STATUS:
CHECK Constraints on Credits: 0 ❌
Safe Deduction Function Exists: false ❌

🚀 READY FOR FIX?
⚠️  YES - Found 2 advisor(s) with negative credits - MUST FIX!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What this means:**
- 2 advisors have negative credits (bug confirmed!)
- No CHECK constraints (database unprotected)
- No safe function (still using old unsafe method)
- **ACTION:** Run FIX_NEGATIVE_CREDITS_BUG.sql
```

---

### Step 4: Understand the Credit Flow

After reviewing diagnostic output, verify this flow is working:

```
Timeline Check:
1. Advisor buys credits
   → Check: advisor_credits.credits_available increased?
   
2. Advisor assigns credit to startup
   → Check: credits_available decreased by 1?
   → Check: advisor_credit_assignments record created?
   → Check: user_subscriptions record created?
   
3. Auto-renewal runs (daily)
   → Check: Expiring assignments renewed OR expired?
   → If expired without credits: auto_renewal_enabled set to false?
```

**How to verify manually:**
```sql
-- Find one advisor who bought credits
SELECT * FROM advisor_credits 
WHERE credits_purchased > 0
LIMIT 1;

-- Check their assignments
SELECT * FROM advisor_credit_assignments
WHERE advisor_user_id = '[ADVISOR_UUID_FROM_ABOVE]'
LIMIT 5;

-- Check subscriptions created for their startups
SELECT * FROM user_subscriptions
WHERE paid_by_advisor_id = '[ADVISOR_UUID_FROM_ABOVE]'
LIMIT 5;
```

---

### Step 5: Decide Whether to Run Fix

**RUN FIX IF:**
- ✅ Section 3 shows negative credits (bug is active)
- ✅ Section 10 shows 0 CHECK constraints (no protection)
- ✅ Section 11 missing deduct_advisor_credit_safe (unsafe method)
- ✅ Section 13 says "MUST FIX!"

**OPTIONAL (But Recommended):**
- Even if no negative credits, add constraints for SAFETY
- Prevents bug from happening in future

**DON'T RUN FIX IF:**
- Section 3 shows all credits ≥ 0
- Section 10 shows all CHECK constraints exist
- Section 11 shows deduct_advisor_credit_safe function
- Section 13 says "System appears to be working correctly!"

---

### Step 6: Before Running Fix

**Save Current State:**
```sql
-- Copy these queries and run them BEFORE the fix
-- This creates backup data in case you need to rollback

-- Backup advisor_credits state
SELECT 
    advisor_user_id,
    credits_available,
    credits_used,
    credits_purchased,
    updated_at
FROM advisor_credits
ORDER BY updated_at DESC
LIMIT 20;

-- Backup advisor_credit_assignments state
SELECT 
    advisor_user_id,
    startup_user_id,
    status,
    auto_renewal_enabled,
    end_date
FROM advisor_credit_assignments
WHERE status = 'active'
ORDER BY assigned_at DESC
LIMIT 20;
```

---

## Quick Reference: What Each Section Tells You

| Section | What It Shows | Why It Matters |
|---------|---------------|----------------|
| 1 | Current RLS Policies | Confirms who can do what |
| 2 | Advisor Credits | Shows credit balances |
| 3 | **Negative Credits** | **BUG INDICATOR!** |
| 4 | Active Assignments | Shows ongoing premium grants |
| 5 | Premium Subscriptions | Shows premium access |
| 6 | Purchase History | Shows credit purchases |
| 7 | Payment Status | Shows payment success/failure |
| 8 | Auto-Renewal Status | Shows auto-renewal state |
| 9 | Expiring Assignments | Shows what needs renewal |
| 10 | Constraints | Shows database protection |
| 11 | RPC Functions | Shows available functions |
| 12 | Sample Flow | Shows complete flow for one advisor |
| 13 | Summary Report | **Final verdict on system health** |

---

## Common Findings & What They Mean

### Finding 1: Negative Credits Exist
```
❌ BUG FOUND:
  - Advisors can have negative credits
  - Database doesn't prevent this
  - Multiple concurrent requests caused it
  
✅ FIX:
  - Run FIX_NEGATIVE_CREDITS_BUG.sql
  - Adds CHECK constraint
  - Adds safe RPC function
  - Sets negative credits to 0
```

### Finding 2: No CHECK Constraints
```
⚠️  RISK:
  - Database allows any value (including negative)
  - Application logic is only protection
  - Race conditions can bypass logic
  
✅ FIX:
  - Run FIX_NEGATIVE_CREDITS_BUG.sql
  - Adds CHECK (credits_available >= 0)
  - Prevents negative at database level
```

### Finding 3: No Safe Function
```
⚠️  RISK:
  - Using simple UPDATE (non-atomic)
  - Two concurrent requests can both deduct
  - Result: Negative credits
  
✅ FIX:
  - Run FIX_NEGATIVE_CREDITS_BUG.sql
  - Creates deduct_advisor_credit_safe
  - Uses FOR UPDATE lock
  - Prevents race conditions
```

### Finding 4: RLS Policy Missing Investment Advisor
```
❌ ERROR:
  - 403 Forbidden when advisor creates subscription
  - FIX_RLS_ADVISOR_SUBSCRIPTIONS.sql needed
  
✅ FIX:
  - Run FIX_RLS_ADVISOR_SUBSCRIPTIONS.sql
  - Adds Investment Advisor permission
  - Advisor can create subscriptions for any startup
```

---

## Next Steps After Diagnostic

1. **Review all 13 sections** of diagnostic output
2. **Check Section 13 summary** for final verdict
3. **If issues found:**
   - Run `FIX_NEGATIVE_CREDITS_BUG.sql` (database protection)
   - Run `FIX_RLS_ADVISOR_SUBSCRIPTIONS.sql` (advisor permissions)
4. **If no issues:**
   - System working correctly!
   - Still recommended: Add constraints for safety

---

## Example Complete Workflow

```
1. Run: DIAGNOSTIC_CHECK_DATABASE.sql
   ↓ Review results
2. If negative credits found:
   ↓ Run: FIX_NEGATIVE_CREDITS_BUG.sql
   ↓ Run: FIX_RLS_ADVISOR_SUBSCRIPTIONS.sql
3. Re-run: DIAGNOSTIC_CHECK_DATABASE.sql (verify fix worked)
4. Test advisor credit assignment in app
5. Done! ✅
```

---

**Ready to check your database? Start with DIAGNOSTIC_CHECK_DATABASE.sql! 🚀**

