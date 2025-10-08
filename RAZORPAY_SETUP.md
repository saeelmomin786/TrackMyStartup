# 🚀 Razorpay Integration Setup Guide

## Step 1: Get Your Razorpay API Keys

1. **Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)**
2. **Go to Account & Settings → API Keys**
3. **Generate your Key ID and Key Secret**
4. **Copy both keys - you'll need them**

## Step 2: Configure Your Environment

### Option A: Environment Variables (Recommended)

Create a `.env.local` file in your project root:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_id_here
VITE_RAZORPAY_KEY_SECRET=your_actual_key_secret_here
VITE_RAZORPAY_ENVIRONMENT=test

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Option B: Direct Configuration

Update `razorpay-config.js`:

```javascript
export const RAZORPAY_CONFIG = {
  // Replace with your actual keys
  keyId: 'rzp_test_your_actual_key_id_here',
  keySecret: 'your_actual_key_secret_here',
  environment: 'test', // 'test' or 'live'
  currency: 'INR',
  companyName: 'Your Company Name',
  companyDescription: 'Incubation Program Payment'
};
```

## Step 3: Run Database Setup

1. **Open Supabase SQL Editor**
2. **Run the `RAZORPAY_INTEGRATION.sql` script**
3. **Verify functions are created successfully**

## Step 4: Update Your Components

Replace the mock payment modals with real ones:

```typescript
// In FacilitatorView.tsx or OpportunitiesTab.tsx
import RealPaymentModal from './RealPaymentModal';

// Replace SimplePaymentModal with RealPaymentModal
<RealPaymentModal
  isOpen={isPaymentModalOpen}
  onClose={handleClosePayment}
  onPaymentSuccess={handlePaymentSuccess}
  applicationId={application.id}
  amount={application.feeAmount || 0}
  currency="INR"
  facilitatorName="Program Facilitator"
  programName={application.opportunityName}
  customerName="Customer Name"
  customerEmail="customer@example.com"
  customerPhone="9999999999"
/>
```

## Step 5: Test the Integration

### Test Mode (Development)
- Use test API keys
- Use test card numbers: `4111 1111 1111 1111`
- No real money will be charged

### Live Mode (Production)
- Use live API keys
- Real payments will be processed
- Ensure webhook endpoints are configured

## Step 6: Configure Webhooks (Optional)

1. **Go to Razorpay Dashboard → Settings → Webhooks**
2. **Add webhook URL:** `https://your-domain.com/api/razorpay-webhook`
3. **Select events:** `payment.captured`, `payment.failed`, `payment.refunded`
4. **Copy webhook secret for verification**

## Step 7: Security Best Practices

### ✅ Do's:
- Store API keys in environment variables
- Never expose Key Secret in frontend code
- Verify payment signatures on server
- Use HTTPS in production
- Implement proper error handling

### ❌ Don'ts:
- Don't hardcode API keys in source code
- Don't trust client-side payment data
- Don't skip payment verification
- Don't use test keys in production

## Step 8: Production Checklist

- [ ] Live API keys configured
- [ ] Webhook endpoints set up
- [ ] Payment verification implemented
- [ ] Error handling in place
- [ ] SSL certificate installed
- [ ] Test transactions completed
- [ ] Refund process tested

## Troubleshooting

### Common Issues:

1. **"Invalid Key ID"**
   - Check if key is correct
   - Ensure key is for correct environment (test/live)

2. **"Payment verification failed"**
   - Check webhook secret
   - Verify signature generation

3. **"Order not found"**
   - Check if order was created successfully
   - Verify order ID in database

### Support:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)
- [Supabase Documentation](https://supabase.com/docs)

## Test Card Details

### Test Cards (Test Mode Only):
- **Card Number:** 4111 1111 1111 1111
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **Name:** Any name
- **Email:** Any valid email

### Test UPI (Test Mode Only):
- **UPI ID:** success@razorpay
- **Amount:** Any amount

## Success! 🎉

Your Razorpay integration is now ready for real payments!












