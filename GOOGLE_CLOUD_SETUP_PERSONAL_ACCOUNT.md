# Google Cloud Setup with Personal Google Account

## ✅ Yes, Personal Google Account Works!

You can absolutely use your personal Google account (Gmail account) to:
- Create Google Cloud projects
- Enable APIs
- Create Service Accounts
- Create OAuth 2.0 credentials
- Generate Google Meet links
- Access Google Calendar API

**No Google Workspace or business account needed!**

---

## 🚀 Step-by-Step Setup (Using Personal Gmail Account)

### Step 1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. **Sign in with your personal Gmail account** (e.g., yourname@gmail.com)
3. If this is your first time:
   - You'll see a welcome screen
   - Accept the terms of service
   - You may need to provide a credit card (but won't be charged for free tier usage)

### Step 2: Create a New Project

1. Click the project dropdown at the top (shows "Select a project")
2. Click **"New Project"**
3. Fill in:
   - **Project name:** `Track My Startup` (or any name you like)
   - **Organization:** Leave as default (or select if you have one)
   - **Location:** Leave as default
4. Click **"Create"**
5. Wait a few seconds for the project to be created
6. Select your new project from the dropdown

### Step 3: Enable Google Calendar API

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on **"Google Calendar API"**
4. Click the **"Enable"** button
5. Wait for it to enable (takes a few seconds)

### Step 4: Create Service Account (For Meet Links)

This allows generating Meet links without user OAuth:

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"Service account"**
4. Fill in:
   - **Service account name:** `calendar-meet-generator` (or any name)
   - **Service account ID:** Auto-filled (you can change it)
   - **Description:** "Generate Google Meet links for mentoring sessions"
5. Click **"CREATE AND CONTINUE"**
6. **Grant role:** Select **"Editor"** (or "Calendar Admin" if available)
   - This gives the service account permission to create calendar events
7. Click **"CONTINUE"**
8. Click **"DONE"** (you can skip the optional steps)

**Now create the key:**
1. Click on the service account you just created
2. Go to the **"Keys"** tab
3. Click **"ADD KEY"** → **"Create new key"**
4. Select **"JSON"**
5. Click **"CREATE"**
6. **A JSON file will download automatically** - this is your service account key!
7. **Save this file securely** - you'll need it for the environment variable

### Step 5: Create OAuth 2.0 Credentials (For User Calendar Sync)

This is for users who want to sync their personal calendars (optional but recommended):

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**

**If you see "Configure consent screen" first:**
1. Click **"CONFIGURE CONSENT SCREEN"**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"CREATE"**
4. Fill in:
   - **App name:** `Track My Startup`
   - **User support email:** Your Gmail address
   - **Developer contact information:** Your Gmail address
5. Click **"SAVE AND CONTINUE"**
6. **Scopes:** Click **"ADD OR REMOVE SCOPES"**
   - Search for "calendar"
   - Check: `https://www.googleapis.com/auth/calendar`
   - Click **"UPDATE"**
7. Click **"SAVE AND CONTINUE"**
8. **Test users:** Add your Gmail address (for testing)
   - Click **"ADD USERS"**
   - Enter your email
   - Click **"ADD"**
9. Click **"SAVE AND CONTINUE"**
10. Review and click **"BACK TO DASHBOARD"**

**Now create OAuth client:**
1. Go back to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. **Application type:** Select **"Web application"**
4. **Name:** `Track My Startup Web Client`
5. **Authorized redirect URIs:**
   - For local development: `http://localhost:3000/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`
   - Click **"ADD URI"** for each
6. Click **"CREATE"**
7. **A popup will show:**
   - **Your Client ID:** Copy this (looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Your Client Secret:** Copy this (looks like: `GOCSPX-...`)
   - **Save both!** You'll need them for environment variables

---

## 🔐 Step 6: Set Environment Variables

### For Local Development (.env.local):

```env
# Service Account Key (paste the entire JSON content from the downloaded file)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"calendar-meet-generator@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# OAuth Credentials
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Important:** 
- The `GOOGLE_SERVICE_ACCOUNT_KEY` should be the **entire JSON as a single line string**
- Or you can format it nicely and the code will parse it

### For Vercel:

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON from the service account key file
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Save"**
4. Repeat for:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

---

## ✅ Verification

### Test 1: Check API is Enabled

1. Go to **"APIs & Services"** → **"Library"**
2. Search for "Calendar API"
3. Should show **"API enabled"** with a checkmark

### Test 2: Test Meet Link Generation

Once you've set environment variables and deployed:

```bash
curl -X POST http://localhost:3000/api/generate-google-meet-link \
  -H "Content-Type: application/json"
```

Should return:
```json
{
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx"
}
```

---

## 💰 Cost Information

**Good News:** For your use case, this should be **FREE**!

- **Google Calendar API:** Free tier includes generous quotas
- **Google Meet links:** Free to generate
- **Service Account:** Free
- **OAuth:** Free

**Free Tier Limits:**
- 1,000,000 requests per day (Calendar API)
- More than enough for a startup platform

**You only pay if:**
- You exceed the free tier (very unlikely)
- You use other paid Google Cloud services

**Note:** Google may ask for a credit card during setup, but you won't be charged for Calendar API usage within free tier limits.

---

## 🔒 Security Best Practices

1. **Never commit credentials to Git:**
   - Add `.env.local` to `.gitignore`
   - Never commit the service account JSON file

2. **Use environment variables:**
   - Store credentials in Vercel environment variables
   - Don't hardcode in your code

3. **Restrict service account permissions:**
   - Only grant "Editor" role (not "Owner")
   - Consider creating a custom role with minimal permissions

4. **Rotate credentials periodically:**
   - Regenerate service account keys every 6-12 months
   - Update OAuth secrets if compromised

---

## 🐛 Common Issues

### Issue: "API not enabled"
**Solution:** Make sure you enabled "Google Calendar API" in Step 3

### Issue: "Invalid service account key"
**Solution:** 
- Make sure you copied the entire JSON
- Check for any line breaks or formatting issues
- Try pasting the JSON into a JSON validator

### Issue: "Insufficient permissions"
**Solution:**
- Make sure service account has "Editor" role
- Check that Calendar API is enabled

### Issue: "OAuth consent screen not configured"
**Solution:**
- Complete the OAuth consent screen setup (Step 5)
- Make sure you added yourself as a test user

---

## ✅ Checklist

- [ ] Created Google Cloud project with personal Gmail account
- [ ] Enabled Google Calendar API
- [ ] Created service account and downloaded JSON key
- [ ] Created OAuth 2.0 credentials
- [ ] Configured OAuth consent screen
- [ ] Set environment variables in Vercel/local
- [ ] Tested Meet link generation endpoint

---

## 🎯 Summary

**Yes, your personal Google account works perfectly!**

- ✅ No business account needed
- ✅ No Google Workspace needed
- ✅ Free to use (within limits)
- ✅ Same functionality as business accounts
- ✅ Easy to set up

**Time to complete:** 15-20 minutes

**Ready to start?** Follow the steps above! 🚀

