# Next Steps - Mentor-Startup Connection Flow

## ✅ Completed Steps

1. ✅ **Database Schema** - All SQL files executed
2. ✅ **Service Layer** - All services created
3. ✅ **UI Components** - All components created
4. ✅ **Integration** - Components integrated into dashboards
5. ✅ **Syntax Errors** - All fixed

---

## 🎯 Next Steps (In Order)

### Step 1: Create Backend API Endpoints (REQUIRED)

The Google Calendar service needs backend API endpoints. You need to create these in your backend:

#### 1.1 Generate Google Meet Link Endpoint

**Route:** `POST /api/generate-google-meet-link`

**Purpose:** Generate a Google Meet link using your Google API credentials

**Implementation:**
```javascript
// Example (Node.js/Express)
app.post('/api/generate-google-meet-link', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const calendar = google.calendar('v3');
    
    // Use service account or OAuth credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: 'path/to/service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    // Create a temporary event to generate Meet link
    const event = {
      summary: 'Mentoring Session',
      start: {
        dateTime: new Date().toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(Date.now() + 3600000).toISOString(),
        timeZone: 'UTC'
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    const response = await calendar.events.insert({
      auth: auth,
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: event
    });
    
    const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;
    
    // Delete the temporary event
    await calendar.events.delete({
      auth: auth,
      calendarId: 'primary',
      eventId: response.data.id
    });
    
    res.json({ meetLink });
  } catch (error) {
    console.error('Error generating Meet link:', error);
    res.status(500).json({ error: 'Failed to generate Meet link' });
  }
});
```

#### 1.2 Create Google Calendar Event Endpoint

**Route:** `POST /api/create-google-calendar-event`

**Purpose:** Create a calendar event with Google Meet link

**Request Body:**
```json
{
  "accessToken": "user_oauth_token",
  "calendarId": "primary",
  "event": {
    "summary": "Mentoring Session",
    "description": "Session with startup",
    "start": {
      "dateTime": "2024-01-15T10:00:00Z",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "2024-01-15T11:00:00Z",
      "timeZone": "UTC"
    },
    "attendees": [
      { "email": "startup@example.com" }
    ],
    "conferenceData": {
      "createRequest": {
        "requestId": "meet-123456",
        "conferenceSolutionKey": { "type": "hangoutsMeet" }
      }
    }
  }
}
```

**Response:**
```json
{
  "eventId": "event_id_123",
  "hangoutLink": "https://meet.google.com/xxx-xxxx-xxx"
}
```

**Implementation:**
```javascript
app.post('/api/create-google-calendar-event', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const { accessToken, calendarId, event } = req.body;
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      conferenceDataVersion: 1,
      resource: event
    });
    
    res.json({
      eventId: response.data.id,
      hangoutLink: response.data.hangoutLink || 
                   response.data.conferenceData?.entryPoints?.[0]?.uri
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});
```

#### 1.3 Check Calendar Conflicts Endpoint

**Route:** `POST /api/check-google-calendar-conflicts`

**Purpose:** Check if a time slot has conflicts

**Request Body:**
```json
{
  "accessToken": "user_oauth_token",
  "calendarId": "primary",
  "startDateTime": "2024-01-15T10:00:00Z",
  "endDateTime": "2024-01-15T11:00:00Z"
}
```

**Response:**
```json
{
  "hasConflicts": false
}
```

**Implementation:**
```javascript
app.post('/api/check-google-calendar-conflicts', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const { accessToken, calendarId, startDateTime, endDateTime } = req.body;
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: startDateTime,
      timeMax: endDateTime,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const hasConflicts = response.data.items && response.data.items.length > 0;
    
    res.json({ hasConflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});
```

#### 1.4 Refresh Google Token Endpoint

**Route:** `POST /api/refresh-google-token`

**Purpose:** Refresh expired OAuth access token

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "accessToken": "new_access_token",
  "expiresIn": 3600
}
```

**Implementation:**
```javascript
app.post('/api/refresh-google-token', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const { refreshToken } = req.body;
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    res.json({
      accessToken: credentials.access_token,
      expiresIn: credentials.expiry_date
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});
```

---

### Step 2: Set Up Google Cloud Project (REQUIRED for API endpoints)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/

2. **Create a New Project:**
   - Click "Select a project" → "New Project"
   - Name: "Track My Startup"
   - Click "Create"

3. **Enable Google Calendar API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. **Create Service Account (for Meet link generation):**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name: "calendar-service"
   - Click "Create and Continue"
   - Grant "Editor" role
   - Click "Done"
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - Download the key file
   - Save it securely (don't commit to git!)

5. **Create OAuth 2.0 Credentials (for user calendar sync):**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Track My Startup Web Client"
   - Authorized redirect URIs: Add your app URL + `/auth/google/callback`
   - Click "Create"
   - Save Client ID and Client Secret

6. **Set Environment Variables:**
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   GOOGLE_SERVICE_ACCOUNT_KEY=path/to/service-account-key.json
   ```

---

### Step 3: Update Frontend Service (Optional - for now)

The `googleCalendarService.ts` already has the API calls. Once you create the backend endpoints, they'll work automatically.

**No changes needed** - the service is already set up to call these endpoints.

---

### Step 4: Test the Flow

#### 4.1 Test Request Flow:
1. **As Startup:**
   - Go to Services → Explore
   - Find a mentor
   - Click "Connect" (you'll need to add this button to the explore page)
   - Fill the form and send request

2. **As Mentor:**
   - Go to Dashboard → Pending Requests
   - See the request
   - Click "Accept", "Reject", or "Negotiate"

3. **As Startup (if negotiating):**
   - Go to Services → Requested
   - See negotiation
   - Accept or Reject

#### 4.2 Test Scheduling Flow:
1. **As Mentor:**
   - Go to My Startups → Currently Mentoring
   - Click "Schedule" button
   - Book a session (Google Meet link will be generated when backend is ready)

2. **Both Parties:**
   - Go to respective dashboards
   - See scheduled session with Google Meet link

---

### Step 5: Add "Connect" Button to Explore Page (Optional)

Currently, startups can explore mentors, but there's no "Connect" button. You may want to add this:

**Location:** Wherever mentors are displayed in the explore page

**Code:**
```typescript
<Button
  onClick={() => {
    setSelectedMentor(mentor);
    setConnectModalOpen(true);
  }}
>
  Connect
</Button>
```

---

## 🎯 Priority Order

1. **HIGH PRIORITY:**
   - ✅ Create backend API endpoints (Step 1)
   - ✅ Set up Google Cloud project (Step 2)

2. **MEDIUM PRIORITY:**
   - ⏳ Test the complete flow (Step 4)
   - ⏳ Add "Connect" button to explore page (Step 5)

3. **LOW PRIORITY (Can be done later):**
   - ⏳ Email notifications
   - ⏳ Google OAuth flow for users
   - ⏳ Availability slot management UI

---

## 📝 Notes

- **Google Meet links will work** once you create the backend endpoints
- **Basic flow works now** - requests, negotiation, scheduling (without Meet links)
- **Calendar sync is optional** - works without it, but better with it
- **Service account** is needed for generating Meet links for all users
- **OAuth** is needed only if users want to sync their personal calendars

---

## 🚀 Quick Start

**Right now, you can:**
1. Test the request flow (without backend)
2. Test the negotiation flow
3. Test the scheduling UI (Meet links won't work until backend is ready)

**To make Meet links work:**
1. Create the 4 backend API endpoints
2. Set up Google Cloud project
3. Deploy and test

---

## 📚 Reference Files

- Backend API specs: `MENTOR_STARTUP_CONNECTION_IMPLEMENTATION_GUIDE.md` (lines 250-300)
- Service implementation: `lib/googleCalendarService.ts`
- Component usage: `components/mentor/SchedulingModal.tsx`

---

**Next immediate action: Create the backend API endpoints!** 🎯

