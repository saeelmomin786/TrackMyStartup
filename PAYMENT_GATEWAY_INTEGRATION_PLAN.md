# Payment Gateway Integration Plan
## Dual Gateway System: Razorpay (India) + PayAid (International)

---

## 📋 Overview

This document outlines the comprehensive plan for integrating dual payment gateways (Razorpay for Indian users, PayAid for international users) with a three-tier subscription plan system for the Startup Dashboard.

---

## 🎯 Plan Tiers & Features

### **Plan 1: Free Plan (₹0)**
**Accessible Features:**
- ✅ All dashboard features accessible
- ✅ Financial tracking & analytics
- ✅ Compliance management
- ✅ Investment opportunities viewing
- ✅ Profile management
- ✅ Basic notifications

**Restricted Features:**
- ❌ **Fundraising Tab**: Portfolio fundraising NOT accessible
- ❌ **Grants Tab**: 
  - Draft and reference application draft + add to CRM NOT included
- ❌ **Investor List**: 
  - AI investor matching + add to CRM NOT included
- ❌ **CRM Access**: CRM section completely NOT accessible
- ❌ **Storage**: Limited to 100 MB throughout the dashboard

---

### **Plan 2: Basic Plan (5 euro /month)**
**Accessible Features:**
- ✅ All features from Free Plan
- ✅ Portfolio fundraising access
- ✅ Grants: Draft and reference application draft + add to CRM
- ✅ Investor List: AI investor matching + add to CRM
- ✅ CRM access enabled

**Restricted Features:**
- ❌ **Fundraising Tab**: Active fundraising campaigns NOT included
- ❌ **Storage**: Limited to 1 GB

---

### **Plan 3: Premium Plan (20 euro/month)**
**Accessible Features:**
- ✅ **ALL FEATURES INCLUDED**
- ✅ Full fundraising access (including active campaigns)
- ✅ All grants features
- ✅ Full investor list features
- ✅ Complete CRM access
- ✅ Unlimited storage (or very high limit, e.g., 10 GB)

---

## 🏗️ Architecture Overview

### **1. Database Schema Changes**

#### **A. Subscription Plans Table Enhancement**
```sql
-- Add new columns to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) CHECK (plan_tier IN ('free', 'basic', 'premium'));
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 100;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;
```

#### **B. User Subscriptions Table Enhancement**
```sql
-- Add payment gateway tracking
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) CHECK (payment_gateway IN ('razorpay', 'payaid'));
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS gateway_customer_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS storage_used_mb INTEGER DEFAULT 0;
```

#### **C. Feature Access Control Table**
```sql
CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_tier, feature_name)
);

-- Insert feature access rules
INSERT INTO plan_features (plan_tier, feature_name, is_enabled) VALUES
-- Free Plan Features
('free', 'dashboard', true),
('free', 'financials', true),
('free', 'compliance', true),
('free', 'profile', true),
('free', 'portfolio_fundraising', false),
('free', 'grants_draft', false),
('free', 'grants_add_to_crm', false),
('free', 'investor_ai_matching', false),
('free', 'investor_add_to_crm', false),
('free', 'crm_access', false),
-- Basic Plan Features
('basic', 'dashboard', true),
('basic', 'financials', true),
('basic', 'compliance', true),
('basic', 'profile', true),
('basic', 'portfolio_fundraising', true),
('basic', 'grants_draft', true),
('basic', 'grants_add_to_crm', true),
('basic', 'investor_ai_matching', true),
('basic', 'investor_add_to_crm', true),
('basic', 'crm_access', true),
('basic', 'fundraising_active', false),
-- Premium Plan Features (all enabled)
('premium', 'dashboard', true),
('premium', 'financials', true),
('premium', 'compliance', true),
('premium', 'profile', true),
('premium', 'portfolio_fundraising', true),
('premium', 'grants_draft', true),
('premium', 'grants_add_to_crm', true),
('premium', 'investor_ai_matching', true),
('premium', 'investor_add_to_crm', true),
('premium', 'crm_access', true),
('premium', 'fundraising_active', true);
```

#### **D. Storage Tracking Table**
```sql
CREATE TABLE IF NOT EXISTS user_storage_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- 'document', 'image', 'video', etc.
    file_name VARCHAR(255) NOT NULL,
    file_size_mb DECIMAL(10,2) NOT NULL,
    storage_location TEXT NOT NULL, -- S3/Storage bucket path
    related_entity_type VARCHAR(50), -- 'startup', 'fundraising', 'grant', etc.
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_storage_user_id ON user_storage_usage(user_id);
CREATE INDEX idx_user_storage_entity ON user_storage_usage(related_entity_type, related_entity_id);
```

#### **E. Payment Transactions Table**
```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    payment_gateway VARCHAR(20) NOT NULL CHECK (payment_gateway IN ('razorpay', 'payaid')),
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    plan_tier VARCHAR(20) NOT NULL,
    country VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_gateway ON payment_transactions(payment_gateway, gateway_payment_id);
```

---

### **2. Payment Gateway Integration**

#### **A. Gateway Selection Logic**
```typescript
// lib/paymentGatewaySelector.ts
export function selectPaymentGateway(country: string): 'razorpay' | 'payaid' {
  const indianCountries = ['India', 'IN', 'IND'];
  return indianCountries.includes(country) ? 'razorpay' : 'payaid';
}
```

#### **B. Razorpay Integration (India)**
- **Existing Implementation**: Already integrated in `lib/paymentService.ts`
- **Enhancements Needed**:
  - Add country detection
  - Add plan tier mapping
  - Add feature access validation

#### **C. PayAid Integration (International)**
- **New Implementation Required**:
  - Create PayAid service similar to Razorpay
  - Implement PayAid API endpoints
  - Handle PayAid webhooks
  - Map PayAid responses to our subscription model

---

### **3. Feature Access Control System**

#### **A. Feature Check Service**
```typescript
// lib/featureAccessService.ts
export class FeatureAccessService {
  async canAccessFeature(userId: string, featureName: string): Promise<boolean> {
    // Get user's active subscription
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;
    
    // Get plan tier
    const plan = await this.getPlanDetails(subscription.plan_id);
    const planTier = plan.plan_tier;
    
    // Check feature access
    const { data } = await supabase
      .from('plan_features')
      .select('is_enabled')
      .eq('plan_tier', planTier)
      .eq('feature_name', featureName)
      .single();
    
    return data?.is_enabled ?? false;
  }
  
  async checkStorageLimit(userId: string, fileSizeMB: number): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;
    
    const plan = await this.getPlanDetails(subscription.plan_id);
    const currentUsage = subscription.storage_used_mb || 0;
    const limit = plan.storage_limit_mb || 100;
    
    return (currentUsage + fileSizeMB) <= limit;
  }
}
```

#### **B. UI Component Guards**
```typescript
// components/FeatureGuard.tsx
export function FeatureGuard({ 
  feature, 
  children, 
  fallback 
}: { 
  feature: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    featureAccessService.canAccessFeature(userId, feature)
      .then(setHasAccess)
      .finally(() => setLoading(false));
  }, [feature]);
  
  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return fallback || <UpgradePrompt feature={feature} />;
  return <>{children}</>;
}
```

---

### **4. Storage Management System**

#### **A. Storage Tracking Service**
```typescript
// lib/storageService.ts
export class StorageService {
  async trackFileUpload(
    userId: string, 
    fileSizeMB: number, 
    filePath: string,
    metadata: any
  ): Promise<boolean> {
    // Check storage limit
    const canUpload = await featureAccessService.checkStorageLimit(userId, fileSizeMB);
    if (!canUpload) {
      throw new Error('Storage limit exceeded. Please upgrade your plan.');
    }
    
    // Record file usage
    await supabase.from('user_storage_usage').insert({
      user_id: userId,
      file_size_mb: fileSizeMB,
      storage_location: filePath,
      ...metadata
    });
    
    // Update subscription storage usage
    await this.updateStorageUsage(userId, fileSizeMB);
    
    return true;
  }
  
  async getStorageUsage(userId: string): Promise<{
    used: number;
    limit: number;
    percentage: number;
  }> {
    const subscription = await this.getUserSubscription(userId);
    const plan = await this.getPlanDetails(subscription.plan_id);
    
    return {
      used: subscription.storage_used_mb || 0,
      limit: plan.storage_limit_mb || 100,
      percentage: ((subscription.storage_used_mb || 0) / (plan.storage_limit_mb || 100)) * 100
    };
  }
}
```

---

### **5. Account Section Implementation**

#### **A. Account Dashboard Component**
```typescript
// components/startup-health/AccountTab.tsx
export default function AccountTab() {
  return (
    <div className="space-y-6">
      {/* Subscription Details */}
      <SubscriptionCard />
      
      {/* Payment History */}
      <PaymentHistoryCard />
      
      {/* Storage Usage */}
      <StorageUsageCard />
      
      {/* Billing Information */}
      <BillingInfoCard />
      
      {/* Payment Methods */}
      <PaymentMethodsCard />
      
      {/* Plan Management */}
      <PlanManagementCard />
    </div>
  );
}
```

#### **B. Account Data Structure**
```typescript
interface AccountData {
  subscription: {
    plan_tier: 'free' | 'basic' | 'premium';
    plan_name: string;
    status: 'active' | 'inactive' | 'cancelled';
    current_period_start: string;
    current_period_end: string;
    payment_gateway: 'razorpay' | 'payaid';
    auto_renew: boolean;
  };
  storage: {
    used_mb: number;
    limit_mb: number;
    percentage: number;
  };
  billing: {
    next_billing_date: string;
    billing_address: any;
    tax_id: string;
  };
  payment_methods: Array<{
    id: string;
    type: string;
    last4: string;
    expiry: string;
    is_default: boolean;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
  }>;
}
```

---

### **6. Security Considerations**

#### **A. Payment Gateway Security**
1. **Server-Side Verification**: All payment verifications must happen server-side
2. **Webhook Security**: Verify webhook signatures from both gateways
3. **API Key Management**: Store sensitive keys in environment variables only
4. **HTTPS Only**: All payment endpoints must use HTTPS
5. **Rate Limiting**: Implement rate limiting on payment endpoints

#### **B. Feature Access Security**
1. **Server-Side Validation**: Always validate feature access on the backend
2. **RLS Policies**: Update Row Level Security policies to enforce plan restrictions
3. **API Endpoint Protection**: Protect API endpoints with subscription checks
4. **Storage Quotas**: Enforce storage limits at the database level

#### **C. Data Protection**
1. **PCI Compliance**: Never store full payment card details
2. **Encryption**: Encrypt sensitive payment data at rest
3. **Audit Logging**: Log all payment and subscription changes
4. **User Privacy**: Comply with GDPR and local data protection laws

---

## 📝 Implementation Steps

### **Phase 1: Database Setup** (Week 1)
1. ✅ Create plan_features table
2. ✅ Create user_storage_usage table
3. ✅ Create payment_transactions table
4. ✅ Update subscription_plans table with new columns
5. ✅ Update user_subscriptions table with gateway info
6. ✅ Insert plan feature configurations
7. ✅ Create database functions for feature checks

### **Phase 2: Payment Gateway Integration** (Week 2)
1. ✅ Enhance Razorpay integration with country detection
2. ✅ Implement PayAid integration
3. ✅ Create unified payment service interface
4. ✅ Implement gateway selection logic
5. ✅ Set up webhook handlers for both gateways
6. ✅ Test payment flows for both gateways

### **Phase 3: Feature Access Control** (Week 3)
1. ✅ Create FeatureAccessService
2. ✅ Implement storage tracking service
3. ✅ Create FeatureGuard component
4. ✅ Add feature checks to all restricted components
5. ✅ Update RLS policies for plan-based access
6. ✅ Add upgrade prompts for restricted features

### **Phase 4: Account Section** (Week 4)
1. ✅ Create AccountTab component
2. ✅ Implement subscription management UI
3. ✅ Add payment history view
4. ✅ Create storage usage dashboard
5. ✅ Add billing information management
6. ✅ Implement plan upgrade/downgrade flow

### **Phase 5: Testing & Security** (Week 5)
1. ✅ Test all payment flows
2. ✅ Test feature access restrictions
3. ✅ Test storage limits
4. ✅ Security audit
5. ✅ Performance testing
6. ✅ User acceptance testing

---

## 🔧 Technical Implementation Details

### **1. Plan Tier Mapping**
```typescript
const PLAN_TIERS = {
  free: {
    price: 0,
    currency: 'EUR',
    storage_mb: 100,
    features: {
      portfolio_fundraising: false,
      grants_draft: false,
      grants_add_to_crm: false,
      investor_ai_matching: false,
      investor_add_to_crm: false,
      crm_access: false,
      fundraising_active: false
    }
  },
  basic: {
    price: 5,
    currency: 'EUR',
    storage_mb: 1024, // 1 GB
    features: {
      portfolio_fundraising: true,
      grants_draft: true,
      grants_add_to_crm: true,
      investor_ai_matching: true,
      investor_add_to_crm: true,
      crm_access: true,
      fundraising_active: false
    }
  },
  premium: {
    price: 20,
    currency: 'EUR',
    storage_mb: 10240, // 10 GB
    features: {
      portfolio_fundraising: true,
      grants_draft: true,
      grants_add_to_crm: true,
      investor_ai_matching: true,
      investor_add_to_crm: true,
      crm_access: true,
      fundraising_active: true
    }
  }
};
```

### **2. Component Integration Points**

#### **Fundraising Tab**
```typescript
// components/startup-health/FundraisingTab.tsx
<FeatureGuard feature="portfolio_fundraising">
  <PortfolioFundraisingSection />
</FeatureGuard>

<FeatureGuard feature="fundraising_active">
  <ActiveFundraisingSection />
</FeatureGuard>
```

#### **Grants Tab**
```typescript
// components/startup-health/GrantsTab.tsx
<FeatureGuard feature="grants_draft">
  <DraftApplicationsSection />
</FeatureGuard>

<FeatureGuard feature="grants_add_to_crm">
  <AddToCRMSection />
</FeatureGuard>
```

#### **Investor List**
```typescript
// components/startup-health/InvestorList.tsx
<FeatureGuard feature="investor_ai_matching">
  <AIInvestorMatchingSection />
</FeatureGuard>

<FeatureGuard feature="investor_add_to_crm">
  <AddToCRMSection />
</FeatureGuard>
```

#### **CRM Section**
```typescript
// components/startup-health/CRMTab.tsx
<FeatureGuard feature="crm_access">
  <CRMDashboard />
</FeatureGuard>
```

---

## 🚀 Deployment Checklist

- [ ] Database migrations executed
- [ ] Environment variables configured for both gateways
- [ ] Webhook endpoints registered with payment gateways
- [ ] Feature access tests passing
- [ ] Storage limit tests passing
- [ ] Payment flow tests passing
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] User training materials prepared

---

## 📊 Monitoring & Analytics

### **Key Metrics to Track**
1. Subscription conversion rates by plan
2. Payment success/failure rates by gateway
3. Feature usage by plan tier
4. Storage usage patterns
5. Upgrade/downgrade patterns
6. Churn rate by plan

---

## 🔄 Future Enhancements

1. **Annual Plans**: Add yearly billing options with discounts
2. **Team Plans**: Multi-user subscription options
3. **Add-ons**: Feature add-ons for specific needs
4. **Usage-Based Billing**: For storage-heavy users
5. **Referral Program**: Discounts for referrals
6. **Enterprise Plans**: Custom pricing for large organizations

---

## 📞 Support & Maintenance

### **Payment Gateway Support**
- Razorpay: https://razorpay.com/support
- PayAid: [Support contact to be added]

### **Issue Escalation**
1. Payment failures → Check gateway status
2. Feature access issues → Verify subscription status
3. Storage limit issues → Check usage tracking
4. Webhook failures → Review webhook logs

---

## ✅ Success Criteria

1. ✅ Both payment gateways integrated and working
2. ✅ All three plan tiers functional
3. ✅ Feature access restrictions enforced
4. ✅ Storage limits enforced
5. ✅ Account section fully functional
6. ✅ All security measures in place
7. ✅ Zero payment data breaches
8. ✅ 99.9% payment success rate

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Author**: Development Team  
**Status**: Planning Phase
