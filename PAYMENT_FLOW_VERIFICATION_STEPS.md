# Payment Flow Verification Steps

## ✅ Current Status

Based on your verification queries:
- ✅ **No data inconsistencies** - All payments have plan_tier, are linked to subscriptions
- ✅ **Plans exist** - 1 Basic plan and 1 Premium plan with plan_tier set
- ✅ **Database is healthy** - All constraints and data integrity checks pass

## 🔧 What Was Fixed

1. **Improved plan_tier lookup** in `server.js`:
   - Added detailed logging
   - Added fallback to infer plan_tier from plan name
   - Better error handling

2. **Created verification queries**:
   - `database/25_comprehensive_payment_verification.sql` - Complete payment verification
   - `database/26_check_plan_exists.sql` - Quick plan check
   - `database/27_final_payment_flow_check.sql` - Final end-to-end check

## 🚀 Next Steps

### Step 1: Restart Server (CRITICAL)
The server **must be restarted** for the code changes to take effect:

```bash
# In your terminal:
# 1. Stop the current server (Ctrl+C)
# 2. Restart it:
npm run server
```

### Step 2: Make a Test Payment
After restarting:
1. Go through the payment flow
2. Select a plan (Basic or Premium)
3. Complete the payment
4. **Watch the server logs** - you should see:
   ```
   [verify] Looking up plan_tier for plan_id: <uuid>
   [verify] Found plan_tier: basic/premium for plan: <plan name>
   [verify] Final plan_tier to insert: basic/premium
   ```

### Step 3: Verify Payment Was Stored
Run this query in Supabase SQL Editor:

```sql
-- Run: database/27_final_payment_flow_check.sql
```

This will show:
- Complete payment flow for recent transactions
- Summary statistics
- Any issues found

## ✅ What to Verify After Payment

### 1. Initial Payment Stored ✅
```sql
SELECT * FROM payment_transactions 
WHERE payment_type = 'initial' 
ORDER BY created_at DESC LIMIT 1;
```

**Check:**
- ✅ `plan_tier` is NOT null (should be 'basic' or 'premium')
- ✅ `status` = 'success'
- ✅ `payment_type` = 'initial'
- ✅ `is_autopay` = true (for subscription payments)
- ✅ `amount` > 0

### 2. Subscription Created ✅
```sql
SELECT * FROM user_subscriptions 
WHERE status = 'active' 
ORDER BY created_at DESC LIMIT 1;
```

**Check:**
- ✅ `razorpay_subscription_id` is set
- ✅ `autopay_enabled` = true
- ✅ `mandate_status` = 'active'
- ✅ `payment_gateway` = 'razorpay'
- ✅ `current_period_start` and `current_period_end` are set correctly

### 3. Payment Linked to Subscription ✅
```sql
SELECT 
    pt.*,
    us.id as subscription_id,
    us.autopay_enabled,
    us.mandate_status
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
WHERE pt.payment_type = 'initial'
ORDER BY pt.created_at DESC LIMIT 1;
```

**Check:**
- ✅ `pt.subscription_id` is NOT null
- ✅ `pt.subscription_id` = `us.id`
- ✅ `pt.is_autopay` = `us.autopay_enabled`

## 🔍 Troubleshooting

### If plan_tier is still null:

1. **Check server logs** - Look for:
   - `[verify] Looking up plan_tier for plan_id: ...`
   - `[verify] Plan not found for plan_id: ...`
   - `[verify] No plan_id provided...`

2. **Verify plan_id is being sent** from frontend:
   - Check browser console for the payment verification request
   - Verify `plan_id` is in the request body

3. **Check if plan exists**:
   ```sql
   -- Run: database/26_check_plan_exists.sql
   -- Verify the plan_id matches a plan in the database
   ```

4. **Check plan_id format**:
   - Should be a UUID (e.g., `478e8624-8229-451a-93f8-e1f261e8ca94`)
   - Not a Razorpay plan ID (e.g., `plan_S2ng78fxv26LDc`)

### If autopay is not enabled:

1. **Check subscription_id**:
   - `razorpay_subscription_id` should be set
   - Format: `sub_...` (Razorpay subscription ID)

2. **Check mandate status**:
   - Should be set to 'active' after webhook processes
   - Webhook: `subscription.activated` event

## 📊 Expected Flow

1. **User selects plan** → Frontend sends `planTier` ('basic' or 'premium')
2. **Payment page loads** → Fetches plan from database using `planTier`
3. **User completes payment** → Razorpay processes payment
4. **Payment success** → Frontend calls `/api/razorpay/verify` with:
   - `plan_id` (UUID from database)
   - `razorpay_subscription_id` (for autopay)
   - Payment details
5. **Server verifies** → Looks up `plan_tier` from `plan_id`
6. **Server stores**:
   - Payment transaction with `plan_tier`
   - Subscription with `autopay_enabled = true`
7. **Webhook processes** → Updates mandate details

## 🎯 Success Criteria

After making a payment, you should see:

✅ Payment transaction stored with `plan_tier` set  
✅ Subscription created with `autopay_enabled = true`  
✅ Payment linked to subscription (`subscription_id` set)  
✅ Billing period set correctly (30 days for monthly)  
✅ No errors in server logs  
✅ All verification queries return ✅ status

## 📝 Notes

- **Initial payment**: Yes, when autopay is set up, the first month's payment is taken immediately
- **Autopay setup**: Happens during the initial checkout - user authorizes recurring payments
- **Mandate ID**: Fetched from Razorpay via webhook after subscription activation
- **Storage**: All payment details, subscription details, and autopay status are stored in Supabase
