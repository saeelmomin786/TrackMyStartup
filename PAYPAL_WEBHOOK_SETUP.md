# PayPal Webhook Setup for Mentor Payments

## ✅ Using Existing Webhook

The mentor payment system uses the **same webhook endpoint** as startup subscriptions:
- **Webhook URL**: `https://yourdomain.com/api/paypal/webhook`

## 📋 PayPal Account Configuration

### Step 1: Go to PayPal Developer Dashboard
1. Login to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to: **Your App** → **Webhooks**

### Step 2: Verify/Add Webhook URL
- **URL**: `https://yourdomain.com/api/paypal/webhook`
- This is the **same URL** used for startup subscriptions

### Step 3: Subscribe to Required Events

**For Mentor Payments (One-Time Payments):**
- ✅ `PAYMENT.CAPTURE.COMPLETED` - **Required** (payment completed)
- ✅ `CHECKOUT.ORDER.COMPLETED` - **Optional** (order completion)

**For Startup Subscriptions (Recurring Payments):**
- ✅ `BILLING.SUBSCRIPTION.*` events (already subscribed)
- ✅ `PAYMENT.SALE.COMPLETED` (recurring payment)

### Step 4: Verify Webhook is Active
- Status should show: **Active** ✅
- Test webhook delivery to ensure it's working

---

## 🔄 How It Works

### Payment Flow:
1. **Startup clicks "Pay Now"**
   - Creates PayPal order
   - Stores `paypal_order_id` in `mentor_payments` table

2. **Startup completes payment**
   - PayPal captures payment
   - Frontend calls `completePayment()` (immediate update)

3. **PayPal sends webhook**
   - Event: `PAYMENT.CAPTURE.COMPLETED`
   - Webhook checks: Is this a mentor payment?
     - ✅ Yes → Updates `mentor_payments` and activates assignment
     - ❌ No → Processes as subscription payment (existing logic)

---

## ✅ Benefits of Using Same Webhook

1. **No PayPal Account Changes Needed** - If you already have webhook configured
2. **Simpler Setup** - One webhook URL for everything
3. **Easier Maintenance** - All payment events in one place
4. **Automatic Routing** - System automatically detects payment type

---

## 🧪 Testing

### Test Mentor Payment Webhook:
1. Make a test mentor payment
2. Check webhook logs in PayPal Dashboard
3. Verify payment status updates in database
4. Check assignment status becomes 'active'

---

## 📝 Notes

- **One-Time Payments**: No subscription setup needed
- **No Auto-Pay**: Mentor payments are one-time only
- **Same Credentials**: Uses same PayPal Client ID/Secret
- **Multi-Currency**: Works with all currencies (EUR/USD/INR/etc.)

---

**Status**: ✅ Ready to use with existing webhook setup!
