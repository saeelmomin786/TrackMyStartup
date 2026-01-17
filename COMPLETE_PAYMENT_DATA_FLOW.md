# Complete Payment Data Flow - After Payment Verification

## 📊 Data Storage Timeline (After Payment Success)

When user completes payment, data flows into **3 tables in this order:**

---

## TABLE 1️⃣: `payment_transactions`
**When:** First, immediately after signature verification
**What's stored:**
```javascript
{
  id: uuid (auto-generated),
  user_id: auth_user_id,  // The authenticated user's ID
  subscription_id: null,  // Filled later after subscription created
  payment_gateway: 'razorpay',
  gateway_order_id: razorpay_order_id,
  gateway_payment_id: razorpay_payment_id,  // Unique payment ID from Razorpay
  gateway_signature: razorpay_signature,     // Signature proof
  amount: 999.00,  // Total amount charged (with tax)
  currency: 'INR',
  status: 'success',
  payment_type: 'initial',
  plan_tier: 'premium',  // Looked up from subscription_plans table
  is_autopay: true,      // If razorpay_subscription_id exists
  autopay_mandate_id: razorpay_subscription_id,
  metadata: {
    tax_percentage: 18,
    tax_amount: 150.00,
    total_amount_with_tax: 999.00
  },
  created_at: now()
}
```

**Purpose:** Audit trail - keeps record of all payments made via Razorpay

---

## TABLE 2️⃣: `user_subscriptions`
**When:** Second, after payment transaction created
**What's stored:**
```javascript
{
  id: uuid (auto-generated),
  user_id: profileId,  // IMPORTANT: This is profile_id, NOT auth_user_id
  plan_id: plan_id,    // Which plan was purchased
  plan_tier: 'premium', // Copied from subscription_plans lookup
  status: 'active',
  current_period_start: 2026-01-17T10:30:00Z,
  current_period_end: 2026-02-17T10:30:00Z,  // +1 month for monthly plan
  amount: 999.00,      // Plan price
  currency: 'INR',
  interval: 'monthly', // Or 'yearly'
  is_in_trial: false,
  razorpay_subscription_id: 'sub_S4z1KDhpElowfd',  // For autopay mandate
  payment_gateway: 'razorpay',
  autopay_enabled: true,     // Autopay active if subscription_id exists
  mandate_status: 'active',
  billing_cycle_count: 1,    // First payment = cycle 1
  total_paid: 999.00,        // Total amount paid so far
  last_billing_date: 2026-01-17T10:30:00Z,
  next_billing_date: 2026-02-17T10:30:00Z,
  locked_amount_inr: 999.00, // INR amount (for conversion tracking)
  country: 'India',
  created_at: now()
}
```

**Purpose:** Main subscription record - stores subscription status, plan details, autopay info

---

## TABLE 3️⃣: `billing_cycles`
**When:** Third, after subscription created
**What's stored:**
```javascript
{
  id: uuid (auto-generated),
  subscription_id: subscription_id,  // Links to user_subscriptions.id
  cycle_number: 1,  // First billing cycle
  period_start: 2026-01-17T10:30:00Z,
  period_end: 2026-02-17T10:30:00Z,
  payment_transaction_id: payment_transaction_id,  // Links to payment_transactions.id
  amount: 999.00,
  currency: 'INR',
  status: 'paid',  // Initial payment status
  plan_tier: 'premium',
  is_autopay: true,
  created_at: now()
}
```

**Purpose:** Individual billing period records - tracks each month's billing

---

## 🔗 How These Tables Connect

```
payment_transactions (user_id = auth_user_id)
        ↓
        ├─ Links to → subscription_id (filled after subscription created)
        └─ Stores razorpay_payment_id, amount, signature

user_subscriptions (user_id = profile_id)
        ↓
        ├─ Links to → plan_id (subscription_plans table)
        ├─ Contains → razorpay_subscription_id (for autopay)
        └─ Stores plan_tier, status, billing dates

billing_cycles
        ↓
        ├─ Links to → subscription_id (user_subscriptions.id) - ON DELETE CASCADE
        └─ Links to → payment_transaction_id (payment_transactions.id)
```

---

## ⏱️ Step-by-Step Insertion Order

```
STEP 1: User clicks "Pay Now"
        ↓
        Razorpay processes payment
        
STEP 2: User authorizes → Razorpay returns:
        - razorpay_payment_id
        - razorpay_subscription_id (if autopay)
        - razorpay_signature
        
STEP 3: Frontend calls /api/razorpay/verify with these details
        ↓
        Backend verifies signature
        
STEP 4: ✅ INSERT INTO payment_transactions
        - Records payment details
        - user_id = auth_user_id (from auth.users table)
        - subscription_id = NULL initially
        
STEP 5: ✅ INSERT INTO user_subscriptions
        - Creates subscription record
        - user_id = profile_id (converted from auth_user_id)
        - plan_tier looked up from subscription_plans
        - razorpay_subscription_id stored (for autopay)
        
STEP 6: ✅ UPDATE payment_transactions
        - Link subscription_id to the payment record
        - Now payment_transactions.subscription_id = user_subscriptions.id
        
STEP 7: ✅ INSERT INTO billing_cycles
        - Creates cycle #1 for initial payment
        - cycle_number = 1
        - Links to subscription_id and payment_transaction_id
        
DONE: ✅✅✅ All 3 tables populated!
```

---

## 📋 What Data Goes Where - Summary Table

| Data | payment_transactions | user_subscriptions | billing_cycles |
|------|:---:|:---:|:---:|
| razorpay_payment_id | ✅ | ❌ | ❌ |
| razorpay_subscription_id (autopay) | ✅ | ✅ | ✅ |
| razorpay_order_id | ✅ | ❌ | ❌ |
| signature | ✅ | ❌ | ❌ |
| plan_tier | ✅ | ✅ | ✅ |
| amount paid | ✅ | ✅ | ✅ |
| currency | ✅ | ✅ | ✅ |
| status | ✅ | ✅ | ✅ |
| period_start/end | ❌ | ✅ | ✅ |
| cycle_number | ❌ | ❌ | ✅ |
| billing_cycle_count | ❌ | ✅ | ❌ |
| total_paid | ❌ | ✅ | ❌ |

---

## 🔐 Important: ID System

### In payment_transactions:
```javascript
user_id: auth_user_id  // From Supabase auth.users.id
```

### In user_subscriptions:
```javascript
user_id: profile_id    // From user_profiles.id (NOT auth_user_id!)
```

**Why different?**
- `auth_user_id` = authentication UUID (from Supabase Auth)
- `profile_id` = application profile UUID (one per role: Startup, Investor, etc.)
- One auth_user_id can have multiple profile_ids
- user_subscriptions uses profile_id to know WHICH profile owns the subscription

**Conversion:**
```javascript
// Convert auth_user_id → profile_id
const { data: userProfiles } = await supabase
  .from('user_profiles')
  .select('id')
  .eq('auth_user_id', user_id);
// Use userProfiles[0].id as profile_id
```

---

## 🔗 CASCADE Delete Behavior

**When subscription deleted:**
```sql
DELETE FROM user_subscriptions WHERE id = 'subscription-id'
```

**Database automatically does:**
```
1. subscription_id references in billing_cycles
   └─ ON DELETE CASCADE → All billing_cycles deleted
   
2. subscription_id references in payment_transactions
   └─ ON DELETE SET NULL → subscription_id becomes NULL (payment record preserved)
```

**Result:**
- ✅ billing_cycles completely removed
- ✅ payment_transactions preserved (with subscription_id = NULL)
- ✅ Audit trail maintained

---

## 📊 Example: Complete Payment Flow

**User buys "Premium Plan" for ₹999.00 (18% tax)**

### Before Payment:
```
payment_transactions: Empty
user_subscriptions: Empty
billing_cycles: Empty
```

### After Payment Completed:

#### payment_transactions:
```
id: 'trans-123'
user_id: 'auth-user-456'
subscription_id: 'sub-789'     (filled later)
gateway_payment_id: 'pay_ABC123DEF'
amount: 999.00
status: 'success'
payment_gateway: 'razorpay'
plan_tier: 'premium'
metadata: { tax: 18%, tax_amount: 150 }
```

#### user_subscriptions:
```
id: 'sub-789'
user_id: 'profile-456'         (NOT auth_user_id!)
plan_id: 'plan-xyz'
plan_tier: 'premium'
status: 'active'
razorpay_subscription_id: 'sub_S4z1K...'
autopay_enabled: true
billing_cycle_count: 1
total_paid: 999.00
next_billing_date: 2026-02-17
```

#### billing_cycles:
```
id: 'cycle-001'
subscription_id: 'sub-789'
cycle_number: 1
payment_transaction_id: 'trans-123'
period_start: 2026-01-17
period_end: 2026-02-17
amount: 999.00
status: 'paid'
plan_tier: 'premium'
```

**Links:**
- `payment_transactions.id` ('trans-123') ← → `billing_cycles.payment_transaction_id`
- `user_subscriptions.id` ('sub-789') ← → `billing_cycles.subscription_id`
- `payment_transactions.subscription_id` ('sub-789') ← → `user_subscriptions.id`

---

## 🎯 Key Takeaways

1. **3 tables are written to** after payment success:
   - `payment_transactions` (payment record)
   - `user_subscriptions` (subscription record)
   - `billing_cycles` (billing period record)

2. **Order of insertion:**
   - payment_transactions first
   - user_subscriptions second
   - billing_cycles third
   - payment_transactions updated to link subscription_id

3. **No data is stored without going through these 3 tables**
   - All payment metadata captured in one of these
   - Backup system: payment_transactions preserved even if subscription deleted

4. **Cascading deletes work correctly:**
   - Delete subscription → billing_cycles auto-deleted
   - Delete subscription → payment_transactions.subscription_id becomes NULL
   - Payment audit trail preserved

