# Google Calendar Integration - Complete Explanation

## 📋 Current Implementation

### ✅ What Happens Now:

1. **Google Meet Link Generation**
   - Generated **first** using service account
   - Stored in database (`google_meet_link` field)
   - Same link is used for both mentor and startup

2. **Calendar Event Creation**
   - **Only created in MENTOR's calendar** (if mentor has Google Calendar connected)
   - Uses mentor's OAuth token and calendar ID
   - Event is created in **mentor's Google Calendar account**
   - Google Meet link is included in the event

3. **Current Limitations:**
   - ❌ Event is **NOT automatically added to startup's calendar**
   - ❌ Startup email is **NOT added as attendee** (so they don't get calendar invite)
   - ✅ Same Google Meet link is used and stored in database

---

## 🔍 How It Works Currently

### Step-by-Step Flow:

```
1. Startup Books Slot
   ↓
2. Generate Google Meet Link
   (Using service account - creates temporary event, gets Meet link, deletes event)
   ↓
3. Store Session in Database
   (Includes: mentor_id, startup_id, date, time, google_meet_link)
   ↓
4. Check if Mentor has Google Calendar Connected
   ↓
5. If YES → Create Event in MENTOR's Calendar
   (Uses mentor's OAuth token)
   (Event includes Google Meet link)
   ↓
6. If NO → Skip calendar creation
   (Session still saved, Meet link still available)
```

### Code Location:

**File:** `components/mentor/SchedulingModal.tsx` (lines 105-127)

```typescript
// If mentor has Google Calendar, create event
try {
  const integration = await googleCalendarService.getIntegration(mentorId, 'Mentor');
  if (integration && integration.calendar_sync_enabled) {
    const startDateTime = new Date(`${selectedSlot.date}T${selectedSlot.time}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    await googleCalendarService.createCalendarEventWithMeet(integration, {
      summary: 'Mentoring Session',
      description: 'Mentoring session with startup',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC'
      }
      // ❌ NO ATTENDEES ADDED HERE
    });
  }
} catch (err) {
  console.warn('Failed to create Google Calendar event, continuing:', err);
}
```

---

## ❌ What's Missing

### 1. **Startup Email Not Added as Attendee**

**Current:** Event is created in mentor's calendar only
**Needed:** Add startup's email as attendee so they:
- Get calendar invite
- See event in their calendar
- Get email notification

### 2. **Event Not Created in Startup's Calendar**

**Current:** Only mentor's calendar gets the event
**Needed:** Also create event in startup's calendar (if they have Google Calendar connected)

---

## ✅ What Works Correctly

1. **Same Google Meet Link**
   - ✅ Generated once
   - ✅ Stored in database
   - ✅ Used in calendar event
   - ✅ Available to both mentor and startup in dashboard

2. **Mentor's Calendar**
   - ✅ Event created automatically (if mentor has integration)
   - ✅ Google Meet link included
   - ✅ Date/time correct

---

## 🔧 How to Fix (Add Attendees)

### Option 1: Add Startup Email as Attendee (Recommended)

**File:** `components/mentor/SchedulingModal.tsx`

```typescript
// Get startup email
const startupEmail = currentStartup?.email || startupUser?.email;

await googleCalendarService.createCalendarEventWithMeet(integration, {
  summary: 'Mentoring Session',
  description: 'Mentoring session with startup',
  start: {
    dateTime: startDateTime.toISOString(),
    timeZone: 'UTC'
  },
  end: {
    dateTime: endDateTime.toISOString(),
    timeZone: 'UTC'
  },
  // ✅ ADD THIS:
  attendees: startupEmail ? [{ email: startupEmail }] : []
});
```

### Option 2: Create Event in Both Calendars

1. Create event in mentor's calendar (current)
2. If startup has Google Calendar connected, create event in startup's calendar too
3. Both events use the same Google Meet link

---

## 📊 Summary Table

| Feature | Current Status | Notes |
|---------|---------------|-------|
| **Google Meet Link** | ✅ Works | Generated once, stored, same link for both |
| **Mentor Calendar** | ✅ Works | Event created if mentor has integration |
| **Startup Calendar** | ❌ Not Created | Event not added to startup's calendar |
| **Attendees** | ❌ Not Added | Startup email not added as attendee |
| **Email Invites** | ❌ Not Sent | Startup doesn't get calendar invite |

---

## 🎯 Answers to Your Questions

### Q1: Will sessions automatically be created in Google Calendar from our account?

**Answer:** 
- ✅ **YES** - But only in the **MENTOR's Google Calendar** (if mentor has connected their Google Calendar)
- ❌ **NO** - Not from "our account" (system account), but from the **mentor's personal Google account**
- The event is created using the mentor's OAuth token

### Q2: Will it add both mentor and startup to the calendar event?

**Answer:**
- ✅ **Mentor:** Automatically added (event is in their calendar)
- ❌ **Startup:** **NOT automatically added** (needs to be fixed)
- Currently, startup email is **NOT added as attendee**, so they don't get:
  - Calendar invite
  - Email notification
  - Event in their calendar

### Q3: Will the same Google Meet link be there?

**Answer:**
- ✅ **YES** - The same Google Meet link is:
  - Generated once
  - Stored in database
  - Added to the calendar event
  - Available to both mentor and startup in the dashboard

---

## 🚀 Recommended Improvements

1. **Add Startup as Attendee**
   - Get startup's email from database
   - Add to `attendees` array when creating calendar event
   - Startup will receive calendar invite automatically

2. **Create Event in Startup's Calendar** (Optional)
   - Check if startup has Google Calendar connected
   - Create event in their calendar too
   - Both events use same Meet link

3. **Better Error Handling**
   - If calendar creation fails, still save session
   - Log errors for debugging
   - Notify users if calendar sync fails

---

## 📝 Current Database Fields

**Table:** `mentor_startup_sessions`

- `google_meet_link` - ✅ Stored (same for both)
- `google_calendar_event_id` - ✅ Stored (mentor's event ID)
- `google_calendar_synced` - ✅ Boolean flag

**Missing:**
- Startup's calendar event ID (if we create one)
- Startup's email (for attendee)

---

## 🔐 Security Note

- Events are created using **user's own OAuth tokens** (mentor's token)
- System doesn't have access to user calendars directly
- Each user must connect their own Google Calendar
- Service account is only used for generating Meet links (temporary)



