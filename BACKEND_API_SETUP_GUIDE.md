# Backend API Setup Guide - Google Calendar Integration

## ✅ API Endpoints Created

I've created 4 API endpoints following your existing Vercel serverless function pattern:

1. ✅ `api/generate-google-meet-link.ts` - Generate Google Meet links
2. ✅ `api/create-google-calendar-event.ts` - Create calendar events with Meet links
3. ✅ `api/check-google-calendar-conflicts.ts` - Check for time conflicts
4. ✅ `api/refresh-google-token.ts` - Refresh OAuth tokens

---

## 📦 Step 1: Install Required Dependencies

You need to install the Google APIs client library:

```bash
npm install googleapis
```

Or if using yarn:

```bash
yarn add googleapis
```

---

## 🔑 Step 2: Set Up Google Cloud Project

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "Track My Startup" (or your preferred name)
4. Click "Create"

### 2.2 Enable Google Calendar API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it and click **"Enable"**

### 2.3 Create Service Account (For Meet Link Generation)

This is needed for generating Meet links without user OAuth:

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Name: `calendar-service` (or any name)
4. Click **"Create and Continue"**
5. Grant role: **"Editor"** (or "Calendar Admin" if available)
6. Click **"Done"**
7. Click on the created service account
8. Go to **"Keys"** tab
9. Click **"Add Key"** → **"Create new key"**
10. Choose **"JSON"**
11. **Download the key file** - this is important!
12. Save it securely (e.g., `google-service-account-key.json`)

### 2.4 Create OAuth 2.0 Credentials (For User Calendar Sync)

This is needed for users who want to sync their personal calendars:

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure OAuth consent screen first:
   - User Type: **External** (unless you have Google Workspace)
   - App name: **Track My Startup**
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"**
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
   - Click **"Save and Continue"**
   - Test users: Add your email (for testing)
   - Click **"Save and Continue"**
4. Application type: **"Web application"**
5. Name: **"Track My Startup Web Client"**
6. Authorized redirect URIs: 
   - For local: `http://localhost:3000/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`
7. Click **"Create"**
8. **Save the Client ID and Client Secret** - you'll need these!

---

## 🔐 Step 3: Set Environment Variables

Add these to your Vercel project environment variables (or `.env` file for local):

### Required for Meet Link Generation:
```env
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**OR** if you prefer to store the file path (not recommended for Vercel):
```env
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account-key.json
```

### Required for OAuth (User Calendar Sync):
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

### How to Set in Vercel:

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON content from the service account key file
   - **Environment:** Production, Preview, Development (select all)
4. Repeat for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`

### For Local Development:

Create a `.env.local` file in your project root:

```env
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**⚠️ Important:** Add `.env.local` to `.gitignore` to avoid committing secrets!

---

## 🧪 Step 4: Test the Endpoints

### 4.1 Test Generate Meet Link (No Auth Required)

```bash
curl -X POST http://localhost:3000/api/generate-google-meet-link \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx"
}
```

### 4.2 Test Other Endpoints (Require OAuth Token)

These require a valid `accessToken` from a user who has connected their Google Calendar.

---

## 📝 Step 5: Update Frontend Service (Optional)

The frontend service (`lib/googleCalendarService.ts`) is already set up to call these endpoints. No changes needed!

However, if your API routes are at a different path, update the fetch URLs in `lib/googleCalendarService.ts`:

```typescript
// Current (default):
const response = await fetch('/api/generate-google-meet-link', { ... });

// If your API is at a different path:
const response = await fetch('https://yourdomain.com/api/generate-google-meet-link', { ... });
```

---

## 🚀 Step 6: Deploy

### For Vercel:

1. **Commit and push your changes:**
   ```bash
   git add api/generate-google-meet-link.ts
   git add api/create-google-calendar-event.ts
   git add api/check-google-calendar-conflicts.ts
   git add api/refresh-google-token.ts
   git commit -m "Add Google Calendar API endpoints"
   git push
   ```

2. **Vercel will automatically deploy** (if auto-deploy is enabled)

3. **Set environment variables** in Vercel dashboard (as described in Step 3)

### For Other Platforms:

- **Netlify Functions:** Similar structure, may need slight adjustments
- **AWS Lambda:** Need to adapt to Lambda handler format
- **Express Server:** Can use the same logic in Express routes

---

## ✅ Verification Checklist

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] Service account created and key downloaded
- [ ] OAuth 2.0 credentials created
- [ ] Environment variables set in Vercel/local
- [ ] `googleapis` package installed
- [ ] API endpoints deployed
- [ ] Test `/api/generate-google-meet-link` works

---

## 🐛 Troubleshooting

### Error: "Google service account not configured"
- **Solution:** Make sure `GOOGLE_SERVICE_ACCOUNT_KEY` is set in environment variables
- **Check:** The value should be the entire JSON object as a string

### Error: "Invalid service account key format"
- **Solution:** The key must be valid JSON. If using file path, make sure the file exists
- **For Vercel:** Use the JSON string directly, not a file path

### Error: "Invalid or expired access token"
- **Solution:** User needs to reconnect their Google Calendar
- **Check:** The refresh token endpoint should handle this

### Error: "Insufficient permissions"
- **Solution:** Make sure the service account has "Editor" role or Calendar permissions
- **Check:** OAuth consent screen has Calendar scope enabled

### Meet link not generated
- **Check:** Service account has Calendar API enabled
- **Check:** The temporary event creation is working
- **Solution:** Check Google Cloud Console logs for detailed errors

---

## 📚 Next Steps

Once the API endpoints are working:

1. ✅ Test the complete flow:
   - Startup sends request
   - Mentor accepts
   - Schedule session
   - Meet link is generated

2. ⏳ Set up OAuth flow for users (optional):
   - Add "Connect Google Calendar" button
   - Handle OAuth callback
   - Store tokens in database

3. ⏳ Add email notifications (optional):
   - Session booked notification
   - Session reminder notifications

---

## 🎯 Summary

**What's Done:**
- ✅ 4 API endpoints created
- ✅ Following your existing Vercel pattern
- ✅ Ready to deploy

**What You Need to Do:**
1. Install `googleapis` package
2. Set up Google Cloud project
3. Create service account and OAuth credentials
4. Set environment variables
5. Deploy

**Time Estimate:** 30-60 minutes

---

**All API endpoints are ready! Just follow the setup steps above.** 🚀

