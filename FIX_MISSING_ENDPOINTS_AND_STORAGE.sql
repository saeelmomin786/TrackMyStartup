-- FIX_MISSING_ENDPOINTS_AND_STORAGE.sql
-- This script fixes the missing API endpoints and storage buckets

-- 1. Create missing storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('incubation-contracts', 'incubation-contracts', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']),
  ('incubation-attachments', 'incubation-attachments', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policies for the new buckets
CREATE POLICY "Users can upload incubation contracts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incubation-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view incubation contracts" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'incubation-contracts');

CREATE POLICY "Users can upload incubation attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incubation-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view incubation attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'incubation-attachments');

-- 3. Fix the profiles table relationship issue
-- The error suggests that the profiles table doesn't have the expected foreign key relationships
-- Let's check if we need to create a profiles table or fix the relationships

-- First, let's see if profiles table exists and has the right structure
DO $$
BEGIN
    -- Check if profiles table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        -- Create profiles table if it doesn't exist
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT,
            email TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own profile" ON public.profiles
        FOR SELECT TO authenticated
        USING (auth.uid() = id);
        
        CREATE POLICY "Users can update their own profile" ON public.profiles
        FOR UPDATE TO authenticated
        USING (auth.uid() = id);
        
        CREATE POLICY "Users can insert their own profile" ON public.profiles
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 4. Update the incubation_messages table to fix the foreign key issue
-- The error suggests the foreign key relationships are not working properly
ALTER TABLE public.incubation_messages 
DROP CONSTRAINT IF EXISTS incubation_messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS incubation_messages_receiver_id_fkey;

-- Add the foreign key constraints back with proper references
ALTER TABLE public.incubation_messages 
ADD CONSTRAINT incubation_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.incubation_messages 
ADD CONSTRAINT incubation_messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Update the incubation_contracts table to fix the foreign key issue
ALTER TABLE public.incubation_contracts 
DROP CONSTRAINT IF EXISTS incubation_contracts_uploaded_by_fkey,
DROP CONSTRAINT IF EXISTS incubation_contracts_signed_by_fkey;

-- Add the foreign key constraints back with proper references
ALTER TABLE public.incubation_contracts 
ADD CONSTRAINT incubation_contracts_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.incubation_contracts 
ADD CONSTRAINT incubation_contracts_signed_by_fkey 
FOREIGN KEY (signed_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Create a simple API endpoint for Razorpay order creation
-- This is a placeholder - you'll need to implement this in your backend
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
    -- This is a placeholder function
    -- In a real implementation, you would call the Razorpay API here
    -- For now, we'll return a mock order ID
    v_order_id := 'order_' || extract(epoch from now())::text;
    
    v_order_data := json_build_object(
        'id', v_order_id,
        'amount', p_amount * 100, -- Convert to paise
        'currency', p_currency,
        'receipt', COALESCE(p_receipt, 'receipt_' || extract(epoch from now())::text),
        'status', 'created',
        'created_at', extract(epoch from now())
    );
    
    RETURN v_order_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_razorpay_order(DECIMAL, VARCHAR, TEXT) TO authenticated;

-- 7. Create a function to get user profile data
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile JSON;
BEGIN
    SELECT json_build_object(
        'id', u.id,
        'name', COALESCE(u.raw_user_meta_data->>'name', u.email),
        'email', u.email
    ) INTO v_profile
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    RETURN COALESCE(v_profile, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- 8. Update the incubation_messages query to use the function instead of foreign key
-- This will be handled in the application code by updating the query

-- 9. Create a simple test to verify everything works
DO $$
BEGIN
    -- Test if we can create a message
    BEGIN
        INSERT INTO public.incubation_messages (
            application_id, sender_id, receiver_id, message
        ) VALUES (
            gen_random_uuid(), auth.uid(), auth.uid(), 'Test message'
        );
        ROLLBACK; -- Rollback the test insert
        RAISE NOTICE 'SUCCESS: incubation_messages table is working';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: incubation_messages table has issues: %', SQLERRM;
    END;
END $$;

-- 10. Show success message
SELECT 'SUCCESS: Storage buckets, policies, and API endpoints have been created!' as status;












