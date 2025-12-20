# Google Meet Link Implementation Details

## Overview
Google Meet links will be generated for ALL scheduled sessions and displayed in both mentor and startup dashboards.

---

## Google Meet Link Generation

### Method 1: Via Google Calendar API (Recommended)
When creating a Google Calendar event, we can request a Google Meet link:

```javascript
// Google Calendar API - Create event with Google Meet
const event = {
  summary: 'Mentoring Session',
  start: { dateTime: sessionDateTime, timeZone: 'UTC' },
  end: { dateTime: endDateTime, timeZone: 'UTC' },
  conferenceData: {
    createRequest: {
      requestId: uniqueRequestId,
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  },
  attendees: [
    { email: mentorEmail },
    { email: startupEmail }
  ]
};

// API call creates event AND generates Google Meet link
const response = await calendar.events.insert({
  calendarId: 'primary',
  resource: event,
  conferenceDataVersion: 1
});

// Extract Google Meet link
const meetLink = response.data.conferenceData.entryPoints[0].uri;
```

### Method 2: Direct Google Meet Link (Fallback)
If Google Calendar API is not available, we can generate a Google Meet link directly:
- Format: `https://meet.google.com/xxx-xxxx-xxx`
- Can be generated server-side or use Google Meet API

---

## Storage

### Database Field
```sql
-- Already in mentor_startup_sessions table
google_meet_link TEXT -- Stores the Google Meet URL
```

### When Link is Generated
1. **Immediately when session is booked** (if mentor has Google Calendar)
2. **Or generated on-demand** (if no Google Calendar, we use our API credentials)

---

## Display in Dashboards

### Mentor Dashboard
**Location**: My Startups → Currently Mentoring → [Startup] → Scheduled Sessions

**UI Component**:
```tsx
<div className="session-card">
  <h3>Session on {sessionDate} at {sessionTime}</h3>
  <p>Startup: {startupName}</p>
  
  {session.google_meet_link && (
    <div className="meet-link-section">
      <a 
        href={session.google_meet_link} 
        target="_blank"
        className="btn-join-meet"
      >
        <VideoIcon /> Join Google Meet
      </a>
      <button onClick={copyLink}>
        <CopyIcon /> Copy Link
      </button>
    </div>
  )}
</div>
```

### Startup Dashboard
**Location**: Services → Scheduled Sessions

**UI Component**:
```tsx
<div className="session-card">
  <h3>Session on {sessionDate} at {sessionTime}</h3>
  <p>Mentor: {mentorName}</p>
  
  {session.google_meet_link && (
    <div className="meet-link-section">
      <a 
        href={session.google_meet_link} 
        target="_blank"
        className="btn-join-meet"
      >
        <VideoIcon /> Join Google Meet
      </a>
      <button onClick={copyLink}>
        <CopyIcon /> Copy Link
      </button>
    </div>
  )}
</div>
```

---

## Email Notifications with Google Meet Link

### Booking Confirmation Email
```
Subject: Mentoring Session Scheduled - {Date} at {Time}

Hi {Name},

Your mentoring session has been scheduled:

Date: {Date}
Time: {Time}
Duration: {Duration} minutes

Join the session: {Google Meet Link}
[Click here to join] or copy this link: {Google Meet Link}

See you there!
```

### Reminder Email (24 hours before)
```
Subject: Reminder: Mentoring Session Tomorrow

Hi {Name},

This is a reminder about your mentoring session:

Date: {Date}
Time: {Time}

Join the session: {Google Meet Link}
[Click here to join]

See you tomorrow!
```

### Reminder Email (1 hour before)
```
Subject: Your Mentoring Session Starts in 1 Hour

Hi {Name},

Your mentoring session starts in 1 hour:

Time: {Time}

Join now: {Google Meet Link}
[Click here to join]
```

---

## Google Meet Link Features

### ✅ Always Available
- Link is generated for ALL sessions
- Stored in database immediately
- Available in both dashboards

### ✅ Same Link for Both Parties
- One Google Meet room per session
- Both mentor and startup use the same link
- Link doesn't expire (unless session is cancelled)

### ✅ Access Methods
1. **Click "Join Google Meet" button** in dashboard
2. **Copy link** and share manually
3. **Click link in email** notification
4. **Direct URL** access

### ✅ Works For Everyone
- No Google account needed to join (guest access)
- Works on web, mobile, desktop
- Supports video, audio, screen sharing

---

## Implementation Flow

### Step 1: Create Session
```javascript
// When startup books a slot
const session = await createSession({
  mentorId,
  startupId,
  sessionDate,
  sessionTime,
  duration: 60
});
```

### Step 2: Generate Google Meet Link
```javascript
// Option A: Via Google Calendar API (if mentor has Google)
if (mentorHasGoogleCalendar) {
  const meetLink = await createGoogleCalendarEventWithMeet(session);
  session.google_meet_link = meetLink;
}

// Option B: Direct generation (fallback)
else {
  const meetLink = await generateGoogleMeetLink(session);
  session.google_meet_link = meetLink;
}
```

### Step 3: Store in Database
```javascript
await updateSession(session.id, {
  google_meet_link: session.google_meet_link,
  google_calendar_synced: mentorHasGoogleCalendar
});
```

### Step 4: Display in Dashboards
- Fetch session with `google_meet_link`
- Display in both mentor and startup dashboards
- Include in all email notifications

---

## UI/UX Considerations

### Dashboard Display
- **Prominent "Join Google Meet" button** (green/blue, with video icon)
- **Copy link button** (for sharing)
- **Link preview** (show full URL on hover)
- **Countdown timer** (time until session starts)

### Email Display
- **Large "Join Meeting" button** (HTML email)
- **Plain text link** (for email clients that don't support HTML)
- **QR code** (optional, for mobile quick access)

### Mobile Responsive
- Button should be easy to tap
- Link should be easily copyable
- Join button opens Google Meet app (if installed) or browser

---

## Security & Privacy

### Link Sharing
- ✅ Same link for both parties (secure)
- ✅ Link can be shared with others (if needed)
- ✅ No password required (but can be added if needed)

### Access Control
- Link is stored securely in database
- Only mentor and startup can see the link in their dashboards
- Link is included in emails sent only to authorized parties

---

## Summary

### ✅ Google Meet Link Will:
1. Be generated for ALL sessions
2. Be stored in database (`google_meet_link` field)
3. Be displayed in **BOTH** mentor and startup dashboards
4. Be included in all email notifications
5. Be the same link for both parties
6. Work without requiring Google accounts (guest access)

### ✅ Display Locations:
- Mentor Dashboard → Scheduled Sessions
- Startup Dashboard → Scheduled Sessions  
- Email notifications (all types)
- Session details modal

### ✅ User Actions:
- Click to join directly
- Copy link to share
- Access from any device


