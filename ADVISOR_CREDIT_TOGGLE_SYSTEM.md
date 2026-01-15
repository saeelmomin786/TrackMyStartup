# Investment Advisor Credit Toggle System - Complete Guide

## Overview

The toggle button in the Investment Advisor dashboard controls premium access for startups. This document explains how it works, including auto-renewal functionality.

---

## How the Toggle Works

### Toggle ON (Enable Premium Access)

**What happens:**
1. **Credit Check**: System checks if advisor has at least 1 credit available
2. **Credit Deduction**: If credits available, deducts 1 credit from advisor's account
3. **Create Assignment**: Creates an `advisor_credit_assignments` record with:
   - `status: 'active'`
   - `auto_renewal_enabled: true` (default)
   - `start_date`: Current date
   - `end_date`: Current date + 1 month
4. **Create Subscription**: Creates/updates `user_subscriptions` record with:
   - `plan_tier: 'premium'`
   - `paid_by_advisor_id`: Advisor's auth user ID
   - `status: 'active'`
   - `current_period_start` and `current_period_end`: 1 month period
5. **Grant Premium Access**: Startup now has access to all premium features

**Requirements:**
- Advisor must have at least 1 credit available
- Button is disabled if no credits available

---

### Toggle OFF (Disable Auto-Renewal)

**What happens:**
1. **No Credit Check**: Turning OFF does NOT require credits
2. **Disable Auto-Renewal Only**: 
   - Sets `auto_renewal_enabled: false`
   - **Assignment stays active** until natural expiry date
   - **Premium access continues** until `end_date`
3. **No Subscription Change**: 
   - Subscription remains `status: 'active'`
   - Premium access continues until plan expires
4. **UI Update**: Toggle turns OFF, but premium continues

**Requirements:**
- No credits needed - can always turn OFF
- Premium access continues until expiry date
- After expiry, premium stops (no auto-renewal)

---

## Auto-Renewal System

### How Auto-Renewal Works

**Process (runs daily via cron job):**

1. **Find Expiring Assignments**:
   - Query `advisor_credit_assignments` for:
     - `status: 'active'`
     - `auto_renewal_enabled: true`
     - `end_date` <= tomorrow

2. **For Each Expiring Assignment**:

   **If Credits Available:**
   - Check advisor has at least 1 credit
   - Deduct 1 credit from advisor account
   - Create new assignment with:
     - New `start_date`: Previous `end_date`
     - New `end_date`: Previous `end_date` + 1 month
     - `auto_renewal_enabled: true` (keeps auto-renewal ON)
   - Update subscription:
     - Extend `current_period_end` by 1 month
     - Keep `status: 'active'`
   - **Result**: Premium access continues seamlessly

   **If NO Credits Available:**
   - Set assignment `status: 'expired'`
   - Set `auto_renewal_enabled: false`
   - Set `expired_at`: Current timestamp
   - Cancel subscription: `status: 'inactive'`
   - **Result**: Premium access stops, toggle turns OFF automatically

3. **Return Statistics**:
   - `renewed`: Number of successful renewals
   - `failed`: Number of failed renewals (no credits)

---

## Premium Access Mechanism

### How Premium Access is Granted

**Database Flow:**

1. **Credit Assignment** (`advisor_credit_assignments`):
   ```
   - advisor_user_id: Advisor's auth user ID
   - startup_user_id: Startup's auth user ID
   - status: 'active'
   - auto_renewal_enabled: true/false
   - start_date: When premium started
   - end_date: When premium expires
   - subscription_id: Links to user_subscriptions
   ```

2. **User Subscription** (`user_subscriptions`):
   ```
   - user_id: Startup's auth user ID
   - plan_tier: 'premium'
   - paid_by_advisor_id: Advisor's auth user ID
   - status: 'active' (grants premium access)
   - current_period_start: Start of premium period
   - current_period_end: End of premium period
   ```

3. **Feature Access Check**:
   - System checks `user_subscriptions` table:
     - `status = 'active'`
     - `plan_tier = 'premium'`
     - `current_period_end > NOW()`
     - `paid_by_advisor_id IS NOT NULL` (advisor-paid)
   - If all conditions met → Premium features enabled
   - If any condition fails → Premium features disabled

---

## Toggle States

### Toggle ON (Blue)
- **Visual**: Blue background, toggle switch on right
- **Meaning**: Premium access is ACTIVE and auto-renewal is ENABLED
- **Assignment**: `status: 'active'`, `end_date > NOW()`, `auto_renewal_enabled: true`
- **Subscription**: `status: 'active'`, `plan_tier: 'premium'`
- **Behavior**: Will auto-renew when credits available

### Toggle OFF (Gray)
- **Visual**: Gray background, toggle switch on left
- **Meaning**: Auto-renewal is DISABLED
- **Assignment**: `status: 'active'` (if not expired) OR `status: 'expired'` (if expired)
- **Subscription**: `status: 'active'` (if not expired) OR `status: 'inactive'` (if expired)
- **Behavior**: 
  - If plan not expired: Premium continues until `end_date`, then stops
  - If plan expired: Premium already stopped, no auto-renewal

---

## Auto-Renewal Toggle Behavior

### When Toggle is ON:
- **Auto-Renewal ON** (default):
  - Assignment will auto-renew if credits available
  - Premium continues seamlessly each month
  - If credits run out → Auto-renewal turns OFF, premium expires

- **Auto-Renewal OFF**:
  - Assignment expires naturally at `end_date`
  - Premium stops after current period
  - No automatic renewal

### When Toggle is OFF:
- **Auto-Renewal**: Always OFF
- **Premium**: Immediately disabled
- **Credits**: Not checked (not needed to turn OFF)

---

## Error Handling

### "No credits available" Error

**When it appears:**
- Only when trying to turn toggle ON
- Never when turning toggle OFF

**Why it happens:**
- Advisor has 0 credits available
- Button is disabled to prevent this error

**Solution:**
- Purchase more credits from Account tab
- Then try toggling ON again

---

## Summary Flow Diagram

```
TOGGLE ON:
  Check Credits (≥1) → Deduct 1 Credit → Create Assignment → Create Subscription → Premium Active

TOGGLE OFF:
  No Credit Check → Disable Auto-Renewal → Premium Continues Until Expiry → Then Stops

TOGGLE ON (after expiry):
  Check Credits (≥1) → Reuse/Update Expired Assignment → Deduct 1 Credit → Create/Update Subscription → Premium Active

AUTO-RENEWAL (Daily Cron):
  Find Expiring Assignments (auto_renewal_enabled = true)
  → For each:
    → IF Credits Available:
        Deduct 1 Credit → Create New Assignment → Extend Subscription → Premium Continues
    → IF NO Credits:
        Expire Assignment → Cancel Subscription → Toggle Turns OFF → Premium Stops
```

---

## Key Points

1. **Toggle OFF**: Always works, no credits needed
2. **Toggle ON**: Requires at least 1 credit
3. **Auto-Renewal**: Only works when toggle is ON
4. **Premium Access**: Controlled by `user_subscriptions.status = 'active'`
5. **Credits**: Deducted when toggle ON, not when toggle OFF
6. **Immediate Effect**: Toggle OFF stops premium immediately

---

## Database Tables Involved

1. **`advisor_credits`**: Stores advisor's credit balance
2. **`advisor_credit_assignments`**: Tracks credit assignments to startups
3. **`user_subscriptions`**: Grants premium access to startups
4. **`credit_purchase_history`**: Records credit purchases

---

## API Functions

- `assignCredit()`: Creates assignment and subscription (toggle ON)
- `cancelAssignment()`: Expires assignment and cancels subscription (toggle OFF)
- `toggleAutoRenewal()`: Enables/disables auto-renewal (doesn't expire)
- `processAutoRenewals()`: Daily cron job for auto-renewal processing
