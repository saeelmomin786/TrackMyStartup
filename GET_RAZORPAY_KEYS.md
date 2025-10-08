# 🔑 Get Your Razorpay Keys - Step by Step

## 🚨 **Current Issue:**
The system is using a placeholder key `rzp_test_1234567890` which causes 401 Unauthorized errors. You need to get your real Razorpay keys.

## ✅ **Step-by-Step Solution:**

### **Step 1: Create Razorpay Account**

1. **Go to [dashboard.razorpay.com](https://dashboard.razorpay.com/)**
2. **Click "Sign Up"**
3. **Fill in your details:**
   - Business name: "Track My Startup" (or your company name)
   - Business type: "Technology" or "SaaS"
   - Country: India
   - Mobile number
   - Email address

### **Step 2: Verify Your Account**

1. **Check your email** for verification link
2. **Verify your mobile number** with OTP
3. **Complete business details** (basic info is enough for test mode)

### **Step 3: Get Your API Keys**

1. **Login to Razorpay Dashboard**
2. **Go to Settings → API Keys**
3. **Click "Generate API Keys"**
4. **Copy both:**
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (long string)

### **Step 4: Set Up Environment Variables**

Create a `.env.local` file in your project root:

```env
# Replace with your ACTUAL Razorpay keys
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_here
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=test
```

### **Step 5: Test Your Setup**

1. **Start the payment server:**
   ```bash
   npm run server
   ```

2. **Start your React app:**
   ```bash
   npm run dev
   ```

3. **Test the payment flow**

## 🔍 **How to Verify Your Keys Are Working:**

### **Check 1: Environment Variables**
Add this to any component to verify:
```javascript
console.log('Razorpay Key ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
```

### **Check 2: Server Logs**
When you start the server, you should see:
```
[Startup] Razorpay Key ID present: true
[Startup] Razorpay Key Secret present: true
```

### **Check 3: Test Payment**
1. Go to subscription modal
2. Click "Pay" button
3. Should open real Razorpay checkout (not 401 error)

## 🧪 **Test Mode vs Live Mode:**

### **Test Mode (Development):**
- **Key format:** `rzp_test_xxxxxxxxxx`
- **No real money charged**
- **Test card:** `4111 1111 1111 1111`
- **Use for development**

### **Live Mode (Production):**
- **Key format:** `rzp_live_xxxxxxxxxx`
- **Real payments processed**
- **Requires business verification**
- **Use only for production**

## 🚨 **Common Issues:**

### **Issue 1: "401 Unauthorized"**
- **Cause:** Using placeholder keys
- **Solution:** Get real keys from Razorpay dashboard

### **Issue 2: "Key not found"**
- **Cause:** Wrong environment variable name
- **Solution:** Use `VITE_RAZORPAY_KEY_ID` (not `REACT_APP_RAZORPAY_KEY_ID`)

### **Issue 3: "Environment variables not loading"**
- **Cause:** Wrong file location or name
- **Solution:** File must be `.env.local` in project root

## 📋 **Quick Checklist:**

- [ ] Created Razorpay account
- [ ] Got API keys from dashboard
- [ ] Created `.env.local` file
- [ ] Added keys to `.env.local`
- [ ] Restarted development server
- [ ] Tested payment flow

## 🎯 **Expected Result:**

Once you have real Razorpay keys:
1. **No more 401 errors**
2. **Real Razorpay checkout opens**
3. **Payment processing works**
4. **Success callbacks triggered**

## 🆘 **Still Having Issues?**

1. **Double-check your keys** are copied correctly
2. **Verify file location** (`.env.local` in project root)
3. **Restart both servers** (payment server + React app)
4. **Check console logs** for error messages
5. **Test with curl** to isolate issues

## 📞 **Quick Test:**

```bash
# Test if your keys work
curl -X POST http://localhost:3001/api/razorpay/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 35400, "currency": "INR"}'
```

If this returns a valid order, your keys are working!


