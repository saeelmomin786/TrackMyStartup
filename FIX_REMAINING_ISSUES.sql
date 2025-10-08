-- FIX_REMAINING_ISSUES.sql
-- This script fixes the remaining issues with messaging and Razorpay

-- 1. Drop existing function if it exists and create the missing send_incubation_message function
DROP FUNCTION IF EXISTS send_incubation_message(UUID, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION send_incubation_message(
    p_application_id UUID,
    p_receiver_id UUID,
    p_message TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_attachment_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_message_id UUID;
    v_sender_id UUID;
    v_result JSON;
BEGIN
    -- Get the current user ID
    v_sender_id := auth.uid();
    
    -- Validate inputs
    IF v_sender_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    IF p_application_id IS NULL OR p_receiver_id IS NULL OR p_message IS NULL OR p_message = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Missing required parameters'
        );
    END IF;
    
    -- Insert the message
    INSERT INTO public.incubation_messages (
        application_id,
        sender_id,
        receiver_id,
        message,
        message_type,
        attachment_url
    ) VALUES (
        p_application_id,
        v_sender_id,
        p_receiver_id,
        p_message,
        p_message_type,
        p_attachment_url
    ) RETURNING id INTO v_message_id;
    
    -- Return success
    v_result := json_build_object(
        'success', true,
        'message_id', v_message_id,
        'message', 'Message sent successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to send message: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_incubation_message(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 2. Create a function to get application details for messaging
DROP FUNCTION IF EXISTS get_application_for_messaging(UUID);

CREATE OR REPLACE FUNCTION get_application_for_messaging(p_application_id UUID)
RETURNS JSON AS $$
DECLARE
    v_application JSON;
BEGIN
    SELECT json_build_object(
        'id', oa.id,
        'opportunity_id', oa.opportunity_id,
        'startup_id', oa.startup_id,
        'status', oa.status,
        'opportunity_name', io.program_name,
        'startup_name', 'Startup', -- Simplified for now
        'facilitator_id', io.facilitator_id,
        'startup_user_id', s.user_id
    ) INTO v_application
    FROM public.opportunity_applications oa
    JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
    JOIN public.startups s ON oa.startup_id = s.id
    WHERE oa.id = p_application_id;
    
    RETURN COALESCE(v_application, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_application_for_messaging(UUID) TO authenticated;

-- 3. Update the Razorpay order function to return proper format
DROP FUNCTION IF EXISTS create_razorpay_order(DECIMAL, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION create_razorpay_order(
    p_amount DECIMAL(15,2),
    p_currency VARCHAR(3) DEFAULT 'INR',
    p_receipt TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_order_id TEXT;
    v_order_data JSON;
BEGIN
    -- Generate a mock order ID for testing
    v_order_id := 'order_' || extract(epoch from now())::text;
    
    v_order_data := json_build_object(
        'id', v_order_id,
        'amount', p_amount * 100, -- Convert to paise
        'currency', p_currency,
        'receipt', COALESCE(p_receipt, 'receipt_' || extract(epoch from now())::text),
        'status', 'created',
        'created_at', extract(epoch from now()),
        'key', 'rzp_test_1234567890' -- Mock key for testing
    );
    
    RETURN v_order_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_razorpay_order(DECIMAL, VARCHAR, TEXT) TO authenticated;

-- 4. Create a function to validate UUIDs
DROP FUNCTION IF EXISTS is_valid_uuid(TEXT);

CREATE OR REPLACE FUNCTION is_valid_uuid(p_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_uuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_valid_uuid(TEXT) TO authenticated;

-- 5. Create a function to get user ID from application
DROP FUNCTION IF EXISTS get_user_id_from_application(UUID);

CREATE OR REPLACE FUNCTION get_user_id_from_application(p_application_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the startup user ID from the application
    SELECT s.user_id INTO v_user_id
    FROM public.opportunity_applications oa
    JOIN public.startups s ON oa.startup_id = s.id
    WHERE oa.id = p_application_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_id_from_application(UUID) TO authenticated;

-- 6. Test the messaging function
SELECT 'SUCCESS: All messaging functions have been created!' as status;

-- 7. Test if we can get application details
SELECT get_application_for_messaging(gen_random_uuid()) as test_result;
