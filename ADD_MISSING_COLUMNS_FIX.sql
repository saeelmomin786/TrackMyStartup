-- ADD_MISSING_COLUMNS_FIX.sql
-- This script adds the missing columns to existing tables

-- 1. Add missing columns to incubation_opportunities table
ALTER TABLE public.incubation_opportunities 
ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'Free' CHECK (fee_type IN ('Free', 'Fees', 'Equity', 'Hybrid')),
ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS equity_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add missing columns to opportunity_applications table
ALTER TABLE public.opportunity_applications 
ADD COLUMN IF NOT EXISTS diligence_status TEXT DEFAULT 'none' CHECK (diligence_status IN ('none', 'requested', 'approved')),
ADD COLUMN IF NOT EXISTS pitch_deck_url TEXT,
ADD COLUMN IF NOT EXISTS pitch_video_url TEXT,
ADD COLUMN IF NOT EXISTS contract_url TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create the new tables that don't exist yet
CREATE TABLE IF NOT EXISTS public.incubation_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'contract')),
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incubation_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
    contract_name TEXT NOT NULL,
    contract_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_signed BOOLEAN DEFAULT FALSE,
    signed_by UUID REFERENCES auth.users(id),
    signed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.incubation_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50),
    payment_id TEXT UNIQUE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incubation_opportunities_facilitator ON public.incubation_opportunities(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_incubation_opportunities_fee_type ON public.incubation_opportunities(fee_type);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_startup ON public.opportunity_applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opportunity ON public.opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_status ON public.opportunity_applications(status);
CREATE INDEX IF NOT EXISTS idx_incubation_messages_application ON public.incubation_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_incubation_messages_sender ON public.incubation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_incubation_messages_receiver ON public.incubation_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_incubation_contracts_application ON public.incubation_contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_incubation_payments_application ON public.incubation_payments(application_id);

-- 5. Enable RLS on new tables
ALTER TABLE public.incubation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubation_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubation_payments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for new tables
-- Messages policies
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.incubation_messages;
CREATE POLICY "Users can view messages they sent or received" ON public.incubation_messages
    FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert messages" ON public.incubation_messages;
CREATE POLICY "Users can insert messages" ON public.incubation_messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- Contracts policies
DROP POLICY IF EXISTS "Users can view contracts for their applications" ON public.incubation_contracts;
CREATE POLICY "Users can view contracts for their applications" ON public.incubation_contracts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.startups s ON oa.startup_id = s.id
            WHERE oa.id = application_id AND s.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
            WHERE oa.id = application_id AND io.facilitator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert contracts" ON public.incubation_contracts;
CREATE POLICY "Users can insert contracts" ON public.incubation_contracts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

-- Payments policies
DROP POLICY IF EXISTS "Users can view payments for their applications" ON public.incubation_payments;
CREATE POLICY "Users can view payments for their applications" ON public.incubation_payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.startups s ON oa.startup_id = s.id
            WHERE oa.id = application_id AND s.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
            WHERE oa.id = application_id AND io.facilitator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert payments" ON public.incubation_payments;
CREATE POLICY "Users can insert payments" ON public.incubation_payments
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 7. Create functions for the incubation flow
CREATE OR REPLACE FUNCTION accept_application(p_application_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.opportunity_applications
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_application_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION request_diligence(p_application_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.opportunity_applications
    SET diligence_status = 'requested', updated_at = NOW()
    WHERE id = p_application_id AND status = 'accepted';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_diligence(p_application_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.opportunity_applications
    SET diligence_status = 'approved', updated_at = NOW()
    WHERE id = p_application_id AND diligence_status = 'requested';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION send_incubation_message(
    p_application_id UUID,
    p_receiver_id UUID,
    p_message TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_attachment_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO public.incubation_messages (
        application_id, sender_id, receiver_id, message, message_type, attachment_url
    ) VALUES (
        p_application_id, auth.uid(), p_receiver_id, p_message, p_message_type, p_attachment_url
    ) RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_incubation_payment(
    p_application_id UUID,
    p_amount DECIMAL(15,2),
    p_currency VARCHAR(3) DEFAULT 'INR',
    p_razorpay_order_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    INSERT INTO public.incubation_payments (
        application_id, amount, currency, razorpay_order_id
    ) VALUES (
        p_application_id, p_amount, p_currency, p_razorpay_order_id
    ) RETURNING id INTO v_payment_id;
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_payment_status(
    p_payment_id UUID,
    p_status TEXT,
    p_razorpay_payment_id TEXT DEFAULT NULL,
    p_razorpay_signature TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.incubation_payments
    SET 
        status = p_status,
        razorpay_payment_id = p_razorpay_payment_id,
        razorpay_signature = p_razorpay_signature,
        paid_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE paid_at END
    WHERE id = p_payment_id;
    
    -- Update application payment status
    UPDATE public.opportunity_applications
    SET 
        payment_status = p_status,
        payment_id = p_razorpay_payment_id,
        payment_amount = (SELECT amount FROM public.incubation_payments WHERE id = p_payment_id)
    WHERE id = (SELECT application_id FROM public.incubation_payments WHERE id = p_payment_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_incubation_opportunities_updated_at ON public.incubation_opportunities;
CREATE TRIGGER update_incubation_opportunities_updated_at
    BEFORE UPDATE ON public.incubation_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_opportunity_applications_updated_at ON public.opportunity_applications;
CREATE TRIGGER update_opportunity_applications_updated_at
    BEFORE UPDATE ON public.opportunity_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.incubation_opportunities TO authenticated;
GRANT ALL ON public.opportunity_applications TO authenticated;
GRANT ALL ON public.incubation_messages TO authenticated;
GRANT ALL ON public.incubation_contracts TO authenticated;
GRANT ALL ON public.incubation_payments TO authenticated;
GRANT EXECUTE ON FUNCTION accept_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_diligence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_diligence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_incubation_message(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_incubation_payment(UUID, DECIMAL, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_status(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 10. Show success message
SELECT 'SUCCESS: All missing columns and tables have been added!' as status;












