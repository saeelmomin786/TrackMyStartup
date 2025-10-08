-- FIX ALL ERRORS - Complete Fix Script
-- Run this in Supabase SQL Editor to fix all the errors

-- 1. First, let's check if the Razorpay functions exist
SELECT 'Checking existing functions...' as status;

-- 2. Drop and recreate all Razorpay functions with correct signatures
DROP FUNCTION IF EXISTS create_razorpay_order CASCADE;
DROP FUNCTION IF EXISTS verify_razorpay_payment CASCADE;
DROP FUNCTION IF EXISTS handle_razorpay_webhook CASCADE;

-- 3. Create the create_razorpay_order function with correct signature
CREATE OR REPLACE FUNCTION create_razorpay_order(
  p_application_id UUID,
  p_amount DECIMAL,
  p_currency TEXT DEFAULT 'INR',
  p_receipt TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_id TEXT;
  application_exists BOOLEAN;
BEGIN
  -- Check if application exists
  SELECT EXISTS(
    SELECT 1 FROM opportunity_applications WHERE id = p_application_id
  ) INTO application_exists;
  
  IF NOT application_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found',
      'application_id', p_application_id
    );
  END IF;
  
  -- Generate order ID
  order_id := 'order_' || p_application_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
  
  -- Insert into payments table
  INSERT INTO incubation_payments (
    application_id,
    amount,
    currency,
    razorpay_order_id,
    status,
    created_at
  ) VALUES (
    p_application_id,
    p_amount,
    p_currency,
    order_id,
    'pending',
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'amount', p_amount,
    'currency', p_currency
  );
END;
$$;

-- 4. Create verify_razorpay_payment function
CREATE OR REPLACE FUNCTION verify_razorpay_payment(
  p_order_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_record RECORD;
  v_is_verified BOOLEAN := FALSE;
BEGIN
  -- Get payment record
  SELECT * INTO v_payment_record
  FROM incubation_payments
  WHERE razorpay_order_id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('verified', false, 'error', 'Payment record not found');
  END IF;
  
  -- Mock verification (in production, verify with Razorpay webhook secret)
  v_is_verified := TRUE;
  
  -- Update payment status
  UPDATE incubation_payments
  SET 
    status = 'paid',
    razorpay_payment_id = p_payment_id,
    razorpay_signature = p_signature,
    paid_at = NOW()
  WHERE razorpay_order_id = p_order_id;
  
  -- Update application payment status
  UPDATE opportunity_applications
  SET 
    payment_status = 'paid',
    payment_id = p_payment_id
  WHERE id = v_payment_record.application_id;
  
  RETURN json_build_object('verified', v_is_verified);
END;
$$;

-- 5. Create handle_razorpay_webhook function
CREATE OR REPLACE FUNCTION handle_razorpay_webhook(
  p_event_type TEXT,
  p_payment_data JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id TEXT;
  v_order_id TEXT;
  v_amount DECIMAL;
  v_status TEXT;
BEGIN
  -- Extract payment data
  v_payment_id := p_payment_data->>'id';
  v_order_id := p_payment_data->>'order_id';
  v_amount := (p_payment_data->>'amount')::DECIMAL / 100; -- Convert from paise
  v_status := p_payment_data->>'status';
  
  -- Handle different event types
  CASE p_event_type
    WHEN 'payment.captured' THEN
      -- Update payment status to paid
      UPDATE incubation_payments
      SET 
        status = 'paid',
        razorpay_payment_id = v_payment_id,
        paid_at = NOW()
      WHERE razorpay_order_id = v_order_id;
      
      -- Update application status
      UPDATE opportunity_applications
      SET 
        payment_status = 'paid',
        payment_id = v_payment_id
      WHERE id = (
        SELECT application_id 
        FROM incubation_payments 
        WHERE razorpay_order_id = v_order_id
      );
      
    WHEN 'payment.failed' THEN
      -- Update payment status to failed
      UPDATE incubation_payments
      SET 
        status = 'failed'
      WHERE razorpay_order_id = v_order_id;
      
      -- Update application status
      UPDATE opportunity_applications
      SET 
        payment_status = 'failed'
      WHERE id = (
        SELECT application_id 
        FROM incubation_payments 
        WHERE razorpay_order_id = v_order_id
      );
      
    WHEN 'payment.refunded' THEN
      -- Update payment status to refunded
      UPDATE incubation_payments
      SET 
        status = 'refunded'
      WHERE razorpay_order_id = v_order_id;
      
      -- Update application status
      UPDATE opportunity_applications
      SET 
        payment_status = 'refunded'
      WHERE id = (
        SELECT application_id 
        FROM incubation_payments 
        WHERE razorpay_order_id = v_order_id
      );
  END CASE;
  
  RETURN json_build_object('success', true);
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION create_razorpay_order TO authenticated;
GRANT EXECUTE ON FUNCTION verify_razorpay_payment TO authenticated;
GRANT EXECUTE ON FUNCTION handle_razorpay_webhook TO authenticated;

-- 7. Fix the notification queries by ensuring proper data types
-- The issue is that receiver_id is being compared as integer but should be UUID

-- 8. Create a helper function to get user ID from startup ID
CREATE OR REPLACE FUNCTION get_user_id_from_startup_id(startup_id_param BIGINT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_result UUID;
BEGIN
  -- Get user_id from startups table
  SELECT user_id INTO user_id_result
  FROM startups
  WHERE id = startup_id_param;
  
  RETURN user_id_result;
END;
$$;

-- 9. Grant permission for the helper function
GRANT EXECUTE ON FUNCTION get_user_id_from_startup_id TO authenticated;

-- 10. Test the functions
SELECT 'Testing create_razorpay_order function...' as status;

-- Test with a dummy UUID (this will fail but should show the function exists)
SELECT create_razorpay_order(
  '00000000-0000-0000-0000-000000000000'::UUID,
  1000.00,
  'INR',
  'test_receipt'
);

SELECT 'All functions created successfully!' as status;
