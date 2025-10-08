# 🔧 Payment Troubleshooting Guide

## 🚨 **Current Error:**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
/api/payment/create-order:1
```

## ✅ **SOLUTION STEPS:**

### **Step 1: Start the Payment Server**

The payment server needs to be running separately from your React app.

```bash
# Option 1: Use the helper script
node start-payment-server.js

# Option 2: Start manually
node server.js
```

### **Step 2: Set Up Environment Variables**

Create a `.env.local` file in your project root:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_here
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=test
```

### **Step 3: Get Your Razorpay Keys**

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com/)
2. Sign up/Login
3. Go to **Account & Settings → API Keys**
4. Generate **Key ID** and **Key Secret**
5. Copy both keys to your `.env.local` file

### **Step 4: Install Dependencies (if needed)**

```bash
npm install express cors dotenv node-fetch
```

### **Step 5: Test the Setup**

1. **Start the payment server:**
   ```bash
   node server.js
   ```

2. **In another terminal, start your React app:**
   ```bash
   npm run dev
   ```

3. **Test the payment endpoint:**
   ```bash
   curl -X POST http://localhost:3001/api/razorpay/create-order \
     -H "Content-Type: application/json" \
     -d '{"amount": 35400, "currency": "INR"}'
   ```

## 🔍 **Common Issues & Solutions:**

### **Issue 1: "Razorpay keys not configured"**
- **Solution:** Make sure your `.env.local` file has the correct keys
- **Check:** Server console should show "Razorpay Key ID present: true"

### **Issue 2: "Failed to fetch" error**
- **Solution:** Make sure the payment server is running on port 3001
- **Check:** Visit http://localhost:3001/health

### **Issue 3: "404 Not Found"**
- **Solution:** The endpoint is `/api/razorpay/create-order` (not `/api/payment/create-order`)
- **Check:** This has been fixed in the code

### **Issue 4: CORS errors**
- **Solution:** The server has CORS enabled, but make sure both servers are running

## 🚀 **Expected Working Flow:**

1. **User clicks "Pay" button**
2. **Frontend calls:** `POST /api/razorpay/create-order`
3. **Server creates Razorpay order**
4. **Frontend opens Razorpay checkout**
5. **User completes payment**
6. **Success callback triggered**

## 📋 **Server Endpoints:**

- `GET /health` - Health check
- `POST /api/razorpay/create-order` - Create payment order
- `POST /api/razorpay/create-subscription` - Create subscription
- `POST /api/razorpay/verify` - Verify payment

## 🔧 **Development vs Production:**

### **Development (Test Mode):**
- Use keys starting with `rzp_test_`
- No real money charged
- Test card: `4111 1111 1111 1111`

### **Production (Live Mode):**
- Use keys starting with `rzp_live_`
- Real payments processed
- Requires business verification

## 🆘 **Still Having Issues?**

1. **Check server logs** for detailed error messages
2. **Verify environment variables** are loaded correctly
3. **Test with curl** to isolate frontend vs backend issues
4. **Check Razorpay dashboard** for API key validity

## 📞 **Quick Test Commands:**

```bash
# Test server health
curl http://localhost:3001/health

# Test payment order creation
curl -X POST http://localhost:3001/api/razorpay/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 35400, "currency": "INR", "receipt": "test_123"}'
```

If these commands work, the issue is in the frontend. If they don't, the issue is in the server setup.


