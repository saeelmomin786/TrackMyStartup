# Setup App Google Account for Meet Links - Step by Step

## 🎯 Goal

Set up a real Google account for your app that will:
- ✅ Create calendar events in "our" calendar
- ✅ Generate Google Meet links automatically
- ✅ Add mentor and startup as attendees
- ✅ Send email invites to both users
- ✅ Work even if users don't have Google accounts

---

## 📋 Step 1: Create App Google Account

1. **Go to:** https://accounts.google.com/signup
2. **Create account:**
   - Email: `trackmystartup.app@gmail.com` (or your choice)
   - Password: (use a strong password)
   - Verify email
3. **Important:** Keep this account secure - it will own all calendar events

---

## 📋 Step 2: Get OAuth Refresh Token

### ⚠️ IMPORTANT: Setup Steps Before OAuth Playground

**Before using OAuth Playground, you must do TWO things:**

#### 1. Add OAuth Playground Redirect URI

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Click edit (✏️)** on your OAuth client (e.g., "TMS")
3. **Scroll to "Authorized redirect URIs"**
4. **Click "ADD URI"**
5. **Add:** `https://developers.google.com/oauthplayground`
6. **Click "SAVE"**

#### 2. Add Test Users to OAuth Consent Screen

1. **Go to:** https://console.cloud.google.com/apis/credentials/consent
2. **Scroll to "Test users" section**
3. **Click "ADD USERS"**
4. **Add your email:** `saeelmomin.tms@gmail.com` (or the email you'll use)
5. **Add app account email:** `trackmystartup.app@gmail.com` (if different)
6. **Click "ADD"** for each, then **"SAVE"**

**Now you can use OAuth Playground!**

---

### Option A: Using OAuth Playground (Easiest)

1. **Go to:** https://developers.google.com/oauthplayground/

2. **Configure OAuth Playground:**
   - Click the **gear icon (⚙️)** in top right
   - Check **"Use your own OAuth credentials"**
   - Enter:
     - **OAuth Client ID:** (from Google Cloud Console - your "TMS" client ID)
     - **OAuth Client Secret:** (from Google Cloud Console - your "TMS" client secret)
   - Click **"Close"**

3. **Authorize Calendar API:**
   - In left panel, scroll to **"Calendar API v3"**
   - Check: `https://www.googleapis.com/auth/calendar`
   - Click **"Authorize APIs"** button

4. **Sign in:**
   - Sign in with your **app account** (`trackmystartup.app@gmail.com`)
   - Click **"Allow"** to grant permissions

5. **Get Refresh Token:**
   - Click **"Exchange authorization code for tokens"** button
   - You'll see tokens in the right panel
   - **Copy the "Refresh token"** - this is what you need!

---

### Option B: Using Your App's OAuth Flow

1. **Temporarily modify OAuth redirect:**
   - Add a page that shows the refresh token after OAuth
   - Sign in with app account
   - Copy the refresh token

---

## 📋 Step 3: Add to Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Add New Variables:**

   **Variable 1:**
   - **Name:** `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`
   - **Value:** (paste the refresh token from Step 2)
   - **Environment:** All (Production, Preview, Development)
   - Click **"Save"**

   **Variable 2:**
   - **Name:** `GOOGLE_APP_ACCOUNT_EMAIL`
   - **Value:** `trackmystartup.app@gmail.com` (your app account email)
   - **Environment:** All
   - Click **"Save"**

3. **Verify Existing Variables:**
   - `GOOGLE_CLIENT_ID` - Should already be set
   - `GOOGLE_CLIENT_SECRET` - Should already be set
   - `GOOGLE_REDIRECT_URI` - Should already be set

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**
   - Wait 2-3 minutes

---

## 📋 Step 4: Test the Setup

After redeployment, test:

```powershell
$now = (Get-Date).ToUniversalTime()
$later = $now.AddHours(1)
$data = @{event=@{summary="Test with Meet Link";start=@{dateTime=$now.ToString("yyyy-MM-ddTHH:mm:ssZ");timeZone="UTC"};end=@{dateTime=$later.ToString("yyyy-MM-ddTHH:mm:ssZ");timeZone="UTC"};attendees=@()}} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=create-event-service-account" -Method Post -ContentType "application/json" -Body $data
```

**Expected Result:**
```json
{
  "eventId": "event_id_here",
  "hangoutLink": "https://meet.google.com/xxx-xxxx-xxx",
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx",
  "calendarId": "primary",
  "method": "app_account_oauth"
}
```

**✅ Success Indicators:**
- `meetLink` is NOT null
- `meetLink` starts with `https://meet.google.com/`
- `method` shows `"app_account_oauth"`

---

## ✅ What This Achieves

After setup:

1. ✅ **Meet Links Generated:** Automatically for all sessions
2. ✅ **Shown on Dashboard:** Meet links appear for all users
3. ✅ **Events in Our Calendar:** All events in app account's calendar
4. ✅ **Both Users as Attendees:** Mentor and startup added automatically
5. ✅ **Email Invites Sent:** Both users receive calendar invites
6. ✅ **Works Without Google Accounts:** Users get email invites even without Google

---

## 🔍 Verify Setup

### Check 1: Environment Variables
- [ ] `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` is set
- [ ] `GOOGLE_APP_ACCOUNT_EMAIL` is set
- [ ] `GOOGLE_CLIENT_ID` is set
- [ ] `GOOGLE_CLIENT_SECRET` is set

### Check 2: Test API
- [ ] API returns `meetLink` (not null)
- [ ] Meet link format is correct
- [ ] Event is created successfully

### Check 3: Check Calendar
- [ ] Go to: https://calendar.google.com/
- [ ] Sign in with app account (`trackmystartup.app@gmail.com`)
- [ ] Verify test event appears
- [ ] Verify event has Meet link

---

## 🐛 Troubleshooting

### Error: "GOOGLE_APP_ACCOUNT_REFRESH_TOKEN not configured"

**Solution:**
- Check environment variable is set in Vercel
- Verify variable name is exactly: `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`
- Redeploy after adding variable

---

### Error: "Failed to get access token from refresh token"

**Possible causes:**
1. Refresh token is invalid/expired
2. OAuth client ID/secret don't match
3. App account doesn't have permission

**Solution:**
1. Get a new refresh token (repeat Step 2)
2. Verify OAuth credentials match
3. Make sure you signed in with app account

---

### Meet link is still null

**Check:**
1. Is `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` set?
2. Did you redeploy after adding it?
3. Check Vercel logs for errors
4. Verify refresh token is correct

---

## 📝 Quick Checklist

- [ ] Created app Google account
- [ ] Got OAuth refresh token for app account
- [ ] Added `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` to Vercel
- [ ] Added `GOOGLE_APP_ACCOUNT_EMAIL` to Vercel
- [ ] Redeployed application
- [ ] Tested API - Meet link is generated
- [ ] Verified event appears in app account's calendar
- [ ] Verified Meet link works when clicked

---

## 🎉 After Setup

Once this is working:
- ✅ All new sessions will have Meet links
- ✅ Meet links appear on dashboard
- ✅ Both users get calendar invites
- ✅ Works for all users (with or without Google accounts)

---

## 🔒 Security Notes

- **Keep app account secure** - it owns all calendar events
- **Refresh token is sensitive** - never commit to git
- **Use environment variables** only
- **Don't share** the refresh token

---

Ready to set up? Follow the steps above and let me know when you have the refresh token!


