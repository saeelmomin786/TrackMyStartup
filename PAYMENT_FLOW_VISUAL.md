# Payment Flow Visual Diagram

## 🎯 **Complete Payment Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

1. USER SELECTS PLAN
   ┌─────────────────┐
   │ Subscription   │
   │ Page Loads      │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ User Chooses:   │
   │ • Monthly Plan  │
   │ • Yearly Plan   │
   │ • Applies Coupon│
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Tax Calculation │
   │ Base + Tax =    │
   │ Final Amount    │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Payment Options │
   │ • Pay Now       │
   │ • Start Trial   │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Razorpay Modal  │
   │ Opens           │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ User Completes  │
   │ Payment         │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Backend         │
   │ Verification    │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Database        │
   │ Storage         │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Dashboard       │
   │ Access Granted  │
   └─────────────────┘
```

## 🗄️ **Database Storage Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STORAGE                            │
└─────────────────────────────────────────────────────────────────┘

PAYMENT COMPLETED
        │
        ▼
┌─────────────────┐
│ subscription_plans│
│ • Plan details   │
│ • Pricing info   │
│ • Tax percentage │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ user_subscriptions│
│ • User ID        │
│ • Plan ID        │
│ • Status         │
│ • Amount + Tax   │
│ • Trial info     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ payments        │
│ • Razorpay IDs  │
│ • Payment status│
│ • Tax details   │
│ • Timestamps    │
└─────────────────┘
```

## 🔄 **Payment Processing Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT PROCESSING                          │
└─────────────────────────────────────────────────────────────────┘

FRONTEND (React)
        │
        ▼
┌─────────────────┐
│ PaymentService  │
│ • Load Razorpay │
│ • Create Order  │
│ • Handle Payment│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Razorpay API    │
│ • Payment Modal │
│ • User Payment  │
│ • Response      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Backend Server  │
│ • Verify Payment│
│ • Check Signature│
│ • Validate Data │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Supabase DB     │
│ • Store Records │
│ • Update Status │
│ • Grant Access  │
└─────────────────┘
```

## 💰 **Tax Calculation Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                      TAX CALCULATION                          │
└─────────────────────────────────────────────────────────────────┘

PLAN PRICE: ₹1,500
        │
        ▼
┌─────────────────┐
│ Apply Coupon    │
│ 20% off = ₹300  │
│ Discounted: ₹1,200│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Calculate Tax   │
│ 18% of ₹1,200  │
│ Tax: ₹216      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Final Amount    │
│ ₹1,200 + ₹216  │
│ Total: ₹1,416  │
└─────────────────┘
```

## 🎯 **Three Payment Scenarios**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT SCENARIOS                           │
└─────────────────────────────────────────────────────────────────┘

SCENARIO 1: PAY NOW
┌─────────────────┐
│ User pays full  │
│ amount now      │
│ (with discount) │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Immediate       │
│ subscription    │
│ created        │
└─────────────────┘

SCENARIO 2: FREE TRIAL
┌─────────────────┐
│ User sets up    │
│ payment method  │
│ (no charge)     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Trial           │
│ subscription    │
│ created         │
└─────────────────┘

SCENARIO 3: FREE PAYMENT
┌─────────────────┐
│ 100% discount   │
│ applied         │
│ (₹0 amount)     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Free            │
│ subscription    │
│ created         │
└─────────────────┘
```

## 🔐 **Security & Verification**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY FLOW                               │
└─────────────────────────────────────────────────────────────────┘

RAZORPAY PAYMENT
        │
        ▼
┌─────────────────┐
│ Payment Response│
│ • Payment ID    │
│ • Order ID      │
│ • Signature     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Backend         │
│ Verification    │
│ • Check Signature│
│ • Validate Data │
│ • Confirm Payment│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Database        │
│ Storage         │
│ • Secure RLS    │
│ • User Auth     │
│ • Data Validation│
└─────────────────┘
```

## 📊 **Data Storage Summary**

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STORED                             │
└─────────────────────────────────────────────────────────────────┘

subscription_plans:
├── Plan details (name, price, interval)
├── Tax percentage
├── User type & country
└── Active status

user_subscriptions:
├── User ID & Plan ID
├── Subscription status
├── Payment amounts (with tax)
├── Trial information
└── Period dates

payments:
├── Razorpay payment IDs
├── Payment status
├── Amount & tax details
└── Timestamps

coupons:
├── Discount codes
├── Usage limits
├── Validity periods
└── Active status
```

## 🎉 **Success Flow**

```
PAYMENT SUCCESS
        │
        ▼
┌─────────────────┐
│ ✅ Razorpay     │
│ Payment Complete│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ ✅ Backend      │
│ Verification OK │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ ✅ Database     │
│ Records Created │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ ✅ Dashboard    │
│ Access Granted  │
└─────────────────┘
```
