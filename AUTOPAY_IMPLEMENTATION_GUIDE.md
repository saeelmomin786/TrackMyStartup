# Autopay & Payment Failure Management - Implementation Guide

## ✅ What Has Been Implemented

This implementation covers:
1. **Stop Autopay** - User can stop autopay from account dashboard
2. **Bank/UPI Cancellation** - Handles when user cancels mandate from bank/UPI app
3. **Payment Failure Handling** - Grace period and retry mechanism
4. **Feature Locking** - Features lock when subscription period ends
5. **Subscription Expiration** - Automatic expiration check

---

## 📋 SQL Scripts to Run in Supabase

Run these scripts **in order** in your Supabase SQL Editor:

### Step 1: Add Autopay Cancellation Tracking
**File:** `database/21_add_autopay_cancellation_tracking.sql`

This script:
- Adds columns for tracking autopay cancellations
- Adds columns for payment failure tracking
- Creates functions for handling cancellations and failures
- Creates function for checking expired subscriptions

**Run this first!**

### Step 2: Enhance Feature Access with Period Check
**File:** `database/22_enhance_feature_access_with_period_check.sql`

This script:
- Updates `get_user_plan_tier()` to check period end
- Updates `can_user_access_feature()` to check period end
- Creates `is_subscription_valid()` function

**Run this second!**

---

## 🔧 What Each Script Does

### Script 1: `21_add_autopay_cancellation_tracking.sql`

**New Columns Added:**
- `autopay_cancelled_at` - When autopay was cancelled
- `autopay_cancellation_reason` - Why it was cancelled (user_cancelled, cancelled_from_bank, etc.)
- `mandate_last_synced_at` - Last time we checked mandate status from Razorpay
- `payment_failure_count` - Number of failed payment attempts
- `last_payment_failure_at` - Last payment failure timestamp
- `grace_period_ends_at` - Grace period end date (7 days after failure)
- `max_retry_attempts` - Maximum retry attempts (default: 3)

**New Functions Created:**
- `check_and_expire_subscriptions()` - Checks and expires subscriptions that should be inactive
- `handle_subscription_payment_failure()` - Handles payment failures, sets grace period
- `handle_autopay_cancellation()` - Handles autopay cancellations (from app or bank)

### Script 2: `22_enhance_feature_access_with_period_check.sql`

**Functions Updated:**
- `get_user_plan_tier()` - Now checks if `current_period_end > NOW()`
- `can_user_access_feature()` - Now checks period end before granting access
- `is_subscription_valid()` - New function to check subscription validity

---

## 🚀 How It Works

### Scenario 1: User Stops Autopay from Account Dashboard

```
1. User clicks "Stop Auto-Pay" in Account tab
   ↓
2. Frontend calls: POST /api/razorpay/stop-autopay
   ↓
3. Server cancels Razorpay subscription
   ↓
4. Database function: handle_autopay_cancellation()
   - Sets autopay_enabled = false
   - Sets mandate_status = 'cancelled'
   - Sets autopay_cancelled_at = NOW()
   - Keeps status = 'active' until period ends
   ↓
5. Subscription continues until current_period_end
   ↓
6. After period ends: check_and_expire_subscriptions() marks as 'inactive'
   ↓
7. Features lock automatically (FeatureGuard checks period end)
```

### Scenario 2: User Cancels from Bank/UPI App

```
1. User cancels mandate in UPI app (PhonePe, Google Pay, etc.)
   ↓
2. Razorpay sends webhook: subscription.paused or mandate.revoked
   ↓
3. Server webhook handler receives event
   ↓
4. Database function: handle_autopay_cancellation()
   - Sets autopay_enabled = false
   - Sets cancellation_reason = 'cancelled_from_bank'
   - Keeps status = 'active' until period ends
   ↓
5. Subscription continues until current_period_end
   ↓
6. After period ends: Features lock automatically
```

### Scenario 3: Payment Failure

```
1. Razorpay tries to charge → Payment fails
   ↓
2. Webhook: payment.failed or subscription.charged (failed)
   ↓
3. Database function: handle_subscription_payment_failure()
   - Increments payment_failure_count
   - Sets status = 'past_due' (or 'inactive' if max retries reached)
   - Sets grace_period_ends_at = NOW() + 7 days
   ↓
4. User can still access features during grace period
   ↓
5. After grace period: Features lock automatically
   ↓
6. User can reactivate by paying manually
```

### Scenario 4: Subscription Expiration

```
1. Cron job calls: POST /api/subscription/check-expired
   ↓
2. Database function: check_and_expire_subscriptions()
   - Finds subscriptions where:
     * current_period_end < NOW()
     * status = 'active' or 'past_due'
     * autopay_enabled = false OR grace_period expired
   ↓
3. Updates status to 'inactive'
   ↓
4. Records in subscription_changes table
   ↓
5. Features lock automatically (FeatureGuard checks status)
```

---

## 🔌 API Endpoints

### 1. Stop Autopay
**POST** `/api/razorpay/stop-autopay`

**Request Body:**
```json
{
  "subscription_id": "uuid",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-pay has been stopped...",
  "razorpay_cancelled": true,
  "subscription_id": "uuid"
}
```

### 2. Sync Mandate Status
**POST** `/api/razorpay/sync-mandate-status`

**Request Body:**
```json
{
  "subscription_id": "uuid",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "razorpay_status": "paused",
  "mandate_status": "cancelled",
  "synced_at": "2024-01-11T12:00:00Z"
}
```

### 3. Check Expired Subscriptions (Cron Job)
**POST** `/api/subscription/check-expired`

**Response:**
```json
{
  "message": "Expired 5 subscriptions",
  "count": 5,
  "subscription_ids": ["uuid1", "uuid2", ...]
}
```

---

## 📱 Frontend Changes

### AccountTab Component
- ✅ Updated `handleToggleAutopay()` to call `/api/razorpay/stop-autopay`
- ✅ Shows confirmation dialog with period end date
- ✅ Reloads data after stopping autopay

### Feature Access Service
- ✅ Updated to check `current_period_end` in addition to status
- ✅ Handles grace period for `past_due` status
- ✅ Falls back gracefully if database functions don't exist

---

## 🔔 Webhook Events Handled

### Razorpay Webhooks:
- `subscription.paused` - Handled by `handleSubscriptionPaused()`
- `subscription.cancelled` - Handled by `handleSubscriptionCancelled()`
- `mandate.revoked` - Handled by `handleMandateRevoked()` (NEW)
- `mandate.cancelled` - Handled by `handleMandateRevoked()` (NEW)
- `payment.failed` - Handled by `handlePaymentFailure()` (ENHANCED)
- `subscription.charged` (failed) - Handled by `handleSubscriptionChargeFailed()` (NEW)

---

## ⚙️ Cron Job Setup

Set up a cron job to check expired subscriptions daily:

**Option 1: External Cron Service (Recommended)**
- Use a service like cron-job.org or EasyCron
- Call: `POST https://your-domain.com/api/subscription/check-expired`
- Schedule: Daily at 2 AM UTC

**Option 2: Supabase Edge Functions**
- Create a Supabase Edge Function
- Schedule using Supabase Cron
- Call the database function directly

**Option 3: Application Server Cron**
- If you have a server, set up a cron job
- Call the API endpoint or database function directly

---

## 🧪 Testing Checklist

After running the SQL scripts:

1. **Test Stop Autopay:**
   - Go to Account tab
   - Click "Stop Auto-Pay"
   - Verify subscription continues until period ends
   - Verify features lock after period ends

2. **Test Bank Cancellation:**
   - Cancel mandate from UPI app
   - Verify webhook is received
   - Verify database is updated
   - Verify subscription continues until period ends

3. **Test Payment Failure:**
   - Simulate payment failure (use test card)
   - Verify status changes to 'past_due'
   - Verify grace period is set
   - Verify features still work during grace period
   - Verify features lock after grace period

4. **Test Feature Locking:**
   - Wait for subscription period to end
   - Verify features are locked
   - Verify upgrade prompt is shown

5. **Test Expiration Check:**
   - Manually set `current_period_end` to past date
   - Call `/api/subscription/check-expired`
   - Verify subscription is marked as 'inactive'

---

## 📊 Database Functions Reference

### `check_and_expire_subscriptions()`
- Checks for expired subscriptions
- Updates status to 'inactive'
- Records in subscription_changes
- Returns count and IDs

### `handle_subscription_payment_failure(subscription_id, failure_reason)`
- Increments failure count
- Sets status to 'past_due' or 'inactive'
- Sets grace period (7 days)
- Records in subscription_changes

### `handle_autopay_cancellation(subscription_id, reason, initiated_by)`
- Disables autopay
- Sets cancellation reason
- Keeps subscription active until period ends
- Records in subscription_changes

### `get_user_plan_tier(user_id)`
- Returns plan tier if subscription is valid
- Checks period end
- Returns 'free' if expired or no subscription

### `can_user_access_feature(user_id, feature_name)`
- Checks if user can access feature
- Validates subscription period
- Checks grace period for past_due
- Returns boolean

### `is_subscription_valid(user_id)`
- Checks if user has valid subscription
- Returns boolean

---

## 🚨 Important Notes

1. **Period End Check:** Features now check `current_period_end` in addition to status. This ensures features lock even if status is 'active' but period has ended.

2. **Grace Period:** Users with `past_due` status can still access features during the grace period (7 days). After grace period, features lock.

3. **Autopay Cancellation:** When autopay is cancelled (from app or bank), subscription continues until `current_period_end`. This gives users time to reactivate.

4. **Webhook Reliability:** Ensure Razorpay webhooks are configured correctly. Test webhook delivery in Razorpay dashboard.

5. **Cron Job:** Set up the expiration check cron job. Without it, subscriptions won't expire automatically (though features will still lock due to period check).

---

## ✅ Success Indicators

After implementation, you should see:

1. ✅ Database columns added successfully
2. ✅ Database functions created successfully
3. ✅ Webhook handlers updated
4. ✅ API endpoints working
5. ✅ Frontend stop autopay button working
6. ✅ Features lock when period ends
7. ✅ Payment failures handled gracefully
8. ✅ Bank cancellations detected and handled

---

## 🆘 Troubleshooting

### Issue: Features not locking after period ends
**Solution:** 
- Verify `check_and_expire_subscriptions()` function exists
- Verify cron job is running
- Check FeatureGuard is using updated `canAccessFeature()`

### Issue: Stop autopay not working
**Solution:**
- Verify API endpoint is accessible
- Check Razorpay keys are configured
- Verify database function `handle_autopay_cancellation()` exists

### Issue: Payment failures not handled
**Solution:**
- Verify webhook is configured in Razorpay
- Check webhook secret is set in environment
- Verify `handle_subscription_payment_failure()` function exists

---

## 📝 Next Steps

1. Run the SQL scripts in Supabase
2. Test stop autopay functionality
3. Set up cron job for expiration check
4. Test webhook delivery
5. Monitor logs for any errors

---

**Implementation Complete!** 🎉

All code changes have been made. Just run the SQL scripts in Supabase and you're good to go!
