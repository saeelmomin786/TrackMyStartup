# Monthly & Yearly Startup Subscription Plans Setup Guide

This guide explains how to set up both monthly and yearly subscription plans for startup users with 7-day free trials.

## 🎯 **Overview**

The system now supports:
- **Monthly Plans**: ₹15.00/month (or equivalent in other currencies)
- **Yearly Plans**: ₹120.00/year (save 2 months - 2 months free)
- **7-Day Free Trial**: For both monthly and yearly plans
- **Automatic Billing**: Razorpay handles recurring charges
- **Multi-Currency Support**: EUR, INR, USD

## 📋 **Implementation Steps**

### **Step 1: Database Setup (CRITICAL)**

Run these SQL files in your **Supabase SQL Editor** in order:

1. **First, run the main schema**:
   ```sql
   -- Copy and paste the contents of STARTUP_SUBSCRIPTION_PLANS_SCHEMA.sql
   ```

2. **Then, verify the setup**:
   ```sql
   -- Copy and paste the contents of VERIFY_SUBSCRIPTION_PLANS.sql
   ```

### **Step 2: Razorpay Dashboard Setup**

#### **2.1 Create Monthly Plan**
1. Go to **Razorpay Dashboard** → **Plans** → **Create Plan**
2. **Plan Details**:
   - Plan Name: "Startup Monthly Plan"
   - Amount: ₹15.00 (or your local currency)
   - Interval: Monthly
   - Description: "Monthly subscription for startup users"
3. **Note the Plan ID** (e.g., `pl_1234567890abcdef`)

#### **2.2 Create Yearly Plan**
1. **Plan Details**:
   - Plan Name: "Startup Yearly Plan"
   - Amount: ₹120.00 (or your local currency)
   - Interval: Yearly
   - Description: "Yearly subscription for startup users - save 2 months"
2. **Note the Plan ID** (e.g., `pl_0987654321fedcba`)

### **Step 3: Environment Variables**

Add these to your `.env.local` file:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Razorpay Plan IDs for Startup Subscriptions
RAZORPAY_STARTUP_PLAN_ID_MONTHLY=pl_1234567890abcdef
RAZORPAY_STARTUP_PLAN_ID_YEARLY=pl_0987654321fedcba

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Step 4: Webhook Configuration**

1. **Go to Razorpay Dashboard** → **Settings** → **Webhooks**
2. **Add Webhook**:
   - URL: `https://yourdomain.com/api/razorpay/webhook`
   - Events: Select these events:
     - `subscription.activated`
     - `subscription.charged`
     - `payment.failed`
     - `subscription.cancelled`
     - `subscription.paused`

### **Step 5: Test the Implementation**

#### **5.1 Start Your Server**
```bash
npm start
# or
yarn start
```

#### **5.2 Test as Startup User**
1. **Login as startup user**
2. **You should see**: "Start Your Free Trial" button
3. **Click the button**: Trial modal opens
4. **You should see both plans**:
   - Monthly Plan: ₹15.00/month
   - Yearly Plan: ₹120.00/year (with "Save 2 months free!" badge)

#### **5.3 Test Plan Selection**
1. **Select Monthly Plan**: Click to select
2. **Start Trial**: Click "Start 7-Day Free Trial"
3. **Razorpay Modal**: Should open with monthly plan
4. **Complete Payment**: Trial should start

## 🎨 **User Experience**

### **For Startup Users:**

#### **Trial Start Process:**
1. **See trial button** on dashboard
2. **Click "Start Free Trial"** → Modal opens
3. **Choose plan**:
   - **Monthly**: ₹15.00/month - "Flexible monthly billing"
   - **Yearly**: ₹120.00/year - "Best Value - Save 2 months!"
4. **Click "Start 7-Day Free Trial"** → Razorpay modal opens
5. **Complete payment setup** → Trial starts

#### **During Trial:**
- **Full access** to all features
- **Trial banner** shows progress and time remaining
- **Can cancel anytime** during trial

#### **After Trial:**
- **Automatic charging** based on selected plan
- **Monthly users**: Charged ₹15.00 every month
- **Yearly users**: Charged ₹120.00 every year

### **Plan Comparison for Users:**

| Feature | Monthly Plan | Yearly Plan |
|---------|-------------|-------------|
| **Price** | ₹15.00/month | ₹120.00/year |
| **Monthly Equivalent** | ₹15.00 | ₹10.00 |
| **Savings** | - | 2 months free |
| **Billing** | Monthly | Yearly |
| **Best For** | Testing, flexibility | Long-term use |

## 🔧 **Technical Implementation**

### **Database Schema:**
- **subscription_plans**: Stores monthly and yearly plans
- **user_subscriptions**: Tracks user subscriptions with trial support
- **Trial columns**: `is_in_trial`, `trial_start`, `trial_end`

### **API Endpoints:**
- **POST** `/api/razorpay/create-trial-subscription`: Creates trial subscription
- **POST** `/api/razorpay/webhook`: Handles Razorpay events

### **Frontend Components:**
- **TrialSubscriptionModal**: Plan selection and trial start
- **TrialStatusBanner**: Trial progress tracking
- **Plan comparison**: Shows savings with yearly plan

### **Razorpay Integration:**
- **Multiple plans**: Different plan IDs for monthly/yearly
- **Trial periods**: 7-day trial for both plans
- **Automatic billing**: Razorpay handles recurring charges

## 📊 **Monitoring & Analytics**

### **Database Queries:**

#### **Check Active Plans:**
```sql
SELECT * FROM active_startup_plans;
```

#### **Check Trial Subscriptions:**
```sql
SELECT * FROM active_trial_subscriptions;
```

#### **Check User Trial Status:**
```sql
SELECT has_active_trial('user-uuid-here');
```

#### **Get User Trial Details:**
```sql
SELECT * FROM get_user_trial_subscription('user-uuid-here');
```

### **Razorpay Dashboard:**
- **View subscriptions** by plan type
- **Monitor trial conversions**
- **Track payment success rates**

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. Plans Not Showing:**
- ✅ Check database: Run `VERIFY_SUBSCRIPTION_PLANS.sql`
- ✅ Check environment variables
- ✅ Check Razorpay plan IDs

#### **2. Trial Not Starting:**
- ✅ Check Razorpay keys
- ✅ Check webhook configuration
- ✅ Check database trial columns

#### **3. Payment Not Processing:**
- ✅ Check webhook endpoint
- ✅ Check webhook secret
- ✅ Check Razorpay dashboard

### **Debug Steps:**
1. **Check database**: Verify plans exist
2. **Check environment**: Verify Razorpay keys
3. **Check webhooks**: Verify Razorpay webhook configuration
4. **Check logs**: Look for errors in browser console and server logs

## 🎯 **Success Criteria**

After implementation, you should have:

✅ **Database**: Monthly and yearly plans created  
✅ **Razorpay**: Two plans with different IDs  
✅ **Frontend**: Plan selection modal with both options  
✅ **Trial**: 7-day free trial for both plans  
✅ **Billing**: Automatic charging after trial  
✅ **Monitoring**: Database queries and Razorpay dashboard  

## 🚀 **Next Steps**

1. **Run the database schema**
2. **Set up Razorpay plans**
3. **Configure environment variables**
4. **Test with startup users**
5. **Monitor trial conversions**

The system now supports **both monthly and yearly subscriptions** with **7-day free trials**! 🎉






