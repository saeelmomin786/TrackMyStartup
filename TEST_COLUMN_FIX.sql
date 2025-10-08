-- Test Column Reference Fix
-- Run this in Supabase SQL Editor to verify the functions work without non-existent column references

-- 1. Test create_razorpay_order function (should return error for non-existent application)
SELECT 'Testing create_razorpay_order with non-existent application...' as test_step;

SELECT create_razorpay_order(
  '00000000-0000-0000-0000-000000000000'::UUID,
  1000.00,
  'INR',
  'test_receipt_column_fix'
) as test_result;

-- Expected result: {"success": false, "error": "Application not found", "application_id": "00000000-0000-0000-0000-000000000000"}

-- 2. Test verify_razorpay_payment function (should work without updated_at references)
SELECT 'Testing verify_razorpay_payment function...' as test_step;

SELECT verify_razorpay_payment(
  'order_test_123',
  'pay_test_123',
  'mock_signature_123'
) as test_result;

-- Expected result: {"verified": false, "error": "Payment record not found"}

-- 3. Test handle_razorpay_webhook function (should work without updated_at references)
SELECT 'Testing handle_razorpay_webhook function...' as test_step;

SELECT handle_razorpay_webhook(
  'payment.captured',
  '{"id": "pay_test_123", "order_id": "order_test_123", "amount": "100000", "status": "captured"}'::JSON
) as test_result;

-- Expected result: {"success": true}

-- 4. Check table structure to confirm columns
SELECT 'Checking incubation_payments table structure...' as test_step;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'incubation_payments'
ORDER BY ordinal_position;

-- 5. Check opportunity_applications table structure
SELECT 'Checking opportunity_applications table structure...' as test_step;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'opportunity_applications'
ORDER BY ordinal_position;

-- 6. Test with real data if available
SELECT 'Testing with real application data...' as test_step;

WITH real_app AS (
  SELECT id FROM opportunity_applications ORDER BY created_at DESC LIMIT 1
)
SELECT 
  CASE 
    WHEN real_app.id IS NOT NULL THEN 'Real application found'
    ELSE 'No applications available for testing'
  END as app_status,
  CASE 
    WHEN real_app.id IS NOT NULL THEN create_razorpay_order(
      real_app.id,
      1000.00,
      'INR',
      'test_receipt_real'
    )
    ELSE '{"success": false, "error": "No applications available"}'
  END as test_result
FROM real_app;

SELECT 'All column reference issues should be fixed!' as final_status;












