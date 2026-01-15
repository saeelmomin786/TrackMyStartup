# Payment Gateway Integration - Implementation Progress

## ✅ Phase 1: Database Setup - COMPLETED

### Database Schema Files Created:
1. ✅ **database/01_create_plan_features_table.sql**
   - Creates `plan_features` table
   - Inserts feature access rules for all 3 plan tiers
   - Creates indexes for performance

2. ✅ **database/02_create_storage_usage_table.sql**
   - Creates `user_storage_usage` table
   - Creates `get_user_storage_total()` function
   - Creates trigger to auto-update subscription storage usage
   - Sets up RLS policies

3. ✅ **database/03_create_payment_transactions_table.sql**
   - Creates `payment_transactions` table
   - Creates `get_user_payment_history()` function
   - Sets up RLS policies

4. ✅ **database/04_update_subscription_tables.sql**
   - Updates `subscription_plans` table (adds plan_tier, storage_limit_mb, features)
   - Updates `user_subscriptions` table (adds payment_gateway, gateway IDs, country, storage_used_mb)
   - Creates helper functions: `get_user_plan_tier()`, `can_user_access_feature()`, `get_user_storage_limit()`

5. ✅ **CREATE_SUBSCRIPTION_PLANS_EUR.sql**
   - Creates subscription plans with EUR pricing
   - Free: €0, Basic: €5, Premium: €20

6. ✅ **database/00_run_all_migrations.sql**
   - Master script to run all migrations in order

### Database Documentation:
- ✅ **database/README.md** - Complete migration guide

---

## ✅ Phase 2: Core Services - COMPLETED

### Services Created:

1. ✅ **lib/paymentGatewaySelector.ts**
   - `selectPaymentGateway()` - Selects Razorpay (India) or PayAid (others)
   - `getUserCountry()` - Gets user's country from profile
   - `getPaymentGatewayForUser()` - Gets gateway for specific user
   - `getCurrencyForGateway()` - Returns EUR for both gateways
   - `isCurrencySupported()` - Checks currency support

2. ✅ **lib/featureAccessService.ts**
   - `canAccessFeature()` - Checks if user can access a feature
   - `getUserPlanTier()` - Gets user's plan tier
   - `getUserSubscription()` - Gets subscription details
   - `checkMultipleFeatures()` - Batch feature check
   - `getAvailableFeatures()` - Gets all enabled features for user

3. ✅ **lib/storageService.ts**
   - `checkStorageLimit()` - Checks if upload is allowed
   - `trackFileUpload()` - Tracks file uploads
   - `getStorageUsage()` - Gets storage usage details
   - `getUserFiles()` - Gets user's file list
   - `deleteFileRecord()` - Deletes file record
   - `getStorageByType()` - Gets storage breakdown by type

4. ✅ **lib/payaidService.ts**
   - `createOrder()` - Creates PayAid payment order
   - `createSubscription()` - Creates PayAid subscription
   - `verifyPayment()` - Verifies payment signature
   - `getPaymentStatus()` - Gets payment status
   - `getOrCreateCustomer()` - Creates/gets PayAid customer
   - `cancelSubscription()` - Cancels subscription
   - `verifyWebhookSignature()` - Verifies webhook (placeholder)

---

## 🔄 Phase 3: UI Components - IN PROGRESS

### Components to Create:

1. ⏳ **components/FeatureGuard.tsx**
   - Wrapper component to restrict feature access
   - Shows upgrade prompt when feature is locked

2. ⏳ **components/UpgradePrompt.tsx**
   - Modal/component to prompt users to upgrade
   - Shows plan comparison

3. ⏳ **components/startup-health/AccountTab.tsx**
   - Account section in dashboard
   - Subscription details
   - Payment history
   - Storage usage
   - Plan management

---

## 📋 Next Steps

### Immediate Actions:
1. **Run Database Migrations**
   ```sql
   -- In Supabase SQL Editor, run:
   \i database/00_run_all_migrations.sql
   ```

2. **Set Environment Variables**
   ```bash
   VITE_PAYAID_API_KEY=your_payaid_key
   VITE_PAYAID_SECRET=your_payaid_secret
   VITE_PAYAID_BASE_URL=https://api.payaid.com
   ```

3. **Create UI Components**
   - FeatureGuard component
   - UpgradePrompt component
   - AccountTab component

4. **Update Existing Components**
   - Add FeatureGuard to FundraisingTab
   - Add FeatureGuard to GrantsTab
   - Add FeatureGuard to InvestorList
   - Add FeatureGuard to CRM sections

5. **Create API Endpoints**
   - `/api/payaid/create-order`
   - `/api/payaid/verify`
   - `/api/payaid/webhook`
   - `/api/subscription/check-feature`
   - `/api/storage/check-limit`

---

## 🎯 Integration Points

### Components to Update:

1. **FundraisingTab.tsx**
   ```typescript
   <FeatureGuard feature="portfolio_fundraising" userId={userId}>
     <PortfolioFundraisingSection />
   </FeatureGuard>
   
   <FeatureGuard feature="fundraising_active" userId={userId}>
     <ActiveFundraisingSection />
   </FeatureGuard>
   ```

2. **GrantsTab.tsx**
   ```typescript
   <FeatureGuard feature="grants_draft" userId={userId}>
     <DraftApplicationsSection />
   </FeatureGuard>
   
   <FeatureGuard feature="grants_add_to_crm" userId={userId}>
     <AddToCRMSection />
   </FeatureGuard>
   ```

3. **InvestorList.tsx**
   ```typescript
   <FeatureGuard feature="investor_ai_matching" userId={userId}>
     <AIInvestorMatchingSection />
   </FeatureGuard>
   
   <FeatureGuard feature="investor_add_to_crm" userId={userId}>
     <AddToCRMSection />
   </FeatureGuard>
   ```

4. **File Upload Components**
   ```typescript
   // Before upload:
   const { allowed } = await storageService.checkStorageLimit(userId, fileSizeMB);
   if (!allowed) {
     showUpgradePrompt();
     return;
   }
   
   // After upload:
   await storageService.trackFileUpload(userId, fileSizeMB, filePath, fileName);
   ```

---

## 📊 Testing Checklist

- [ ] Database migrations run successfully
- [ ] Plan features table populated correctly
- [ ] Subscription plans created with EUR pricing
- [ ] Payment gateway selector works (India → Razorpay, Others → PayAid)
- [ ] Feature access service returns correct permissions
- [ ] Storage service tracks usage correctly
- [ ] Storage limits enforced
- [ ] PayAid service connects (once API keys are available)

---

## 🔐 Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] API keys stored in environment variables
- [ ] Webhook signature verification implemented
- [ ] Server-side feature access validation
- [ ] Storage limits enforced at database level

---

## 📝 Notes

- All database migrations are idempotent (safe to run multiple times)
- PayAid service structure is ready, needs API credentials
- Razorpay integration already exists, needs enhancement for country detection
- All services use singleton pattern for consistency

---

**Last Updated**: [Current Date]  
**Status**: Phase 1 & 2 Complete, Phase 3 In Progress
