# 🔧 Complete Environment Variables Setup Guide

## 📋 **Step-by-Step Configuration**

### **Step 1: Create Your .env File**

Create a new file called `.env` in your project root directory with the following content:

```bash
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ===========================================
# RAZORPAY CONFIGURATION
# ===========================================
VITE_RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id_here
VITE_RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here

# ===========================================
# SERVER CONFIGURATION
# ===========================================
PORT=3001
NODE_ENV=development
```

---

## 🔑 **How to Get Each Variable**

### **1. Supabase Configuration**

#### **VITE_SUPABASE_URL**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL**
5. Replace `your_supabase_project_url_here` with this URL

#### **VITE_SUPABASE_ANON_KEY**
1. In the same **Settings** → **API** page
2. Copy the **anon/public** key
3. Replace `your_supabase_anon_key_here` with this key

#### **SUPABASE_SERVICE_ROLE_KEY**
1. In the same **Settings** → **API** page
2. Copy the **service_role** key (⚠️ **Keep this secret!**)
3. Replace `your_supabase_service_role_key_here` with this key

---

### **2. Razorpay Configuration**

#### **VITE_RAZORPAY_KEY_ID**
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **API Keys**
3. Copy the **Key ID** (starts with `rzp_test_` for test mode)
4. Replace `rzp_test_your_razorpay_key_id_here` with this Key ID

#### **VITE_RAZORPAY_KEY_SECRET**
1. In the same **API Keys** page
2. Click **Reveal** next to the **Key Secret**
3. Copy the secret key
4. Replace `your_razorpay_key_secret_here` with this secret

#### **RAZORPAY_WEBHOOK_SECRET**
1. Go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Set **URL**: `https://yourdomain.com/api/razorpay/webhook`
4. Select these events:
   - `payment.captured`
   - `payment.failed`
   - `payment.refunded`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.paused`
   - `subscription.cancelled`
5. Click **Create Webhook**
6. Copy the **Webhook Secret** from the created webhook
7. Replace `your_razorpay_webhook_secret_here` with this secret

---

## 🚀 **Quick Setup Commands**

### **For Development (Test Mode)**
```bash
# Use Razorpay Test Mode
VITE_RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
VITE_RAZORPAY_KEY_SECRET=test_secret_1234567890abcdef
RAZORPAY_WEBHOOK_SECRET=whsec_test_1234567890abcdef
```

### **For Production**
```bash
# Use Razorpay Live Mode
VITE_RAZORPAY_KEY_ID=rzp_live_1234567890abcdef
VITE_RAZORPAY_KEY_SECRET=live_secret_1234567890abcdef
RAZORPAY_WEBHOOK_SECRET=whsec_live_1234567890abcdef
```

---

## 🔍 **Verification Steps**

### **1. Test Supabase Connection**
```bash
# Check if Supabase variables are loaded
npm run dev
# Look for: "Supabase client initialized successfully"
```

### **2. Test Razorpay Connection**
```bash
# Check server logs for Razorpay configuration
npm run server
# Look for: "Razorpay keys configured: true"
```

### **3. Test Webhook (Optional)**
```bash
# Use ngrok for local webhook testing
npx ngrok http 3001
# Update webhook URL in Razorpay dashboard
```

---

## ⚠️ **Important Security Notes**

1. **Never commit `.env` file to git**
2. **Use test keys for development**
3. **Keep service role key secret**
4. **Use HTTPS for production webhooks**
5. **Rotate keys regularly**

---

## 🎯 **Example Complete .env File**

```bash
# Supabase (Replace with your actual values)
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Razorpay Test Mode
VITE_RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
VITE_RAZORPAY_KEY_SECRET=test_secret_1234567890abcdef
RAZORPAY_WEBHOOK_SECRET=whsec_test_1234567890abcdef

# Server
PORT=3001
NODE_ENV=development
```

---

## 🚨 **Troubleshooting**

### **"Supabase not initialized"**
- Check if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Ensure no extra spaces in the values

### **"Razorpay keys not configured"**
- Check if `VITE_RAZORPAY_KEY_ID` and `VITE_RAZORPAY_KEY_SECRET` are correct
- Ensure you're using the right environment (test/live)

### **"Webhook signature invalid"**
- Check if `RAZORPAY_WEBHOOK_SECRET` matches the webhook secret in Razorpay dashboard
- Ensure webhook URL is accessible

---

## ✅ **Final Checklist**

- [ ] Created `.env` file in project root
- [ ] Added Supabase URL and keys
- [ ] Added Razorpay test keys
- [ ] Set up webhook in Razorpay dashboard
- [ ] Added webhook secret
- [ ] Tested Supabase connection
- [ ] Tested Razorpay connection
- [ ] Verified webhook is working

**Your payment system is now ready to go! 🎉**
