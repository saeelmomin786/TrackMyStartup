-- Financial Model Database Schema
-- This file contains the database tables for the subscription and payment system

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    description TEXT,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Investor', 'Startup', 'Startup Facilitation Center', 'Investment Advisor')),
    country VARCHAR(100) DEFAULT 'Global',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    startup_count INTEGER DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    -- trial support
    is_in_trial BOOLEAN DEFAULT false,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    -- payment gateway linkage
    razorpay_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, plan_id)
);

-- Discount Coupons Table
CREATE TABLE IF NOT EXISTS discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scouting Fees Table (for Investment Advisors)
CREATE TABLE IF NOT EXISTS scouting_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    investor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    startup_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    advisory_fee DECIMAL(10,2) NOT NULL,
    fee_percentage DECIMAL(5,2) DEFAULT 30.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Due Diligence Requests Table
CREATE TABLE IF NOT EXISTS due_diligence_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'failed')),
    payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, currency, interval, description, user_type, country) VALUES
('Monthly Plan - Investor', 15.00, 'EUR', 'monthly', 'Monthly subscription per invested startup', 'Investor', 'Global'),
('Yearly Plan - Investor', 120.00, 'EUR', 'yearly', 'Yearly subscription per invested startup (2 months free)', 'Investor', 'Global'),
('Monthly Plan - Startup', 15.00, 'EUR', 'monthly', 'Monthly subscription per invested startup', 'Startup', 'Global'),
('Yearly Plan - Startup', 120.00, 'EUR', 'yearly', 'Yearly subscription per invested startup (2 months free)', 'Startup', 'Global'),
('Monthly Plan - SFC', 15.00, 'EUR', 'monthly', 'Monthly subscription per invested startup', 'Startup Facilitation Center', 'Global'),
('Yearly Plan - SFC', 120.00, 'EUR', 'yearly', 'Yearly subscription per invested startup (2 months free)', 'Startup Facilitation Center', 'Global'),
('Monthly Plan - Investment Advisor', 15.00, 'EUR', 'monthly', 'Monthly subscription per invested startup', 'Investment Advisor', 'Global'),
('Yearly Plan - Investment Advisor', 120.00, 'EUR', 'yearly', 'Yearly subscription per invested startup (2 months free)', 'Investment Advisor', 'Global');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_code ON discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_active ON discount_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_scouting_fees_advisor_id ON scouting_fees(advisor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_due_diligence_requests_user_id ON due_diligence_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_due_diligence_requests_status ON due_diligence_requests(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discount_coupons_updated_at BEFORE UPDATE ON discount_coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_diligence_requests ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans (public read access)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans FOR SELECT USING (true);

-- Policies for user_subscriptions (users can only see their own)
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Policies for discount_coupons (public read access for validation)
CREATE POLICY "Anyone can view active discount coupons" ON discount_coupons FOR SELECT USING (is_active = true);

-- Policies for scouting_fees (advisors can see their own fees)
CREATE POLICY "Advisors can view own scouting fees" ON scouting_fees FOR SELECT USING (auth.uid() = advisor_id);
CREATE POLICY "Advisors can insert own scouting fees" ON scouting_fees FOR INSERT WITH CHECK (auth.uid() = advisor_id);

-- Policies for payment_transactions (users can only see their own)
CREATE POLICY "Users can view own payment transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment transactions" ON payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment transactions" ON payment_transactions FOR UPDATE USING (auth.uid() = user_id);

-- Policies for due_diligence_requests (users can only see their own)
CREATE POLICY "Users can view own due diligence requests" ON due_diligence_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own due diligence requests" ON due_diligence_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own due diligence requests" ON due_diligence_requests FOR UPDATE USING (auth.uid() = user_id);
