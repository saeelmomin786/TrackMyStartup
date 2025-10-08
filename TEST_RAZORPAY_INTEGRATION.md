# 🧪 Test Razorpay Integration

## Step 1: Verify Environment Setup

1. **Check if your `.env.local` file exists**
2. **Verify your Razorpay keys are loaded:**
   ```javascript
   console.log('Razorpay Key ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
   ```

## Step 2: Test Database Functions

Run this in Supabase SQL Editor to test the functions:

```sql
-- Test creating an order
SELECT create_razorpay_order(
  '00000000-0000-0000-0000-000000000000'::UUID,
  1000.00,
  'INR',
  'test_receipt_123'
);
```

Expected result:
```json
{
  "success": true,
  "order_id": "order_00000000-0000-0000-0000-000000000000_1234567890",
  "amount": 1000.00,
  "currency": "INR"
}
```

## Step 3: Test Payment Flow

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the application**
3. **Try to make a payment**
4. **Use test card details:**
   - **Card Number:** `4111 1111 1111 1111`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVV:** Any 3 digits (e.g., `123`)
   - **Name:** Any name
   - **Email:** Any valid email

## Step 4: Verify Payment Success

After successful payment:
1. **Check the database** - payment status should be updated
2. **Check the application** - payment status should show "paid"
3. **Verify order creation** - order should be created in `incubation_payments`

## Step 5: Test Different Scenarios

### ✅ Success Cases:
- Valid test card payment
- Payment with different amounts
- Payment with different currencies

### ❌ Error Cases:
- Invalid card number
- Expired card
- Insufficient funds
- Payment cancellation

## Step 6: Production Readiness Checklist

- [ ] Real Razorpay API keys configured
- [ ] Database functions working
- [ ] Payment flow tested
- [ ] Error handling working
- [ ] Payment verification working
- [ ] Status updates working
- [ ] Mobile responsive
- [ ] Security measures in place

## Troubleshooting

### Common Issues:

1. **"Invalid Key ID"**
   - Check if your Razorpay key is correct
   - Ensure you're using the right environment (test/live)

2. **"Payment verification failed"**
   - Check if the database functions are working
   - Verify the payment signature verification

3. **"Order not found"**
   - Check if the order was created in the database
   - Verify the application ID is correct

4. **"Payment cancelled"**
   - This is normal user behavior
   - Test with a successful payment

## Success Indicators:

- ✅ Razorpay checkout opens
- ✅ Payment processes successfully
- ✅ Database updates correctly
- ✅ Application status changes
- ✅ No console errors
- ✅ Mobile responsive

## Next Steps After Testing:

1. **Configure webhooks** for production
2. **Set up monitoring** for payment failures
3. **Implement refunds** if needed
4. **Add payment analytics**
5. **Go live** with real payments

Your Razorpay integration is now ready for production! 🚀












