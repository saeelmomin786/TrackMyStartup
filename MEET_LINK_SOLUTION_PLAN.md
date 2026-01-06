# Google Meet Link Solution - Complete Plan

## 🎯 Requirements

1. ✅ Generate Google Meet links for all sessions
2. ✅ Show Meet links on dashboard (for all users)
3. ✅ Works even if users don't have Google accounts
4. ✅ Create calendar events on "our" account (app's calendar)
5. ✅ Add both mentor and startup emails as guests/attendees

---

## 💡 Solution: Use Real Google Account (Not Service Account)

**The Problem:** Service accounts cannot create Google Meet links.

**The Solution:** Use a **real Google account** (Gmail or Google Workspace) for the app, and use OAuth to authenticate as that account.

---

## 🔧 Implementation Plan

### Step 1: Create App Google Account

1. **Create a Gmail account for your app:**
   - Example: `trackmystartup.app@gmail.com`
   - Or use Google Workspace if you have it
   - This will be the "owner" of all calendar events

2. **Why this works:**
   - Real Google accounts CAN create Meet links
   - Can create events in their calendar
   - Can add attendees (mentor/startup emails)
   - Meet links are automatically generated

---

### Step 2: Set Up OAuth for App Account

1. **In Google Cloud Console:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Use existing OAuth 2.0 Client ID (you already have "TMS")
   - Or create a new one for the app account

2. **Get OAuth Credentials:**
   - Client ID
   - Client Secret
   - Already set in Vercel (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

---

### Step 3: Authenticate App Account Once

1. **Get Refresh Token for App Account:**
   - Use OAuth flow to authenticate as the app account
   - Get access token and refresh token
   - Store refresh token securely (in Vercel environment variables)

2. **Store in Vercel:**
   - `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` - Refresh token for app account
   - `GOOGLE_APP_ACCOUNT_EMAIL` - Email of app account (e.g., trackmystartup.app@gmail.com)

---

### Step 4: Update API to Use App Account

**Instead of service account, use OAuth with app account:**

1. **Create new endpoint or update existing:**
   - Use OAuth to get access token (from refresh token)
   - Create events in app account's calendar
   - Add attendees (mentor + startup emails)
   - Google automatically generates Meet links!

2. **Benefits:**
   - ✅ Meet links are generated automatically
   - ✅ Events in "our" calendar (app account)
   - ✅ Both users added as attendees
   - ✅ Works even if users don't have Google accounts (they get email invites)

---

## 📝 Code Changes Needed

### 1. Create Function to Get App Account Access Token

```typescript
// In api/google-calendar.ts or new file
async function getAppAccountAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_APP_ACCOUNT_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use refresh token to get new access token
  // Return access token
}
```

### 2. Update create-event-service-account to Use App Account

```typescript
// Instead of service account, use OAuth with app account
const accessToken = await getAppAccountAccessToken();
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
oauth2Client.setCredentials({ access_token: accessToken });

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Create event in app account's calendar
const response = await calendar.events.insert({
  calendarId: 'primary', // App account's calendar
  conferenceDataVersion: 1, // This will generate Meet link!
  sendUpdates: 'all', // Send invites to attendees
  requestBody: {
    summary: 'Mentoring Session',
    start: { ... },
    end: { ... },
    attendees: [
      { email: mentorEmail },
      { email: startupEmail }
    ],
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  }
});

// Meet link will be in response!
const meetLink = response.data.hangoutLink || 
                 response.data.conferenceData?.entryPoints?.[0]?.uri;
```

---

## 🚀 Step-by-Step Setup

### Step 1: Create App Google Account

1. Go to: https://accounts.google.com/signup
2. Create account: `trackmystartup.app@gmail.com` (or your choice)
3. Verify email
4. **Important:** Keep this account secure - it will own all calendar events

---

### Step 2: Get OAuth Refresh Token

**Option A: Use OAuth Playground (Easiest)**

1. Go to: https://developers.google.com/oauthplayground/
2. Click gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter:
   - OAuth Client ID: (from Google Cloud Console)
   - OAuth Client Secret: (from Google Cloud Console)
4. In left panel, find "Calendar API v3"
5. Check: `https://www.googleapis.com/auth/calendar`
6. Click "Authorize APIs"
7. Sign in with your app account (trackmystartup.app@gmail.com)
8. Click "Exchange authorization code for tokens"
9. Copy the "Refresh token" - **This is what you need!**

**Option B: Use OAuth Flow in Your App**

- Create a one-time setup page
- Authenticate as app account
- Store refresh token

---

### Step 3: Add to Vercel Environment Variables

1. Go to Vercel → Settings → Environment Variables
2. Add:
   - `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` = (refresh token from step 2)
   - `GOOGLE_APP_ACCOUNT_EMAIL` = `trackmystartup.app@gmail.com`
3. Save and redeploy

---

### Step 4: Update Code

I'll update the API code to:
- Use app account OAuth instead of service account
- Create events in app account's calendar
- Generate Meet links automatically
- Add attendees (mentor + startup)

---

## ✅ What This Achieves

After implementation:

1. ✅ **Meet Links Generated:** Automatically for all sessions
2. ✅ **Shown on Dashboard:** Meet links appear for all users
3. ✅ **Works Without Google Accounts:** Users get email invites even without Google
4. ✅ **Events in Our Calendar:** All events in app account's calendar
5. ✅ **Both Users as Guests:** Mentor and startup added as attendees
6. ✅ **Email Invites Sent:** Both users receive calendar invites automatically

---

## 🎯 Next Steps

1. **Create app Google account** (if you haven't)
2. **Get OAuth refresh token** for that account
3. **Add to Vercel** environment variables
4. **I'll update the code** to use app account instead of service account
5. **Test** - Meet links should work!

---

## 📋 Checklist

- [ ] Create app Google account (trackmystartup.app@gmail.com)
- [ ] Get OAuth refresh token for app account
- [ ] Add refresh token to Vercel (GOOGLE_APP_ACCOUNT_REFRESH_TOKEN)
- [ ] Add app account email to Vercel (GOOGLE_APP_ACCOUNT_EMAIL)
- [ ] Update code to use app account OAuth
- [ ] Test Meet link generation
- [ ] Verify Meet links appear on dashboard
- [ ] Test with users who don't have Google accounts

---

## 🔒 Security Notes

- **Keep app account secure** - it owns all calendar events
- **Refresh token is sensitive** - store securely in Vercel
- **Don't commit tokens** to git
- **Use environment variables** only

---

## 💡 Alternative: Keep Service Account + Add OAuth

**Hybrid Approach:**
- Use service account for basic event creation (current)
- Use app account OAuth ONLY for Meet link generation
- Generate Meet link separately, then add to event description

**But the cleaner solution is:** Use app account OAuth for everything (events + Meet links).

---

Ready to implement? Let me know when you have:
1. App Google account created
2. OAuth refresh token obtained

Then I'll update the code!


