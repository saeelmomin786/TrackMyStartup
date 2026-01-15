# Razorpay Integration for Mentor Payments - Setup Guide

## Summary
Razorpay integration has been implemented for mentor payments when startup currency is INR. The system automatically uses Razorpay for INR payments and PayPal for other currencies.

## Changes Made

### 1. Database Changes (Supabase)
**File**: `ADD_RAZORPAY_TO_MENTOR_PAYMENTS.sql`

**Run this SQL in Supabase SQL Editor:**
```sql
-- Add razorpay_order_id column to mentor_payments table
ALTER TABLE public.mentor_payments
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Add razorpay_payment_id column to store payment ID after verification
ALTER TABLE public.mentor_payments
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_payments_razorpay_order_id 
ON public.mentor_payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_mentor_payments_razorpay_payment_id 
ON public.mentor_payments(razorpay_payment_id);
```

### 2. Backend Changes (server.js)
✅ **Already implemented:**
- `/api/razorpay/create-order` endpoint exists and handles amount conversion to paise
- `/api/razorpay/verify` endpoint updated to check for mentor payments first
- Razorpay webhook handler (`handlePaymentSuccess`) updated to process mentor payments
- All `completePayment` calls updated to support both PayPal and Razorpay

### 3. Frontend Changes
✅ **Already implemented:**
- `MentorPaymentPage.tsx` detects currency and uses Razorpay for INR, PayPal for others
- Payment flow handles both gateways correctly

## Setup Steps

### Step 1: Run Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Run the SQL from `ADD_RAZORPAY_TO_MENTOR_PAYMENTS.sql`
3. Verify columns were added:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'mentor_payments' 
   AND column_name IN ('razorpay_order_id', 'razorpay_payment_id');
   ```

### Step 2: Verify Backend Configuration
The backend already has:
- ✅ `/api/razorpay/create-order` endpoint
- ✅ `/api/razorpay/verify` endpoint (updated for mentor payments)
- ✅ Razorpay webhook handler (updated for mentor payments)

**No additional backend changes needed!**

### Step 3: Verify Environment Variables
Ensure these are set in your `.env` file:
```
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Step 4: Configure Razorpay Webhook (Production)
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
3. Subscribe to events:
   - `payment.captured`
   - `payment.failed`
   - `payment.refunded`

## How It Works

1. **Startup proposes amount in INR** → Stored in `mentor_requests.fee_currency = 'INR'`
2. **Mentor accepts** → Assignment created with `fee_currency = 'INR'`
3. **Startup clicks Payment** → System detects INR currency
4. **Razorpay payment flow:**
   - Frontend calls `/api/razorpay/create-order` with amount in major currency (₹200)
   - Backend converts to paise (20000) and creates Razorpay order
   - Frontend opens Razorpay checkout
   - User completes payment
   - Frontend calls `/api/razorpay/verify` with payment details
   - Backend verifies signature and completes payment
   - Webhook also processes payment (backup)

## Testing

1. Create a test startup with currency = 'INR'
2. Send mentor connection request
3. Mentor accepts request
4. Startup clicks "Payment" button
5. Should see Razorpay checkout (not PayPal)
6. Complete test payment
7. Verify payment status updates correctly

## Notes

- Amount conversion: Frontend sends amount in major currency (₹200), backend converts to paise (20000) for Razorpay
- Both frontend verification and webhook handle payment completion (redundancy for reliability)
- Payment gateway selection is automatic based on `assignment.fee_currency`
