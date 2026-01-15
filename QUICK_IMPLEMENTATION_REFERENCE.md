# Quick Implementation Reference Guide
## Payment Gateway Integration - Step by Step

---

## 🚀 Quick Start Checklist

### **Step 1: Database Setup** ✅
```sql
-- Run these SQL scripts in order:
1. CREATE_PLAN_FEATURES_TABLE.sql
2. CREATE_STORAGE_USAGE_TABLE.sql
3. CREATE_PAYMENT_TRANSACTIONS_TABLE.sql
4. UPDATE_SUBSCRIPTION_TABLES.sql
5. INSERT_PLAN_CONFIGURATIONS.sql
```

### **Step 2: Environment Variables** 🔐
```bash
# Add to .env file:
VITE_RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
PAYAID_API_KEY=your_payaid_key
PAYAID_SECRET=your_payaid_secret
PAYAID_WEBHOOK_SECRET=your_webhook_secret
```

### **Step 3: Create Core Services** 📦
```
lib/
  ├── featureAccessService.ts      # Feature access checks
  ├── storageService.ts            # Storage tracking
  ├── paymentGatewaySelector.ts   # Gateway selection
  └── payaidService.ts             # PayAid integration
```

### **Step 4: Create UI Components** 🎨
```
components/
  ├── FeatureGuard.tsx            # Feature access guard
  ├── UpgradePrompt.tsx            # Upgrade modal
  └── startup-health/
      └── AccountTab.tsx           # Account section
```

### **Step 5: Update Existing Components** 🔄
```
Update these files to add FeatureGuard:
- components/startup-health/FundraisingTab.tsx
- components/startup-health/GrantsTab.tsx
- components/startup-health/InvestorList.tsx
- components/startup-health/CRMTab.tsx (if exists)
```

---

## 📝 Code Snippets

### **1. Feature Access Check**
```typescript
// lib/featureAccessService.ts
import { supabase } from './supabase';

export async function canAccessFeature(
  userId: string, 
  featureName: string
): Promise<boolean> {
  // Get user's subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select(`
      plan_id,
      subscription_plans(plan_tier)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription) return false;

  const planTier = subscription.subscription_plans?.plan_tier || 'free';

  // Check feature access
  const { data: feature } = await supabase
    .from('plan_features')
    .select('is_enabled')
    .eq('plan_tier', planTier)
    .eq('feature_name', featureName)
    .single();

  return feature?.is_enabled ?? false;
}
```

### **2. Storage Limit Check**
```typescript
// lib/storageService.ts
export async function checkStorageLimit(
  userId: string, 
  fileSizeMB: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select(`
      storage_used_mb,
      subscription_plans(storage_limit_mb)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    return { allowed: false, current: 0, limit: 100 };
  }

  const current = subscription.storage_used_mb || 0;
  const limit = subscription.subscription_plans?.storage_limit_mb || 100;

  return {
    allowed: (current + fileSizeMB) <= limit,
    current,
    limit
  };
}
```

### **3. Feature Guard Component**
```typescript
// components/FeatureGuard.tsx
import React, { useState, useEffect } from 'react';
import { canAccessFeature } from '../lib/featureAccessService';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGuardProps {
  feature: string;
  userId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function FeatureGuard({ 
  feature, 
  userId, 
  children, 
  fallback 
}: FeatureGuardProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    canAccessFeature(userId, feature)
      .then(setHasAccess)
      .finally(() => setLoading(false));
  }, [feature, userId]);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!hasAccess) {
    return fallback || <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}
```

### **4. Payment Gateway Selection**
```typescript
// lib/paymentGatewaySelector.ts
export function selectPaymentGateway(country: string): 'razorpay' | 'payaid' {
  const indianCountries = ['India', 'IN', 'IND', 'भारत'];
  const normalizedCountry = country?.trim() || '';
  
  return indianCountries.some(c => 
    normalizedCountry.toLowerCase().includes(c.toLowerCase())
  ) ? 'razorpay' : 'payaid';
}

export async function getUserCountry(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_profiles')
    .select('country')
    .eq('user_id', userId)
    .single();
  
  return data?.country || 'Global';
}
```

### **5. Upgrade Prompt Component**
```typescript
// components/UpgradePrompt.tsx
import React from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import { Lock, ArrowRight } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  currentPlan?: string;
}

const featureNames: Record<string, string> = {
  portfolio_fundraising: 'Portfolio Fundraising',
  grants_draft: 'Grant Draft Applications',
  grants_add_to_crm: 'Add Grants to CRM',
  investor_ai_matching: 'AI Investor Matching',
  investor_add_to_crm: 'Add Investors to CRM',
  crm_access: 'CRM Access',
  fundraising_active: 'Active Fundraising Campaigns'
};

export default function UpgradePrompt({ 
  feature, 
  currentPlan = 'free' 
}: UpgradePromptProps) {
  const featureName = featureNames[feature] || feature;

  return (
    <Card className="p-6 border-2 border-amber-200 bg-amber-50">
      <div className="flex items-start gap-4">
        <div className="bg-amber-100 p-3 rounded-full">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800 mb-2">
            Premium Feature Locked
          </h3>
          <p className="text-amber-700 mb-4">
            <strong>{featureName}</strong> is available in our Basic or Premium plans.
            Upgrade now to unlock this feature and more!
          </p>
          <Button
            onClick={() => {
              // Navigate to subscription page
              window.location.href = '/dashboard/subscription';
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Upgrade Plan
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

---

## 🔧 Integration Points

### **Fundraising Tab Integration**
```typescript
// In components/startup-health/FundraisingTab.tsx
import FeatureGuard from '../FeatureGuard';

// Wrap restricted sections:
<FeatureGuard 
  feature="portfolio_fundraising" 
  userId={currentUser.id}
>
  <PortfolioFundraisingSection />
</FeatureGuard>

<FeatureGuard 
  feature="fundraising_active" 
  userId={currentUser.id}
>
  <ActiveFundraisingSection />
</FeatureGuard>
```

### **Grants Tab Integration**
```typescript
// In components/startup-health/GrantsTab.tsx
<FeatureGuard feature="grants_draft" userId={currentUser.id}>
  <DraftApplicationsSection />
</FeatureGuard>

<FeatureGuard feature="grants_add_to_crm" userId={currentUser.id}>
  <AddToCRMSection />
</FeatureGuard>
```

### **Storage Check on File Upload**
```typescript
// Before any file upload:
import { checkStorageLimit } from '../lib/storageService';

const fileSizeMB = file.size / (1024 * 1024);
const { allowed, current, limit } = await checkStorageLimit(
  userId, 
  fileSizeMB
);

if (!allowed) {
  alert(`Storage limit exceeded! Used: ${current}MB / ${limit}MB`);
  return;
}

// Proceed with upload...
```

---

## 📊 Account Tab Structure

```typescript
// components/startup-health/AccountTab.tsx
export default function AccountTab({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <h2>Current Subscription</h2>
        <SubscriptionDetails userId={userId} />
      </Card>

      {/* Storage Usage */}
      <Card>
        <h2>Storage Usage</h2>
        <StorageUsageCard userId={userId} />
      </Card>

      {/* Payment History */}
      <Card>
        <h2>Payment History</h2>
        <PaymentHistory userId={userId} />
      </Card>

      {/* Plan Management */}
      <Card>
        <h2>Manage Plan</h2>
        <PlanManagement userId={userId} />
      </Card>
    </div>
  );
}
```

---

## 🧪 Testing Checklist

- [ ] Free plan users cannot access restricted features
- [ ] Basic plan users can access basic features but not premium
- [ ] Premium plan users can access all features
- [ ] Storage limits enforced correctly
- [ ] Razorpay payments work for Indian users
- [ ] PayAid payments work for international users
- [ ] Webhooks process correctly
- [ ] Feature access updates immediately after payment
- [ ] Account section displays correct information
- [ ] Upgrade/downgrade flows work

---

## 🐛 Common Issues & Solutions

### **Issue: Feature access not updating after payment**
**Solution**: Clear cache and refresh subscription status

### **Issue: Storage limit not enforced**
**Solution**: Check storage tracking on file upload

### **Issue: Wrong gateway selected**
**Solution**: Verify country detection logic

### **Issue: Payment webhook not received**
**Solution**: Check webhook URL configuration in gateway dashboard

---

## 📞 Support Resources

- **Razorpay Docs**: https://razorpay.com/docs/
- **PayAid Docs**: [To be added]
- **Internal Docs**: See `PAYMENT_GATEWAY_INTEGRATION_PLAN.md`

---

**Last Updated**: [Current Date]  
**Status**: Ready for Implementation
