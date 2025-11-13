# Domain Migration Guide - Quick Reference

This guide shows exactly what code changes to make once you have the client's domain information.

---

## 📝 Step 1: Update Environment Configuration

**File:** `config/environment.ts`

Replace `[CLIENT_DOMAIN]` with the actual domain:

```typescript
// Environment configuration for different deployment environments
export const environment = {
  // Development
  development: {
    siteUrl: 'http://localhost:5173',
    emailRedirectUrl: 'http://localhost:5173/complete-registration',
    passwordResetUrl: 'http://localhost:5173/reset-password',
    supabaseUrl: 'https://dlesebbmlrewsbmqvuza.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZXNlYmJtbHJld3NibXF2dXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTMxMTcsImV4cCI6MjA3MDEyOTExN30.zFTVSgL5QpVqEDc-nQuKbaG_3egHZEm-V17UvkOpFCQ'
  },
  
  // Production - CLIENT DOMAIN
  production: {
    siteUrl: 'https://[CLIENT_DOMAIN]',  // ← CHANGE THIS
    emailRedirectUrl: 'https://[CLIENT_DOMAIN]/complete-registration',  // ← CHANGE THIS
    passwordResetUrl: 'https://[CLIENT_DOMAIN]/reset-password',  // ← CHANGE THIS
    supabaseUrl: 'https://dlesebbmlrewsbmqvuza.supabase.co',  // ← Update if using new Supabase project
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // ← Update if using new Supabase project
  }
};

// Function to get current environment
export const getCurrentEnvironment = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const hostname = window.location.hostname;
    // Force production for client domain
    if (host.endsWith('[CLIENT_DOMAIN]')) return 'production';  // ← CHANGE THIS
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    return 'production';
  }
  return 'development';
};
```

**Example:**
If client domain is `app.example.com`:
```typescript
siteUrl: 'https://app.example.com',
emailRedirectUrl: 'https://app.example.com/complete-registration',
passwordResetUrl: 'https://app.example.com/reset-password',
// ...
if (host.endsWith('app.example.com')) return 'production';
```

---

## 📝 Step 2: Update Supabase Client Configuration

**File:** `lib/supabase.ts`

Find this line (around line 7):
```typescript
if (typeof window !== 'undefined' && window.location.host.endsWith('trackmystartup.com')) {
```

Replace with:
```typescript
if (typeof window !== 'undefined' && window.location.host.endsWith('[CLIENT_DOMAIN]')) {
```

Also find this line (around line 69):
```typescript
if (!(typeof window !== 'undefined' && window.location.host.endsWith('trackmystartup.com'))) {
```

Replace with:
```typescript
if (!(typeof window !== 'undefined' && window.location.host.endsWith('[CLIENT_DOMAIN]'))) {
```

---

## 📝 Step 3: Update Supabase Dashboard

1. Go to Supabase Dashboard → Your Project
2. Navigate to **Authentication** → **URL Configuration**
3. Add these URLs to **Redirect URLs**:
   ```
   https://[CLIENT_DOMAIN]/complete-registration
   https://[CLIENT_DOMAIN]/reset-password
   https://[CLIENT_DOMAIN]/auth/callback
   ```
4. Update **Site URL** to:
   ```
   https://[CLIENT_DOMAIN]
   ```

---

## 📝 Step 4: Configure Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add/Update these variables for **Production** environment:

```bash
VITE_SUPABASE_URL=https://[your-supabase-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-supabase-anon-key]
VITE_RAZORPAY_KEY_ID=[razorpay-key-id]  # If applicable
VITE_RAZORPAY_ENVIRONMENT=production  # or 'test'
RAZORPAY_KEY_SECRET=[razorpay-secret]  # Server-side only
GEMINI_API_KEY=[gemini-key]  # If using AI features
```

**Note:** The domain-specific URLs are already in `config/environment.ts`, so you don't need to add them as environment variables.

---

## 📝 Step 5: Add Domain in Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter the client's domain (e.g., `app.example.com`)
4. Vercel will show you DNS records to add
5. Copy the CNAME or A record value

---

## 📝 Step 6: Configure DNS in Wix

### Option A: If you have Wix access

1. Log in to Wix Dashboard
2. Go to **Domains** → Select the domain → **DNS Settings**
3. Add a new DNS record:
   - **Type:** CNAME (or A record if Vercel provides IP)
   - **Name:** `@` (for root domain) or subdomain name (e.g., `app`)
   - **Value:** The value Vercel provided (e.g., `cname.vercel-dns.com`)
   - **TTL:** 3600 (or default)

### Option B: If client adds DNS records

Send them these instructions:

```
Please add the following DNS record in your Wix DNS settings:

Type: CNAME
Name: @ (for root domain) or [subdomain] (e.g., "app")
Value: [Vercel CNAME value]
TTL: 3600

This will point your domain to our hosting platform.
```

---

## 📝 Step 7: Configure Razorpay Webhooks (If Applicable)

1. Log in to Razorpay Dashboard
2. Go to **Settings** → **Webhooks**
3. Click **Add New Webhook**
4. Enter:
   - **Webhook URL:** `https://[CLIENT_DOMAIN]/api/razorpay/verify`
   - **Events:** Select:
     - `payment.captured`
     - `subscription.charged`
     - `subscription.activated`
     - `subscription.cancelled`
5. Save the webhook
6. Copy the **Webhook Secret** (if provided) and add it to Vercel environment variables

---

## ✅ Step 8: Testing Checklist

After deployment, test these:

- [ ] **Domain loads correctly**
  - Visit `https://[CLIENT_DOMAIN]` - should show the app

- [ ] **SSL Certificate is active**
  - Check for padlock icon in browser
  - Should be HTTPS (not HTTP)

- [ ] **User Registration**
  - Try registering a new user
  - Check email for verification link
  - Click link - should redirect to `https://[CLIENT_DOMAIN]/complete-registration`

- [ ] **Password Reset**
  - Try "Forgot Password"
  - Check email for reset link
  - Click link - should redirect to `https://[CLIENT_DOMAIN]/reset-password`

- [ ] **Authentication Flow**
  - Login works
  - Logout works
  - Session persists

- [ ] **Payment Flow** (if applicable)
  - Test payment creation
  - Verify webhook receives events
  - Check payment status updates

- [ ] **Environment Detection**
  - Check browser console - should show production config
  - No development URLs should appear

---

## 🔍 Troubleshooting

### Issue: Domain not loading
**Solution:**
- Check DNS propagation: https://www.whatsmydns.net/
- Verify DNS records are correct in Wix
- Wait up to 48 hours for full propagation

### Issue: SSL Certificate not working
**Solution:**
- Vercel automatically provisions SSL
- Wait 5-10 minutes after adding domain
- Check Vercel dashboard for SSL status

### Issue: Email redirects not working
**Solution:**
- Verify Supabase redirect URLs are added correctly
- Check that URLs match exactly (including https://)
- Clear browser cache and try again

### Issue: Environment variables not loading
**Solution:**
- Verify variables are set for "Production" environment in Vercel
- Redeploy after adding variables
- Check Vercel build logs for errors

### Issue: Payment webhooks not working
**Solution:**
- Verify webhook URL is correct in Razorpay
- Check Vercel function logs for webhook events
- Test webhook using Razorpay's test tool

---

## 📋 Quick Copy-Paste Checklist

```
[ ] Updated config/environment.ts with client domain
[ ] Updated lib/supabase.ts domain checks
[ ] Added redirect URLs in Supabase dashboard
[ ] Added domain in Vercel dashboard
[ ] Configured DNS in Wix
[ ] Set environment variables in Vercel
[ ] Configured Razorpay webhooks (if applicable)
[ ] Tested user registration
[ ] Tested password reset
[ ] Tested authentication
[ ] Tested payment flow (if applicable)
[ ] Verified SSL certificate
[ ] Checked production environment detection
```

---

## 🎯 Example: Complete Migration for `app.example.com`

### 1. config/environment.ts
```typescript
production: {
  siteUrl: 'https://app.example.com',
  emailRedirectUrl: 'https://app.example.com/complete-registration',
  passwordResetUrl: 'https://app.example.com/reset-password',
  supabaseUrl: 'https://dlesebbmlrewsbmqvuza.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
// ...
if (host.endsWith('app.example.com')) return 'production';
```

### 2. lib/supabase.ts
```typescript
if (typeof window !== 'undefined' && window.location.host.endsWith('app.example.com')) {
  // Suppress logs
}
// ...
if (!(typeof window !== 'undefined' && window.location.host.endsWith('app.example.com'))) {
  console.log('Supabase client initialized');
}
```

### 3. Supabase Dashboard
```
Redirect URLs:
- https://app.example.com/complete-registration
- https://app.example.com/reset-password
- https://app.example.com/auth/callback

Site URL:
- https://app.example.com
```

### 4. Vercel DNS
```
CNAME Record:
Name: app
Value: cname.vercel-dns.com
```

### 5. Razorpay Webhook
```
URL: https://app.example.com/api/razorpay/verify
```

---

*This guide assumes you're deploying to Vercel. Adjust steps if using a different hosting provider.*

