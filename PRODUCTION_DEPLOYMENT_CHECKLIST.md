# 🚀 Production Deployment Checklist - Invite System

## ✅ Pre-Deployment Checklist

### 1. Code Changes Summary
- ✅ Investment Advisor invite system implemented
- ✅ Auto-linking for invited startups
- ✅ Password setup flow for invite links
- ✅ Advisor code pre-fill and lock in Form 2
- ✅ Duplicate detection and permission requests
- ✅ Error handling for expired invite links

### 2. Files Modified
- `App.tsx` - Invite link detection and routing
- `components/CompleteRegistrationPage.tsx` - Advisor code handling
- `components/ResetPasswordPage.tsx` - Invite link password setup
- `components/InvestmentAdvisorView.tsx` - Invite button and UI
- `lib/advisorAddedStartupService.ts` - Invite API calls
- `server.js` - Invite endpoint for local dev
- `api/invite-startup-advisor.ts` - Vercel API route for invites
- `lib/advisorStartupLinkRequestService.ts` - Permission request system

### 3. New Files Added
- `api/invite-startup-advisor.ts` - Production API route
- `lib/advisorStartupLinkRequestService.ts` - Link request service
- `CREATE_ADVISOR_STARTUP_LINK_REQUESTS_TABLE.sql` - Database table

---

## 🔧 Production Configuration Required

### Step 1: Supabase Dashboard Configuration

**Go to:** https://supabase.com/dashboard → Your Project → Authentication → URL Configuration

**Add to Redirect URLs:**
```
https://trackmystartup.com/?page=complete-registration
https://trackmystartup.com/?page=complete-registration&advisorCode=*
https://trackmystartup.com/?page=reset-password
https://trackmystartup.com/?page=*
https://trackmystartup.com/*
```

**Update Site URL:**
```
https://trackmystartup.com
```

**Important:** These URLs must be added BEFORE deploying, otherwise invite links won't work!

---

### Step 2: Vercel Environment Variables

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add/Update for Production:**
```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://dlesebbmlrewsbmqvuza.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://dlesebbmlrewsbmqvuza.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Site URLs (Required)
VITE_SITE_URL=https://trackmystartup.com
SITE_URL=https://trackmystartup.com

# Other existing variables...
```

**⚠️ CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` must be set for the invite API to work!

---

### Step 3: Database Migration

**Run this SQL in Supabase SQL Editor:**
```sql
-- File: CREATE_ADVISOR_STARTUP_LINK_REQUESTS_TABLE.sql
-- This creates the table for permission requests
```

**Verify table exists:**
```sql
SELECT * FROM advisor_startup_link_requests LIMIT 1;
```

---

## 📦 Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "feat: Implement Investment Advisor invite system with auto-linking"
```

### 2. Push to Repository
```bash
git push origin main
```

### 3. Vercel Auto-Deploy
- Vercel will automatically detect the push
- Build will start automatically
- Monitor the deployment in Vercel dashboard

### 4. Verify Deployment
- Check Vercel deployment logs for errors
- Test the production URL: https://trackmystartup.com
- Verify Supabase redirect URLs are configured

---

## 🧪 Post-Deployment Testing

### Test 1: Send Invite
1. Login as Investment Advisor
2. Go to "My Network" → "My Startups"
3. Add a startup
4. Click "Invite to TMS"
5. ✅ Should see success message

### Test 2: Check Email
1. Check email inbox (including spam)
2. ✅ Should receive invite email
3. ✅ Link should point to production domain

### Test 3: Click Invite Link
1. Click invite link in email
2. ✅ Should see password setup page
3. Set password
4. ✅ Should redirect to Form 2
5. ✅ Advisor code should be pre-filled and locked

### Test 4: Complete Registration
1. Fill Form 2
2. Submit
3. ✅ Startup should appear in "My Startups" automatically
4. ✅ No approval needed

---

## 🐛 Troubleshooting

### Issue: Invite links redirect to wrong page
**Solution:** Check Supabase redirect URLs are configured correctly

### Issue: "Failed to send invite" error
**Solution:** Check `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel

### Issue: Password setup page doesn't appear
**Solution:** Check `type=invite` is in URL, verify ResetPasswordPage handles invites

### Issue: Advisor code not locked in Form 2
**Solution:** Check user metadata has `source: 'advisor_invite'`

---

## 📝 Notes

- Invite links expire after 24-48 hours (Supabase default)
- Always test with fresh invite links
- Monitor Supabase logs for authentication errors
- Check Vercel function logs for API route errors

---

## ✅ Ready to Deploy?

1. ✅ Supabase redirect URLs configured
2. ✅ Vercel environment variables set
3. ✅ Database migration run
4. ✅ Code committed and ready
5. ✅ Tested locally

**Then proceed with deployment!**

