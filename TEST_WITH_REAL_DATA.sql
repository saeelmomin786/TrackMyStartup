-- Test Razorpay Functions with Real Data
-- Run this in Supabase SQL Editor to test with actual application data

-- 1. First, let's find a real application ID to test with
SELECT 'Finding real application ID...' as test_step;

SELECT 
  id,
  startup_id,
  opportunity_id,
  status,
  created_at
FROM opportunity_applications 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Test create_razorpay_order with real application ID
SELECT 'Testing with real application ID...' as test_step;

-- This will use the first application found above
WITH real_app AS (
  SELECT id FROM opportunity_applications ORDER BY created_at DESC LIMIT 1
)
SELECT create_razorpay_order(
  real_app.id,
  1000.00,
  'INR',
  'test_receipt_real'
) as test_result
FROM real_app;

-- 3. Check if the payment was created
SELECT 'Checking created payment...' as test_step;

SELECT 
  id,
  application_id,
  amount,
  currency,
  status,
  razorpay_order_id,
  created_at
FROM incubation_payments 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Test verify_razorpay_payment with the created order
SELECT 'Testing payment verification...' as test_step;

WITH latest_payment AS (
  SELECT razorpay_order_id FROM incubation_payments ORDER BY created_at DESC LIMIT 1
)
SELECT verify_razorpay_payment(
  latest_payment.razorpay_order_id,
  'pay_test_real_123',
  'mock_signature_real_123'
) as test_result
FROM latest_payment;

-- 5. Check the updated payment status
SELECT 'Checking updated payment status...' as test_step;

SELECT 
  id,
  application_id,
  amount,
  status,
  razorpay_payment_id,
  paid_at
FROM incubation_payments 
ORDER BY created_at DESC 
LIMIT 1;

SELECT 'All tests completed with real data!' as final_status;












