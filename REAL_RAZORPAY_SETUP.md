# 🔑 Real Razorpay Integration Setup

## 🎯 **You Want Real Razorpay (Not Mock) - Here's How:**

### **Step 1: Get Your Razorpay Keys**

1. **Go to [dashboard.razorpay.com](https://dashboard.razorpay.com/)**
2. **Sign up/Login** to your account
3. **Go to Account & Settings → API Keys**
4. **Generate Key ID and Key Secret**
5. **Copy both keys**

### **Step 2: Create `.env.local` File**

Create a file called `.env.local` in your project root with:

```env
# Replace with your ACTUAL Razorpay keys
VITE_RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=test
```

### **Step 3: Update Razorpay Config**

The `razorpay-config.js` file is already updated to use environment variables.

### **Step 4: Test Mode vs Live Mode**

## **Test Mode (Development):**
- **Key format:** `rzp_test_xxxxxxxxxx`
- **No real money charged**
- **Test card:** `4111 1111 1111 1111`
- **Use for development**

## **Live Mode (Production):**
- **Key format:** `rzp_live_xxxxxxxxxx`
- **Real payments processed**
- **Requires business verification**
- **Use only for production**

### **Step 5: Restart Development Server**

```bash
# Stop current server (Ctrl + C)
npm run dev
```

### **Step 6: Test Real Payment Flow**

1. **Go to Facilitator View**
2. **Click "Message Startup"** on any application
3. **Click "Payment" button**
4. **Should see real Razorpay checkout**
5. **Use test card:** `4111 1111 1111 1111`

## 🔧 **How It Works:**

### **With Real Keys:**
- **Real Razorpay checkout** opens
- **Real payment processing**
- **Real verification** with Razorpay
- **Real database updates**

### **With Mock Keys:**
- **Mock payment simulation**
- **No real checkout**
- **Instant success**

## 🚀 **Expected Results:**

### **Real Razorpay Integration:**
- ✅ **Real checkout page** opens
- ✅ **Real payment processing**
- ✅ **Real verification**
- ✅ **Real database updates**

### **Test Card Details:**
- **Card Number:** `4111 1111 1111 1111`
- **Expiry:** `12/25`
- **CVV:** `123`
- **Name:** Any name
- **Email:** Any email

## 🔒 **Security Notes:**

### **✅ Do's:**
- ✅ **Use `.env.local`** for keys
- ✅ **Add `.env.local` to `.gitignore`**
- ✅ **Use test keys** for development
- ✅ **Keep secrets secure**

### **❌ Don'ts:**
- ❌ **Don't hardcode keys** in source code
- ❌ **Don't commit secrets** to version control
- ❌ **Don't use live keys** in development

## 🎯 **Quick Setup:**

### **1. Get Razorpay Keys:**
- Go to [dashboard.razorpay.com](https://dashboard.razorpay.com/)
- Generate API keys

### **2. Create `.env.local`:**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_here
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=test
```

### **3. Restart Server:**
```bash
npm run dev
```

### **4. Test Payment:**
- Use test card: `4111 1111 1111 1111`
- Should see real Razorpay checkout

## 🎉 **Summary:**

**To use real Razorpay:**
1. **Get your keys** from Razorpay dashboard
2. **Create `.env.local`** with your keys
3. **Restart dev server**
4. **Test with real checkout**

**The system will automatically detect real keys and use real Razorpay instead of mock!** 🚀












