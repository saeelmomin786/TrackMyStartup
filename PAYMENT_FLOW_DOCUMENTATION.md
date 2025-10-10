# Complete Payment Flow Documentation

## 🎯 **Payment System Overview**

This document explains the complete payment flow from user selection to database storage, including all data structures and processes.

---

## 📋 **1. Payment Flow Steps**

### **Step 1: User Selects Plan**
- User visits subscription page (`StartupSubscriptionPage.tsx`)
- Selects a subscription plan (Monthly/Yearly)
- Optionally applies a coupon code
- System calculates final price including tax

### **Step 2: Payment Method Selection**
- User chooses between:
  - **"Pay Now"** - Immediate payment with discount
  - **"Start Free Trial"** - 30-day trial with payment method setup

### **Step 3: Razorpay Integration**
- System loads Razorpay script
- Creates Razorpay order/subscription
- Opens Razorpay checkout modal
- User completes payment in Razorpay

### **Step 4: Payment Verification**
- Razorpay returns payment response
- System verifies payment with backend server
- Backend verifies Razorpay signature
- Payment is confirmed as successful

### **Step 5: Database Storage**
- Creates user subscription record
- Stores payment information
- Records tax calculations
- Updates user status

### **Step 6: Dashboard Access**
- User is redirected to dashboard
- Subscription status is checked
- Full access is granted

---

## 🗄️ **2. Database Tables & Data Storage**

### **A. subscription_plans Table**
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(10),
    interval VARCHAR(20), -- 'monthly' or 'yearly'
    description TEXT,
    user_type VARCHAR(50),
    country VARCHAR(100),
    is_active BOOLEAN,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00
);
```

**Stores:** Plan configurations with pricing and tax information

### **B. user_subscriptions Table**
```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20), -- 'active', 'cancelled', 'expired'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    amount DECIMAL(10,2),
    interval VARCHAR(20),
    is_in_trial BOOLEAN DEFAULT false,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Stores:** User subscription records with payment and tax information

### **C. payments Table**
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    razorpay_payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    amount DECIMAL(10,2),
    currency VARCHAR(10),
    status VARCHAR(20), -- 'paid', 'failed', 'pending'
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Stores:** Individual payment records with Razorpay details

### **D. coupons Table**
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    discount_type VARCHAR(20), -- 'percentage' or 'fixed'
    discount_value DECIMAL(10,2),
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

**Stores:** Discount coupon configurations

---

## 🔄 **3. Payment Flow Components**

### **A. Frontend Components**

#### **1. StartupSubscriptionPage.tsx**
- **Purpose:** Main subscription selection interface
- **Features:**
  - Plan selection (Monthly/Yearly)
  - Coupon application
  - Tax calculation display
  - Payment method selection (Pay Now vs Free Trial)

#### **2. PaymentService.ts**
- **Purpose:** Centralized payment processing
- **Key Methods:**
  - `processPayment()` - Handles immediate payments
  - `createTrialSubscription()` - Handles trial setup
  - `verifyPayment()` - Verifies Razorpay payments
  - `createUserSubscription()` - Creates subscription records

### **B. Backend Components**

#### **1. server.js (Port 3001)**
- **Purpose:** Razorpay integration server
- **Endpoints:**
  - `/api/razorpay/create-order` - Creates payment orders
  - `/api/razorpay/verify` - Verifies payment signatures
  - `/api/razorpay/create-subscription` - Creates recurring subscriptions
  - `/api/razorpay/create-trial-subscription` - Creates trial subscriptions

#### **2. Razorpay Integration**
- **Order Creation:** One-time payments
- **Subscription Creation:** Recurring payments
- **Signature Verification:** Security validation
- **Webhook Handling:** Payment status updates

---

## 💰 **4. Payment Scenarios**

### **Scenario A: Immediate Payment (Pay Now)**
```
1. User selects plan → 2. Applies coupon → 3. Calculates tax
4. Creates Razorpay order → 5. Opens payment modal
6. User pays → 7. Verifies payment → 8. Creates subscription
9. Stores payment record → 10. Redirects to dashboard
```

### **Scenario B: Free Trial Setup**
```
1. User selects plan → 2. Chooses "Start Free Trial"
3. Creates Razorpay subscription → 4. Opens payment modal
5. User sets up payment method → 6. Creates trial subscription
7. Stores trial record → 8. Redirects to dashboard
```

### **Scenario C: Free Payment (100% Discount)**
```
1. User applies 100% coupon → 2. Calculates final amount (₹0)
3. Skips Razorpay → 4. Creates subscription directly
5. Stores free subscription → 6. Redirects to dashboard
```

---

## 🧮 **5. Tax Calculation Flow**

### **Tax Calculation Process:**
```
Base Amount = Plan Price
↓
Apply Coupon Discount
↓
Calculate Tax = (Discounted Amount × Tax Percentage)
↓
Final Amount = Discounted Amount + Tax
```

### **Example:**
```
Plan Price: ₹1,500
Coupon: 20% off = ₹300 discount
Discounted Amount: ₹1,200
Tax (18%): ₹216
Final Amount: ₹1,416
```

---

## 🔐 **6. Security & Verification**

### **A. Razorpay Signature Verification**
```javascript
// Backend verification process
const expectedSignature = crypto
  .createHmac('sha256', keySecret)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');

if (expectedSignature !== razorpay_signature) {
  throw new Error('Invalid payment signature');
}
```

### **B. Database Security**
- **RLS Policies:** Row-level security for data access
- **User Authentication:** Supabase auth integration
- **Data Validation:** Input sanitization and validation

---

## 📊 **7. Data Flow Diagram**

```
User Selection
    ↓
Plan + Coupon + Tax Calculation
    ↓
Razorpay Integration
    ↓
Payment Processing
    ↓
Backend Verification
    ↓
Database Storage
    ↓
Dashboard Access
```

---

## 🎯 **8. Key Features**

### **A. Flexible Pricing**
- Monthly and yearly plans
- Country-specific pricing
- User type-based plans
- Tax calculation per plan

### **B. Discount System**
- Percentage discounts
- Fixed amount discounts
- Usage limits
- Validity periods

### **C. Trial System**
- 30-day free trials
- Payment method setup
- Automatic conversion
- Trial status tracking

### **D. Payment Methods**
- Credit/Debit cards
- UPI payments
- Net banking
- Wallets

---

## 🔧 **9. Configuration**

### **A. Environment Variables**
```env
VITE_RAZORPAY_KEY_ID=your_key_id
VITE_RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_STARTUP_PLAN_ID_MONTHLY=plan_monthly_id
RAZORPAY_STARTUP_PLAN_ID_YEARLY=plan_yearly_id
```

### **B. Database Setup**
- Run `ADD_TAX_COLUMNS.sql` for tax support
- Configure RLS policies
- Set up webhook endpoints

---

## 🚀 **10. Success Indicators**

### **A. Payment Success**
- Razorpay payment completed
- Signature verification passed
- Database records created
- User redirected to dashboard

### **B. Trial Success**
- Payment method setup completed
- Trial subscription created
- 30-day access granted
- Automatic billing configured

---

## 🎉 **Summary**

The payment system provides a complete subscription management solution with:
- **Flexible pricing** with tax support
- **Multiple payment methods** via Razorpay
- **Trial system** for user acquisition
- **Secure verification** and data storage
- **Real-time dashboard** access

All payment data is securely stored in Supabase with proper validation and security measures.
