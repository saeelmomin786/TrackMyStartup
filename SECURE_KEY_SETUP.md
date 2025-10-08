# 🔒 Secure Razorpay Key Setup Guide

## ⚠️ **SECURITY WARNING**
**NEVER put secret keys directly in source code files!**

## ✅ **SECURE Method: Environment Variables**

### **Step 1: Create `.env.local` File**

Create a `.env.local` file in your project root:

```env
# Razorpay Configuration
# Replace these with your actual Razorpay API keys from dashboard.razorpay.com

# Test Mode Keys (for development)
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_id_here
VITE_RAZORPAY_KEY_SECRET=your_actual_key_secret_here
VITE_RAZORPAY_ENVIRONMENT=test

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Step 2: Add `.env.local` to `.gitignore`**

Make sure your `.gitignore` file includes:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.staging

# Other sensitive files
*.key
*.pem
secrets/
```

### **Step 3: Update `razorpay-config.js` (Already Done)**

The config file now reads from environment variables:

```javascript
export const RAZORPAY_CONFIG = {
  // Get keys from environment variables (secure)
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  keySecret: import.meta.env.VITE_RAZORPAY_KEY_SECRET || 'secret_placeholder',
  
  // Environment
  environment: import.meta.env.VITE_RAZORPAY_ENVIRONMENT || 'test',
  
  // Currency
  currency: 'INR',
  
  // Company details
  companyName: 'Track My Startup',
  companyDescription: 'Incubation Program Payment'
};
```

## 🔒 **Security Best Practices**

### **✅ DO's:**
- ✅ **Use `.env.local`** - Environment variables are secure
- ✅ **Add to `.gitignore`** - Never commit secrets to version control
- ✅ **Use test keys** - For development and testing
- ✅ **Keep secrets secure** - Don't share in chat/email
- ✅ **Use different keys** - For test vs production environments

### **❌ DON'Ts:**
- ❌ **Don't hardcode keys** - In source code files
- ❌ **Don't commit secrets** - To version control
- ❌ **Don't share keys** - In chat, email, or documentation
- ❌ **Don't use live keys** - In development
- ❌ **Don't put keys in config files** - Use environment variables

## 🚀 **How It Works**

### **1. Environment Variables (Secure)**
```javascript
// This reads from .env.local file
keyId: import.meta.env.VITE_RAZORPAY_KEY_ID
```

### **2. Fallback Values (Safe)**
```javascript
// If environment variable is not set, use placeholder
keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder'
```

### **3. Runtime Loading**
- Keys are loaded at runtime from environment
- No secrets in source code
- Safe to commit to version control

## 🧪 **Testing Your Setup**

### **Step 1: Add Keys to `.env.local`**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=test
```

### **Step 2: Restart Development Server**
```bash
npm run dev
```

### **Step 3: Verify Keys Are Loaded**
Add this to any component to test:
```javascript
console.log('Razorpay Key ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
console.log('Environment:', import.meta.env.VITE_RAZORPAY_ENVIRONMENT);
```

## 🔄 **Production Setup**

### **For Production Deployment:**

1. **Set environment variables** in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Railway: Project → Variables
   - Heroku: Settings → Config Vars

2. **Use live keys** (only for production):
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_live_your_live_key_id
   VITE_RAZORPAY_KEY_SECRET=your_live_secret
   VITE_RAZORPAY_ENVIRONMENT=live
   ```

## 🎯 **Summary**

**✅ SECURE Setup:**
1. **Create `.env.local`** with your actual keys
2. **Add `.env.local` to `.gitignore`**
3. **Update `razorpay-config.js`** to read from environment
4. **Restart dev server** - `npm run dev`
5. **Test the integration**

**🔒 Your keys are now secure and not exposed in source code!**












