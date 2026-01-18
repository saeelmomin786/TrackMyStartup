# 🐛 DUPLICATE SUBSCRIPTION BUG - ROOT CAUSE & FIX

## 🔍 Root Cause Analysis

### The Error
```
duplicate key value violates unique constraint "idx_user_subscriptions_user_id_active_unique"
Key (user_id)=(f03f6c31-aacf-4d24-b410-fe0601ecff2d) already exists.
```

### Why It Happens

**Constraint in Database:**
```sql
-- From MIGRATE_TO_OPTION_B_SUBSCRIPTION_MODEL.sql
CREATE UNIQUE INDEX idx_user_subscriptions_user_id_active_unique
ON public.user_subscriptions (user_id)
WHERE status = 'active';
```
This enforces **ONE active subscription per user**.

**Bug in Code (server.js Line 1248):**
```javascript
// ❌ PROBLEM: Direct INSERT without deactivating old subscription
const { data: subRow, error: subErr } = await supabase
  .from('user_subscriptions')
  .insert(subInsert)  // ← This fails if user already has active subscription
  .select()
  .single();
```

**What Should Happen:**
1. ✅ Deactivate old subscription (status = 'inactive')
2. ✅ Insert new subscription (status = 'active')

**What Actually Happens:**
1. ❌ Skip deactivation step
2. ❌ Try to insert new active subscription
3. ❌ Database rejects because user already has 1 active subscription

---

## 🔧 THE FIX

### Option 1: Add Deactivation Logic in server.js (RECOMMENDED)

Add this code **BEFORE** the `subInsert` definition (around line 1225):

```javascript
// STEP 0: Deactivate any existing active subscription for this user
console.log('[verify] 🔍 Checking for existing active subscriptions...');
const { data: existingSubs, error: existingErr } = await supabase
  .from('user_subscriptions')
  .select('id, plan_tier, status')
  .eq('user_id', profileId)
  .eq('status', 'active');

if (existingSubs && existingSubs.length > 0) {
  console.log(`[verify] Found ${existingSubs.length} active subscription(s) for user, deactivating...`);
  
  const { error: deactivateErr } = await supabase
    .from('user_subscriptions')
    .update({ 
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', profileId)
    .eq('status', 'active');
  
  if (deactivateErr) {
    console.error('[verify] ⚠️ Error deactivating old subscriptions:', deactivateErr);
    // Continue anyway - constraint will catch if still duplicate
  } else {
    console.log('[verify] ✅ Old subscription(s) deactivated successfully');
  }
} else {
  console.log('[verify] No existing active subscriptions found (first subscription)');
}

// Now proceed with INSERT as normal...
const subInsert = {
  user_id: profileId,
  // ... rest of the code
};
```

### Option 2: Use UPSERT Pattern (Alternative)

Replace the `INSERT` with an `UPSERT`:

```javascript
// Use upsert to update existing or insert new
const { data: subRow, error: subErr } = await supabase
  .from('user_subscriptions')
  .upsert(
    subInsert,
    { 
      onConflict: 'user_id,status',  // This won't work with partial index
      ignoreDuplicates: false 
    }
  )
  .select()
  .single();
```

**Note:** This won't work with the partial unique index, so **Option 1 is recommended**.

---

## 📋 DIAGNOSTIC QUERIES

### 1. Check Current State for Specific User
```sql
SELECT 
  id,
  user_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'f03f6c31-aacf-4d24-b410-fe0601ecff2d'
ORDER BY created_at DESC;
```

### 2. Find All Users with Multiple Active Subscriptions
```sql
SELECT 
  user_id,
  COUNT(*) as active_count,
  STRING_AGG(plan_tier, ', ') as plan_tiers,
  STRING_AGG(id::text, ', ') as subscription_ids
FROM user_subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### 3. Verify the Constraint Exists
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND indexname = 'idx_user_subscriptions_user_id_active_unique';
```

---

## 🚀 IMMEDIATE WORKAROUND

To allow the user to proceed with payment **right now**, manually deactivate their existing subscription:

```sql
-- Deactivate existing subscription for f03f6c31-aacf-4d24-b410-fe0601ecff2d
UPDATE user_subscriptions
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE user_id = 'f03f6c31-aacf-4d24-b410-fe0601ecff2d'
  AND status = 'active';
```

Then retry the payment.

---

## 🎯 PERMANENT SOLUTION

1. **Apply Option 1 fix** to `server.js` (add deactivation logic)
2. **Deploy the updated code**
3. **Test the flow:**
   - User with Standard plan
   - Downgrade to Basic plan
   - Should deactivate Standard and activate Basic

---

## ✅ SUCCESS CRITERIA

After fix, the flow should be:

```
User has: Standard plan (active)
         ↓
User pays for: Basic plan
         ↓
server.js:
  1. Deactivate Standard → status='inactive' ✅
  2. Insert Basic → status='active' ✅
         ↓
Result: User now has Basic plan (active)
        Standard plan (inactive) - preserved for audit trail
```

---

## 📝 FILES TO MODIFY

1. **server.js** (Line ~1225) - Add deactivation logic
2. **api/payment/verify.ts** (if exists) - Add same logic

---

## 🔗 Related Files

- `MIGRATE_TO_OPTION_B_SUBSCRIPTION_MODEL.sql` - Created the constraint
- `lib/subscriptionService.ts` - Has `upsertSubscription()` with proper logic
- `CHECK_SUBSCRIPTION_DUPLICATES.sql` - Diagnostic queries
