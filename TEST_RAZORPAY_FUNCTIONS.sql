-- Test Razorpay Functions
-- Run this in Supabase SQL Editor to test the functions

-- 1. Test create_razorpay_order function
SELECT 'Testing create_razorpay_order function...' as test_step;

-- Test with a dummy application ID (should return error gracefully)
SELECT 'Testing with non-existent application ID...' as test_step;

SELECT create_razorpay_order(
  '00000000-0000-0000-0000-000000000000'::UUID,
  1000.00,
  'INR',
  'test_receipt_123'
) as test_result;

-- This should return: {"success": false, "error": "Application not found", "application_id": "00000000-0000-0000-0000-000000000000"}

-- 2. Test verify_razorpay_payment function
SELECT 'Testing verify_razorpay_payment function...' as test_step;

SELECT verify_razorpay_payment(
  'order_00000000-0000-0000-0000-000000000000_1234567890',
  'pay_test123',
  'mock_signature_123'
) as test_result;

-- 3. Test handle_razorpay_webhook function
SELECT 'Testing handle_razorpay_webhook function...' as test_step;

SELECT handle_razorpay_webhook(
  'payment.captured',
  '{"id": "pay_test123", "order_id": "order_00000000-0000-0000-0000-000000000000_1234567890", "amount": "100000", "status": "captured"}'::JSON
) as test_result;

-- 4. Check if functions exist
SELECT 'Checking function existence...' as test_step;

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('create_razorpay_order', 'verify_razorpay_payment', 'handle_razorpay_webhook')
ORDER BY routine_name;

SELECT 'All tests completed!' as final_status;
