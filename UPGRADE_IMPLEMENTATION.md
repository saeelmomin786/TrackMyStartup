# Plan Upgrade & Downgrade Implementation

## Overview
This document describes the plan upgrade and downgrade flows when a user changes their plan tier mid-cycle.

## Approach
When a user upgrades their plan mid-cycle:
1. **Keep old subscription active** until its billing cycle ends
2. **Stop autopay** for the old subscription (cancel Razorpay subscription)
3. **Create new Premium subscription** starting immediately
4. **User gets Premium access immediately** (highest tier wins)
5. **Both subscriptions exist** until Basic cycle ends

## Implementation Details

### 1. Upgrade Endpoint
**Endpoint:** `POST /api/subscriptions/upgrade`

**Request Body:**
```json
{
  "user_id": "uuid",
  "new_plan_tier": "premium" // or "basic"
}
```

**Process:**
1. Validates user has an active subscription
2. Validates upgrade is valid (not downgrade, not same tier)
3. Gets new plan details from `subscription_plans` table
4. Cancels Razorpay subscription for old plan (stops autopay)
5. Disables autopay in database for old subscription (keeps status='active')
6. Creates new Razorpay subscription for Premium plan
7. Creates new subscription record in database
8. Creates payment transaction record (status='pending')
9. Creates billing cycle record (status='pending')
10. Records change in `subscription_changes` table

**Response:**
```json
{
  "success": true,
  "message": "Successfully upgraded to premium plan",
  "subscription": {
    "id": "uuid",
    "plan_tier": "premium",
    "amount": 999,
    "currency": "INR",
    "current_period_start": "2024-01-15T10:00:00Z",
    "current_period_end": "2024-02-15T10:00:00Z",
    "razorpay_subscription_id": "sub_xxx"
  },
  "razorpay_subscription": { ... },
  "old_subscription_cancelled": true
}
```

### 2. Database Function Update
**File:** `database/28_update_get_user_plan_tier_for_upgrades.sql`

**Change:** Updated `get_user_plan_tier()` function to return the **highest tier** when multiple active subscriptions exist.

**Priority Order:**
- `premium` > `basic` > `free`
- If same tier, returns most recent subscription

**Why:** This ensures users get Premium access immediately when upgrading, even if Basic subscription is still active until its cycle ends.

### 3. Subscription States After Upgrade

**Old Subscription (Basic):**
- `status`: `'active'` (remains active until cycle ends)
- `autopay_enabled`: `false` (autopay stopped)
- `mandate_status`: `'cancelled'` (Razorpay subscription cancelled)
- `current_period_end`: Original end date (unchanged)

**New Subscription (Premium):**
- `status`: `'active'` (active immediately)
- `autopay_enabled`: `true` (autopay enabled)
- `mandate_status`: `'pending'` (will be updated via webhook)
- `current_period_start`: Upgrade date
- `current_period_end`: Upgrade date + 1 month/year
- `previous_plan_tier`: `'basic'`
- `previous_subscription_id`: ID of old subscription

### 4. Payment Flow

**Initial Payment:**
- When Razorpay subscription is created, user must authorize payment method
- Once authorized, Razorpay charges the first month/year
- Webhook `subscription.activated` fires → updates subscription status
- Webhook `subscription.charged` fires → updates payment transaction and billing cycle

**Payment Transaction:**
- `payment_type`: `'upgrade'`
- `plan_tier_before`: `'basic'`
- `plan_tier_after`: `'premium'`
- `status`: `'pending'` → `'completed'` (via webhook)

### 5. Feature Access

**During Dual Subscription Period:**
- `get_user_plan_tier(user_id)` returns `'premium'` (highest tier)
- User has access to all Premium features
- Basic subscription remains active but doesn't grant access (lower tier)

**After Basic Cycle Ends:**
- Basic subscription expires naturally (status may change to 'expired' or 'cancelled')
- Only Premium subscription remains active
- User continues to have Premium access

### 6. Subscription Changes Tracking

**Recorded in `subscription_changes` table:**
- `change_type`: `'upgrade'`
- `plan_tier_before`: `'basic'`
- `plan_tier_after`: `'premium'`
- `amount_before_inr`: Basic plan price
- `amount_after_inr`: Premium plan price
- `old_billing_end`: Basic subscription end date
- `new_billing_start`: Premium subscription start date
- `new_billing_end`: Premium subscription end date
- `autopay_before`: `true`
- `autopay_after`: `true` (for Premium)
- `reason`: `"Upgraded from basic to premium plan"`
- `initiated_by`: `'user'`

## Testing Checklist

- [ ] Upgrade from Basic to Premium mid-cycle
- [ ] Verify old subscription remains active but autopay is disabled
- [ ] Verify new Premium subscription is created and active
- [ ] Verify `get_user_plan_tier()` returns `'premium'`
- [ ] Verify Premium features are accessible
- [ ] Verify payment transaction is created with `payment_type='upgrade'`
- [ ] Verify billing cycle is created for Premium subscription
- [ ] Verify subscription change is recorded
- [ ] Verify webhook updates payment status correctly
- [ ] Verify Basic subscription expires naturally after cycle ends

## Downgrade Implementation

### Downgrade Endpoint
**Endpoint:** `POST /api/subscriptions/downgrade`

**Request Body:**
```json
{
  "user_id": "uuid",
  "new_plan_tier": "basic" // or "free"
}
```

**Process:**
1. Validates user has an active subscription
2. Validates downgrade is valid (not upgrade, not same tier)
3. For downgrade to 'free': Cancels subscription, stops autopay, keeps active until cycle ends
4. For downgrade to 'basic': 
   - Gets new plan details from `subscription_plans` table
   - Cancels Razorpay subscription for old plan (stops autopay)
   - Disables autopay in database for old subscription (keeps status='active')
   - Creates new Razorpay subscription for Basic plan
   - Creates new subscription record in database
   - Creates payment transaction record (status='pending')
   - Creates billing cycle record (status='pending')
   - Records change in `subscription_changes` table

**Response (for downgrade to Basic):**
```json
{
  "success": true,
  "message": "Successfully downgraded to basic plan...",
  "subscription": {
    "id": "uuid",
    "plan_tier": "basic",
    "amount": 499,
    "currency": "INR",
    "current_period_start": "2024-01-15T10:00:00Z",
    "current_period_end": "2024-02-15T10:00:00Z",
    "razorpay_subscription_id": "sub_xxx"
  },
  "old_subscription": {
    "id": "uuid",
    "plan_tier": "premium",
    "current_period_end": "2024-01-20T10:00:00Z",
    "will_expire": true
  },
  "razorpay_subscription": { ... },
  "old_subscription_cancelled": true,
  "note": "Your premium subscription remains active until Jan 20, but basic features are now available."
}
```

### Downgrade Behavior

**Premium → Basic:**
- Premium subscription remains active until its cycle ends
- Premium autopay is stopped
- Basic subscription is created immediately
- User gets Basic access immediately (but Premium tier still wins until Premium expires)
- When Premium expires, Basic becomes the active tier
- Both subscriptions exist during transition period

**Premium/Basic → Free:**
- Current subscription remains active until its cycle ends
- Autopay is stopped
- No new subscription created (user goes to free plan)
- User keeps current tier access until cycle ends
- After cycle ends, user has free plan access

### Feature Access During Downgrade

**During Dual Subscription Period (Premium → Basic):**
- `get_user_plan_tier(user_id)` returns `'premium'` (highest tier)
- User has access to Premium features until Premium expires
- Basic subscription is active but doesn't grant access (lower tier)
- When Premium expires, `get_user_plan_tier()` returns `'basic'`

**After Premium Expires:**
- Only Basic subscription remains active
- User has Basic access

## Notes

### Upgrade Notes:
- **No Proration:** User pays full Premium price immediately, no credit for unused Basic time
- **Immediate Access:** User gets Premium features immediately upon upgrade
- **Dual Subscriptions:** Both subscriptions exist until Basic cycle ends (expected behavior)
- **Autopay:** Only Premium subscription has autopay enabled
- **Payment Authorization:** User must authorize payment method for new Razorpay subscription

### Downgrade Notes:
- **No Refund:** User keeps Premium access until Premium cycle ends (they paid for it)
- **Immediate Basic Access:** Basic subscription starts immediately, but Premium tier wins until Premium expires
- **Dual Subscriptions:** Both subscriptions exist until Premium cycle ends (expected behavior)
- **Autopay:** Only Basic subscription has autopay enabled (Premium autopay is stopped)
- **Free Plan:** Downgrade to free just cancels autopay, user keeps current tier until cycle ends
