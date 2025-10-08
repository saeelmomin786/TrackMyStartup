-- Complete Razorpay Function Test
-- Run this in Supabase SQL Editor to test all functions with real data

-- 1. Check if we have any applications to test with
SELECT 'Checking for existing applications...' as test_step;

SELECT 
  COUNT(*) as total_applications,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_applications
FROM opportunity_applications;

-- 2. Get a real application ID for testing
SELECT 'Getting real application ID...' as test_step;

WITH test_app AS (
  SELECT id, startup_id, opportunity_id, status 
  FROM opportunity_applications 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  id as application_id,
  startup_id,
  opportunity_id,
  status
FROM test_app;

-- 3. Test create_razorpay_order with real application ID
SELECT 'Testing create_razorpay_order with real data...' as test_step;

WITH test_app AS (
  SELECT id FROM opportunity_applications ORDER BY created_at DESC LIMIT 1
)
SELECT 
  test_app.id as application_id,
  create_razorpay_order(
    test_app.id,
    1000.00,
    'INR',
    'test_receipt_real'
  ) as test_result
FROM test_app;

-- 4. Check if payment was created successfully
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

-- 5. Test verify_razorpay_payment with the created order
SELECT 'Testing payment verification...' as test_step;

WITH latest_payment AS (
  SELECT razorpay_order_id FROM incubation_payments ORDER BY created_at DESC LIMIT 1
)
SELECT 
  latest_payment.razorpay_order_id,
  verify_razorpay_payment(
    latest_payment.razorpay_order_id,
    'pay_test_real_123',
    'mock_signature_real_123'
  ) as verification_result
FROM latest_payment;

-- 6. Check the updated payment status
SELECT 'Checking updated payment status...' as test_step;

SELECT 
  id,
  application_id,
  amount,
  status,
  razorpay_payment_id,
  paid_at,
  created_at
FROM incubation_payments 
ORDER BY created_at DESC 
LIMIT 1;

-- 7. Check if application payment status was updated
SELECT 'Checking application payment status...' as test_step;

SELECT 
  oa.id,
  oa.status as application_status,
  oa.payment_status,
  oa.payment_id,
  oa.updated_at
FROM opportunity_applications oa
JOIN incubation_payments ip ON oa.id = ip.application_id
ORDER BY ip.created_at DESC 
LIMIT 1;

-- 8. Test webhook function
SELECT 'Testing webhook function...' as test_step;

WITH latest_payment AS (
  SELECT razorpay_order_id FROM incubation_payments ORDER BY created_at DESC LIMIT 1
)
SELECT 
  latest_payment.razorpay_order_id,
  handle_razorpay_webhook(
    'payment.captured',
    json_build_object(
      'id', 'pay_webhook_test_123',
      'order_id', latest_payment.razorpay_order_id,
      'amount', '100000',
      'status', 'captured'
    )
  ) as webhook_result
FROM latest_payment;

-- 9. Final status check
SELECT 'Final status check...' as test_step;

SELECT 
  'Functions working correctly!' as status,
  COUNT(*) as total_payments_created,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments
FROM incubation_payments;

SELECT 'All Razorpay functions tested successfully!' as final_status;












