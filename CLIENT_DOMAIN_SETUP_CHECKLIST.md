# Client Domain Setup Checklist - Wix Domain Deployment

This document lists all the information you need to collect from your client to deploy the Track My Startup application on their Wix-managed domain.

---

## 🌐 Domain Information (REQUIRED)

### Basic Domain Details
- [ ] **Full Domain Name** (e.g., `example.com` or `app.example.com`)
  - Will this be on the root domain or a subdomain? (e.g., `app.clientdomain.com`)
  - If subdomain, what subdomain name? (common: `app`, `portal`, `dashboard`, `platform`)

- [ ] **Domain Registrar** 
  - Confirm it's managed through Wix
  - Get Wix account access or DNS management access

- [ ] **SSL Certificate Preference**
  - Will you use Vercel's automatic SSL or client's existing certificate?
  - (Vercel provides free SSL automatically)

---

## 🔧 DNS Configuration Access (REQUIRED)

Since the domain is on Wix, you have two options:

### Option 1: DNS Management Access (Recommended)
- [ ] **Wix Account Access** (if possible)
  - Admin login credentials for Wix account
  - OR request client to add you as a collaborator/team member

- [ ] **DNS Management Access**
  - Access to Wix DNS settings
  - Ability to add/modify DNS records (A, CNAME, TXT records)

### Option 2: Client Adds DNS Records (Alternative)
If you can't get direct access, provide client with DNS records to add:
- [ ] **A Record** or **CNAME Record** for domain pointing to Vercel
- [ ] **TXT Record** for domain verification (if needed)

**Vercel DNS Records Needed:**
```
Type: A or CNAME
Name: @ (for root) or subdomain name
Value: [Vercel will provide after domain is added]
```

---

## 🔐 Supabase Configuration (REQUIRED)

### Current Supabase Setup
You'll need to update Supabase redirect URLs. Collect:

- [ ] **Supabase Project URL**
  - Current: `https://dlesebbmlrewsbmqvuza.supabase.co`
  - Confirm if using existing project or creating new one

- [ ] **Supabase Anon Key**
  - Current key (if using existing project)
  - OR create new Supabase project for client

- [ ] **Supabase Dashboard Access**
  - Login credentials or access to update redirect URLs
  - Need to add new domain to allowed redirect URLs

**Supabase Redirect URLs to Add:**
```
https://[client-domain]/complete-registration
https://[client-domain]/reset-password
https://[client-domain]/auth/callback
```

---

## 💳 Payment Gateway Configuration (If Using Client's Account)

### Razorpay Setup (If Applicable)
- [ ] **Razorpay Account Type**
  - Using existing Razorpay account or creating new?
  - Test mode or Production mode?

- [ ] **Razorpay Keys** (if using client's account)
  - `VITE_RAZORPAY_KEY_ID` (Public Key ID)
  - `RAZORPAY_KEY_SECRET` (Secret Key - server-side only)
  - `VITE_RAZORPAY_ENVIRONMENT` (test/production)

- [ ] **Razorpay Webhook URL**
  - Will be: `https://[client-domain]/api/razorpay/verify`
  - Client needs to add this in Razorpay dashboard

---

## 📧 Email Configuration (Optional but Recommended)

### Email Service Provider
- [ ] **Email Provider** (if using custom SMTP)
  - Gmail, SendGrid, Mailgun, AWS SES, etc.
  - OR use Supabase's built-in email (recommended)

- [ ] **SMTP Credentials** (if not using Supabase email)
  - SMTP Host
  - SMTP Port (usually 587 or 465)
  - SMTP Username
  - SMTP Password
  - From Email Address

**Note:** Supabase handles authentication emails by default, but you may need custom email for notifications.

---

## 🚀 Hosting Platform Configuration

### Vercel Deployment
- [ ] **Vercel Account**
  - Will you deploy to your Vercel account or client's?
  - If client's account, get Vercel team access

- [ ] **Git Repository Access**
  - GitHub/GitLab/Bitbucket repository
  - Access to push code and deploy

- [ ] **Environment Variables Setup**
  - Access to add environment variables in Vercel dashboard

---

## 🔑 Environment Variables Checklist

Collect or confirm these values:

### Required Environment Variables

```bash
# Domain Configuration
VITE_SITE_URL=https://[client-domain]
VITE_EMAIL_REDIRECT_URL=https://[client-domain]/complete-registration
VITE_PASSWORD_RESET_URL=https://[client-domain]/reset-password

# Supabase Configuration
VITE_SUPABASE_URL=https://[supabase-project].supabase.co
VITE_SUPABASE_ANON_KEY=[supabase-anon-key]

# Razorpay Configuration (if applicable)
VITE_RAZORPAY_KEY_ID=[razorpay-key-id]
VITE_RAZORPAY_ENVIRONMENT=[test|production]
RAZORPAY_KEY_SECRET=[razorpay-secret-key] # Server-side only

# Optional: AI Features
GEMINI_API_KEY=[if using AI document verification]
```

---

## 📋 Additional Information Needed

### Business Information
- [ ] **Company Name** (for branding/emails)
- [ ] **Support Email** (for contact/support)
- [ ] **Admin Email** (for initial admin account)
- [ ] **Company Logo** (if custom branding needed)

### Customization Preferences
- [ ] **Color Scheme/Branding** (if customizing UI)
- [ ] **Favicon** (if custom favicon needed)
- [ ] **Meta Tags** (for SEO - title, description)

### Legal/Compliance
- [ ] **Privacy Policy URL** (if hosted elsewhere)
- [ ] **Terms & Conditions URL** (if hosted elsewhere)
- [ ] **Cookie Policy** (if required)

---

## 🛠️ Technical Setup Steps (For You)

Once you have the information above, you'll need to:

### 1. Update Environment Configuration
**File:** `config/environment.ts`

```typescript
production: {
  siteUrl: 'https://[client-domain]',
  emailRedirectUrl: 'https://[client-domain]/complete-registration',
  passwordResetUrl: 'https://[client-domain]/reset-password',
  supabaseUrl: '[supabase-url]',
  supabaseAnonKey: '[supabase-key]'
}
```

### 2. Update Domain Detection Logic
**File:** `config/environment.ts`

Update the `getCurrentEnvironment()` function:
```typescript
if (host.endsWith('[client-domain]')) return 'production';
```

**File:** `lib/supabase.ts`

Update the production domain check:
```typescript
if (typeof window !== 'undefined' && window.location.host.endsWith('[client-domain]')) {
  // Suppress logs in production
}
```

### 3. Configure Supabase Redirect URLs
In Supabase Dashboard:
1. Go to Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://[client-domain]/complete-registration`
   - `https://[client-domain]/reset-password`
   - `https://[client-domain]/auth/callback`
3. Add to "Site URL": `https://[client-domain]`

### 4. Configure DNS in Wix
**Option A: Point to Vercel (Recommended)**
1. In Wix Dashboard → Domains → DNS Settings
2. Add CNAME record:
   - Name: `@` (root) or subdomain name
   - Value: `cname.vercel-dns.com` (Vercel will provide exact value)
3. OR add A record if Vercel provides IP addresses

**Option B: Use Wix Subdomain**
If client wants to use a subdomain like `app.clientdomain.com`:
1. Add subdomain in Wix
2. Point subdomain to Vercel using CNAME

### 5. Add Domain in Vercel
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add the client's domain
3. Vercel will provide DNS records to add
4. Wait for DNS propagation (can take up to 48 hours, usually < 1 hour)

### 6. Set Environment Variables in Vercel
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all required environment variables
3. Make sure to set them for "Production" environment

### 7. Configure Razorpay Webhooks (if applicable)
1. In Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://[client-domain]/api/razorpay/verify`
3. Select events: `payment.captured`, `subscription.charged`, etc.

---

## ⚠️ Important Notes for Wix Domains

### Wix DNS Limitations
- Wix may have limitations on DNS record types
- Some advanced DNS features might not be available
- May need to transfer DNS management to another provider (Cloudflare, etc.) if Wix is too restrictive

### Alternative: DNS Transfer
If Wix DNS is too limited:
- [ ] **Transfer DNS to Cloudflare** (free, recommended)
- [ ] **Transfer DNS to Namecheap/GoDaddy** (if client prefers)
- [ ] **Keep domain in Wix, manage DNS elsewhere**

### Subdomain vs Root Domain
- **Subdomain** (e.g., `app.clientdomain.com`): Easier to set up, doesn't affect main website
- **Root Domain** (e.g., `clientdomain.com`): More complex, may conflict with existing Wix site

**Recommendation:** Use a subdomain if the client already has a Wix website on the root domain.

---

## ✅ Pre-Deployment Checklist

Before going live, verify:

- [ ] Domain DNS records are properly configured
- [ ] SSL certificate is active (Vercel provides automatically)
- [ ] Supabase redirect URLs are configured
- [ ] Environment variables are set in Vercel
- [ ] Razorpay webhooks are configured (if applicable)
- [ ] Test email registration flow
- [ ] Test password reset flow
- [ ] Test payment flow (if applicable)
- [ ] Test all authentication flows
- [ ] Verify domain detection logic works
- [ ] Check that production environment is detected correctly

---

## 📞 Support Contacts

Keep these handy:
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Wix Support:** https://support.wix.com/
- **Razorpay Support:** https://razorpay.com/support/

---

## 📝 Quick Reference: Information Summary Template

Copy this template and fill it out with client information:

```
CLIENT DOMAIN SETUP INFORMATION
================================

Domain Details:
- Domain: _______________________
- Subdomain: ____________________
- Full URL: https://_______________________

DNS Access:
- Wix Account Access: ☐ Yes ☐ No
- DNS Management Access: ☐ Yes ☐ No
- Alternative: Client will add DNS records

Supabase:
- Using Existing Project: ☐ Yes ☐ No
- Project URL: _______________________
- Anon Key: _______________________
- Dashboard Access: ☐ Yes ☐ No

Payment Gateway:
- Using Razorpay: ☐ Yes ☐ No
- Account Type: ☐ Test ☐ Production
- Key ID: _______________________
- Key Secret: _______________________

Email:
- Provider: _______________________
- SMTP Details: ☐ Provided ☐ Using Supabase

Vercel:
- Account: ☐ Mine ☐ Client's
- Repository Access: ☐ Yes ☐ No

Additional:
- Admin Email: _______________________
- Support Email: _______________________
- Company Name: _______________________
```

---

*Last Updated: [Current Date]*
*For questions, refer to Vercel and Supabase documentation*

