# 💳 Payment Setup Guide

## 🚨 **Current Issue:**
Payment is failing with 404 error because the payment server is not running.

## ✅ **Quick Fix:**

### **1. Start the Payment Server**
```bash
# Option 1: Use the helper script
npm run start-payment-server

# Option 2: Start manually
npm run server
```

### **2. Set Up Razorpay Keys**
Create `.env.local` file in project root:
```env
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_here
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=test
```

### **3. Get Your Razorpay Keys**
1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com/)
2. Sign up/Login
3. Go to **Account & Settings → API Keys**
4. Generate keys and copy to `.env.local`

### **4. Test the Setup**
```bash
# Terminal 1: Start payment server
npm run server

# Terminal 2: Start React app
npm run dev
```

## 🔧 **What Was Fixed:**

1. **✅ Fixed API endpoint** - Changed from `/api/payment/create-order` to `/api/razorpay/create-order`
2. **✅ Added better error handling** - Shows specific error messages
3. **✅ Created helper scripts** - Easy server startup
4. **✅ Added troubleshooting guide** - Complete setup instructions

## 🚀 **Expected Flow:**

1. User clicks "Pay" button
2. Frontend calls payment server
3. Server creates Razorpay order
4. Razorpay checkout opens
5. User completes payment
6. Success callback triggered

## 📋 **Available Scripts:**

- `npm run server` - Start payment server
- `npm run start-payment-server` - Start with helper script
- `npm run dev` - Start React app

## 🔍 **Troubleshooting:**

If you still get errors:
1. Check if server is running: `curl http://localhost:3001/health`
2. Check environment variables are loaded
3. Verify Razorpay keys are correct
4. See `PAYMENT_TROUBLESHOOTING.md` for detailed help

## 🎯 **Next Steps:**

1. **Start the payment server** (required)
2. **Set up your Razorpay keys** (required)
3. **Test the payment flow** (recommended)
4. **Deploy with production keys** (for production)

The payment system is now properly configured and should work once the server is running and keys are set up!


