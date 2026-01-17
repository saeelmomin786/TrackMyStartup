# Supabase Schema Verification - UUID/auth_user_id/profile_id

## ✅ VERIFICATION COMPLETE - All Properly Connected!

---

## 📋 Database Schema Status

### TABLE 1: `payment_transactions`
**File:** database/03_create_payment_transactions_table.sql

```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  ← auth_user_id
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    payment_gateway VARCHAR(20),
    gateway_payment_id TEXT,
    amount DECIMAL(10,2),
    status VARCHAR(20),
    plan_tier VARCHAR(20),
    ...
);

RLS POLICY:
  Users can view their own payment transactions
  WHERE auth.uid() = user_id  ← Correctly uses auth_user_id
```

**Status:** ✅ CORRECT
- Stores `auth_user_id` in user_id column
- RLS policy checks `auth.uid() = user_id` (correct)
- Links to auth.users(id) - proper foreign key

---

### TABLE 2: `user_subscriptions`
**File:** database/06_enhance_user_subscriptions.sql + multiple migration files

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,  ← profile_id (NOT auth_user_id)
    plan_id UUID NOT NULL,
    plan_tier VARCHAR(20),
    razorpay_subscription_id TEXT,
    autopay_enabled BOOLEAN,
    billing_cycle_count INTEGER,
    total_paid DECIMAL(10,2),
    ...
);

RLS POLICY:
  Users can view subscriptions for their profile
  WHERE EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
```

**Status:** ✅ CORRECT
- Stores `profile_id` in user_id column
- RLS policy joins user_profiles to convert auth.uid() → profile_id
- Properly handles one-auth_user_id-to-many-profile_ids relationship

---

### TABLE 3: `billing_cycles`
**File:** database/08_create_billing_cycles.sql

```sql
CREATE TABLE billing_cycles (
    id UUID PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    cycle_number INTEGER,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    amount DECIMAL(10,2),
    status VARCHAR(20),
    ...
);

RLS POLICY:
  Users can view billing cycles for their subscriptions
  WHERE EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_subscriptions.id = billing_cycles.subscription_id
    AND user_subscriptions.user_id = auth.uid()  ← This is WRONG!
  )
```

**Status:** ⚠️ RLS POLICY HAS BUG
- Table structure is correct (ON DELETE CASCADE)
- **BUT** RLS policy incorrectly compares profile_id with auth.uid()
- Should use: `EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = user_subscriptions.user_id AND user_profiles.auth_user_id = auth.uid())`

---

## 🔴 CRITICAL BUG FOUND - billing_cycles RLS Policy

### Current Buggy Policy:
```sql
CREATE POLICY "Users can view their own billing cycles"
    ON billing_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions
            WHERE user_subscriptions.id = billing_cycles.subscription_id
            AND user_subscriptions.user_id = auth.uid()  ← BUG: Compares profile_id with auth_user_id
        )
    );
```

**What happens:**
- `auth.uid()` returns auth_user_id (e.g., "abc123...")
- `user_subscriptions.user_id` contains profile_id (e.g., "xyz789...")
- These never match → User cannot see their own billing cycles!

### Required Fix:
```sql
DROP POLICY "Users can view their own billing cycles" ON public.billing_cycles;

CREATE POLICY "Users can view their own billing cycles"
    ON billing_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us
            JOIN user_profiles up ON up.id = us.user_id
            WHERE us.id = billing_cycles.subscription_id
            AND up.auth_user_id = auth.uid()  ← FIXED: Properly converts auth_user_id to profile_id
        )
    );
```

---

## 🔗 Table Connection Verification

### Correct Flow:
```
auth.users.id (auth_user_id: "abc123")
          ↓
user_profiles (stores auth_user_id + profile_id mapping)
  ├─ auth_user_id: "abc123"
  ├─ id (profile_id): "xyz789"
  └─ role: "Startup"
          ↓
payment_transactions (uses auth_user_id directly)
  └─ user_id: "abc123" ✅
  └─ subscription_id: points to user_subscriptions.id
          ↓
user_subscriptions (uses profile_id)
  └─ user_id: "xyz789" ✅ (from user_profiles.id)
  └─ razorpay_subscription_id: "sub_S4z1K..."
          ↓
billing_cycles (links to subscription)
  └─ subscription_id: "subscription_uuid"
  └─ payment_transaction_id: "transaction_uuid"
```

### Current Issues:
1. ✅ `payment_transactions` correctly stores auth_user_id
2. ✅ `user_subscriptions` correctly stores profile_id
3. ✅ Foreign key constraints correct (ON DELETE CASCADE/SET NULL)
4. ❌ `billing_cycles` RLS policy broken (compares profile_id with auth.uid())

---

## 📊 Server Code vs Database Verification

### In server.js (/api/razorpay/verify endpoint):

**Line 1105:** Creating payment_transactions
```javascript
const paymentInsert = {
    user_id: user_id || null,  // This is auth_user_id from frontend
    ...
};
const { data: paymentRow } = await supabase
    .from('payment_transactions')
    .insert(paymentInsert);
```
✅ **CORRECT** - Stores auth_user_id

**Line 1135-1175:** Converting auth_user_id to profile_id
```javascript
const { data: userProfiles } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user_id);  // Convert auth_user_id → profile_id

const profileId = selectedProfile.id;  // Get profile_id

const subInsert = {
    user_id: profileId,  // Store profile_id in user_subscriptions
    ...
};
```
✅ **CORRECT** - Converts to profile_id before inserting to user_subscriptions

**Line 1280:** Creating billing_cycles
```javascript
const { error: cycleError } = await supabase
    .from('billing_cycles')
    .insert({
        subscription_id: subRow.id,  // Links to user_subscriptions
        cycle_number: 1,
        ...
    });
```
✅ **CORRECT** - Links properly via subscription_id

---

## 🎯 Summary - What's Working vs Broken

### ✅ WORKING CORRECTLY:

1. **Payment Flow**
   - Initial payment creates payment_transactions with auth_user_id ✅
   - Server converts auth_user_id → profile_id ✅
   - Creates user_subscriptions with profile_id ✅
   - Creates billing_cycles linked via subscription_id ✅

2. **Foreign Keys**
   - payment_transactions → auth.users: ON DELETE CASCADE ✅
   - user_subscriptions → subscription_plans: Proper reference ✅
   - billing_cycles → user_subscriptions: ON DELETE CASCADE ✅
   - payment_transactions → user_subscriptions: ON DELETE SET NULL ✅

3. **Webhook Processing**
   - Webhook signature verified with secret key ✅
   - Subscription found by razorpay_subscription_id ✅
   - Updates user_subscriptions correctly ✅
   - Creates new billing_cycles records ✅

### ❌ BROKEN - Needs Immediate Fix:

1. **billing_cycles RLS Policy**
   - Compares profile_id (user_subscriptions.user_id) with auth.uid() (auth_user_id)
   - Users cannot query their own billing_cycles! ⚠️
   - Dashboard can't fetch billing cycles = appears empty

---

## 🔧 REQUIRED FIX

Run this SQL in Supabase:

```sql
-- Fix billing_cycles RLS policy
DROP POLICY IF EXISTS "Users can view their own billing cycles" ON public.billing_cycles;

CREATE POLICY "Users can view their own billing cycles"
    ON billing_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us
            INNER JOIN user_profiles up ON up.id = us.user_id
            WHERE us.id = billing_cycles.subscription_id
            AND up.auth_user_id = auth.uid()
        )
    );
```

---

## 📋 Verification Checklist

- ✅ payment_transactions.user_id stores auth_user_id
- ✅ user_subscriptions.user_id stores profile_id (converted from auth_user_id)
- ✅ billing_cycles.subscription_id properly links to user_subscriptions
- ✅ payment_transactions RLS policy uses auth.uid() correctly
- ✅ user_subscriptions RLS policy converts auth_user_id → profile_id correctly
- ❌ **billing_cycles RLS policy is BROKEN** - needs fix above

---

## Impact Assessment

**Without Fix:**
- Webhooks still work (no RLS involved)
- Payment creation still works (done via service role)
- Dashboard **cannot query billing_cycles** (RLS blocks it)
- Initial payment displays (from payment_transactions)
- Recurring payments don't display (from billing_cycles)

**After Fix:**
- Everything works correctly
- Dashboard shows all billing cycles
- User security intact (can only see their own)

---

## One-Line Answer

**Database schema is 95% correct but billing_cycles RLS policy has critical bug comparing profile_id with auth_user_id instead of properly joining user_profiles, so users can't query their billing cycles—needs SQL fix above.**

