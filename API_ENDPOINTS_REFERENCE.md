# Payment System API Endpoints Reference

## Base URL
All endpoints are relative to your server base URL (e.g., `http://localhost:3000`)

---

## 1. Create Subscription

**Endpoint:** `POST /api/razorpay/create-subscription`

**Description:** Creates a Razorpay subscription for autopay setup

**Request Body:**
```json
{
  "user_id": "uuid",
  "final_amount": 499,        // Amount in major currency (e.g., 499.00)
  "interval": "monthly",      // "monthly" or "yearly"
  "plan_name": "Basic Plan",
  "customer_notify": 1        // Optional, default: 1
}
```

**Response:**
```json
{
  "id": "sub_xxx",
  "status": "created",
  "plan_id": "plan_xxx",
  ...
}
```

**Use Case:** Initial subscription creation before payment

---

## 2. Verify Payment

**Endpoint:** `POST /api/razorpay/verify`

**Description:** Verifies payment and creates subscription in database

**Request Body:**
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "razorpay_subscription_id": "sub_xxx",
  "user_id": "uuid",
  "plan_id": "uuid"           // Plan ID from subscription_plans table
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and subscription created",
  "subscription": { ... }
}
```

**Use Case:** After successful payment, verify and store subscription

---

## 3. Upgrade Subscription

**Endpoint:** `POST /api/subscriptions/upgrade`

**Description:** Upgrades user from current plan to higher tier (e.g., Basic → Premium)

**Request Body:**
```json
{
  "user_id": "uuid",
  "new_plan_tier": "premium"  // "basic" or "premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully upgraded to premium plan",
  "subscription": {
    "id": "uuid",
    "plan_tier": "premium",
    "amount": 999,
    "current_period_start": "2024-01-15T10:00:00Z",
    "current_period_end": "2024-02-15T10:00:00Z"
  },
  "razorpay_subscription": { ... },
  "old_subscription_cancelled": true
}
```

**Behavior:**
- Keeps old subscription active until cycle ends
- Stops autopay for old subscription
- Creates new subscription immediately
- User gets new tier access immediately

**Use Case:** User wants to upgrade plan mid-cycle

---

## 4. Downgrade Subscription

**Endpoint:** `POST /api/subscriptions/downgrade`

**Description:** Downgrades user from current plan to lower tier (e.g., Premium → Basic)

**Request Body:**
```json
{
  "user_id": "uuid",
  "new_plan_tier": "basic"    // "basic" or "free"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully downgraded to basic plan...",
  "subscription": {
    "id": "uuid",
    "plan_tier": "basic",
    "amount": 499,
    ...
  },
  "old_subscription": {
    "id": "uuid",
    "plan_tier": "premium",
    "current_period_end": "2024-01-20T10:00:00Z",
    "will_expire": true
  },
  "note": "Your premium subscription remains active until Jan 20..."
}
```

**Behavior:**
- Keeps old subscription active until cycle ends
- Stops autopay for old subscription
- Creates new subscription immediately
- User keeps old tier access until old subscription expires

**Use Case:** User wants to downgrade plan mid-cycle

---

## 5. Stop Autopay

**Endpoint:** `POST /api/razorpay/stop-autopay`

**Description:** Stops autopay for a subscription (cancels recurring payments)

**Request Body:**
```json
{
  "subscription_id": "uuid",  // Subscription ID from user_subscriptions table
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-pay has been stopped. Your subscription will continue until the current billing period ends.",
  "razorpay_cancelled": true,
  "subscription_id": "uuid"
}
```

**Behavior:**
- Cancels Razorpay subscription
- Disables autopay in database
- Keeps subscription active until cycle ends

**Use Case:** User wants to cancel recurring payments

---

## 6. Webhook Endpoint

**Endpoint:** `POST /api/razorpay/webhook`

**Description:** Handles Razorpay webhook events

**Events Handled:**
- `subscription.activated` - Subscription activated, mandate created
- `subscription.charged` - Recurring payment charged
- `subscription.paused` - Subscription paused
- `subscription.cancelled` - Subscription cancelled
- `mandate.revoked` - Mandate revoked by user
- `mandate.cancelled` - Mandate cancelled
- `payment.failed` - Payment failed

**Note:** This endpoint is called by Razorpay, not directly by your app

---

## 7. Get Subscription Status

**Endpoint:** `GET /api/subscription/status/:userId`

**Description:** Gets user's current subscription status

**Response:**
```json
{
  "subscription": {
    "id": "uuid",
    "status": "active",
    "plan": {
      "name": "Basic Plan",
      "price": 499
    },
    ...
  }
}
```

**Use Case:** Check user's subscription status

---

## 8. Check Expired Subscriptions

**Endpoint:** `POST /api/subscription/check-expired`

**Description:** Cron job endpoint to check and expire subscriptions

**Response:**
```json
{
  "message": "Expired 5 subscriptions",
  "count": 5,
  "subscription_ids": ["uuid1", "uuid2", ...]
}
```

**Use Case:** Scheduled job to expire subscriptions

---

## 9. Sync Mandate Status

**Endpoint:** `POST /api/razorpay/sync-mandate-status`

**Description:** Syncs mandate status from Razorpay

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
  "razorpay_status": "active",
  "mandate_status": "active",
  "updated": true
}
```

**Use Case:** Manually sync mandate status if needed

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (subscription/user not found)
- `500` - Server Error

---

## Testing Tips

1. **Use Test Mode:** Ensure Razorpay is in test mode
2. **Test Cards:** Use Razorpay test cards for payments
3. **Webhooks:** Use Razorpay webhook testing tool or ngrok for local testing
4. **Database:** Always verify database state after each operation
5. **Logs:** Check server logs for detailed error messages

---

## Flow Diagrams

### Initial Payment Flow
```
1. Create Subscription → 2. User Pays → 3. Verify Payment → 4. Webhook (activated)
```

### Upgrade Flow
```
1. Upgrade Endpoint → 2. Cancel Old Autopay → 3. Create New Subscription → 4. User Pays → 5. Webhook
```

### Downgrade Flow
```
1. Downgrade Endpoint → 2. Cancel Old Autopay → 3. Create New Subscription → 4. User Pays → 5. Webhook
```

### Recurring Payment Flow
```
1. Razorpay Charges → 2. Webhook (charged) → 3. Update Database
```
