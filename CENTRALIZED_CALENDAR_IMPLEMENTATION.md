# Centralized Google Calendar Implementation

## ✅ Implementation Complete

### What Changed:

1. **Calendar Events Now Created from Service Account**
   - Events are created in **your centralized Google Calendar** (service account)
   - No longer uses mentor's personal Google Calendar
   - All sessions are visible in one central calendar for monitoring

2. **Both Mentor and Startup Added as Attendees**
   - Mentor email is automatically added
   - Startup email is automatically added
   - Both receive calendar invites automatically
   - Both get email notifications

3. **Same Google Meet Link**
   - Meet link is generated first and stored in database
   - Same link is shown in dashboard
   - Same link is included in calendar event description
   - Calendar also generates its own Meet link (for proper invites)
   - Both links work, but calendar-generated one is primary

---

## 🔧 How It Works

### Flow:

```
1. Startup Books Slot
   ↓
2. Generate Google Meet Link (Service Account)
   ↓
3. Store Session in Database (with Meet link)
   ↓
4. Get Mentor & Startup Emails
   ↓
5. Create Calendar Event (Service Account)
   - Calendar: Your centralized calendar
   - Attendees: Mentor + Startup emails
   - Meet Link: Included in description + calendar-generated
   - Invites: Sent automatically to both
   ↓
6. Both Receive Calendar Invites
```

---

## 📋 API Endpoint

**New Endpoint:** `/api/google-calendar?action=create-event-service-account`

**Request:**
```json
{
  "event": {
    "summary": "Mentoring Session",
    "description": "Mentoring session with startup",
    "start": {
      "dateTime": "2025-12-25T14:00:00Z",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "2025-12-25T15:00:00Z",
      "timeZone": "UTC"
    }
  },
  "attendees": [
    { "email": "mentor@example.com" },
    { "email": "startup@example.com" }
  ],
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz"
}
```

**Response:**
```json
{
  "eventId": "event_id_from_google",
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz",
  "calendarId": "primary"
}
```

---

## 🔐 Environment Variables Required

Make sure these are set in your environment:

```env
GOOGLE_SERVICE_ACCOUNT_KEY=your_service_account_json
GOOGLE_CALENDAR_ID=primary  # Optional, defaults to 'primary'
```

---

## 📊 Benefits

1. ✅ **Centralized Monitoring**
   - All sessions in one calendar
   - Easy to see all bookings
   - Better oversight

2. ✅ **Automatic Invites**
   - Both mentor and startup get invites
   - No manual work needed
   - Professional experience

3. ✅ **Consistent Meet Links**
   - Same link in dashboard and calendar
   - No confusion
   - Easy access

4. ✅ **Better Management**
   - All events in your account
   - Can monitor, edit, cancel
   - Full control

---

## 🎯 What Happens Now

When a startup books a session:

1. ✅ Session saved in database
2. ✅ Google Meet link generated
3. ✅ Calendar event created in **your centralized calendar**
4. ✅ Mentor email added as attendee
5. ✅ Startup email added as attendee
6. ✅ Both receive calendar invites
7. ✅ Both receive email notifications
8. ✅ Same Meet link available in dashboard and calendar

---

## 📝 Notes

- **Meet Link:** The calendar will generate its own Meet link for the event, but the original link is also included in the description
- **Calendar ID:** Uses `GOOGLE_CALENDAR_ID` env var or defaults to `'primary'`
- **Service Account:** Must have calendar permissions
- **Attendees:** Automatically fetched from database (mentor and startup emails)

---

## 🚀 Next Steps

1. Set `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable
2. Optionally set `GOOGLE_CALENDAR_ID` if you want a specific calendar
3. Test booking a session
4. Check your centralized calendar for the event
5. Verify both mentor and startup receive invites




