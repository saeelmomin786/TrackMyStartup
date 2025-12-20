# Mentor-Startup Scheduling Flow - Clarified Approach

## Key Decision: Hybrid Calendar System

### Problem Statement:
- Not all users have Google accounts
- We need a solution that works for everyone
- But we also want Google Calendar integration for those who have it

### Solution: **Primary Database + Optional Google Calendar Sync**

---

## Flow Architecture

### 1. **Primary System: Our Database Calendar**
- **All scheduling data stored in our database** (`mentor_availability_slots`, `mentor_startup_sessions`)
- Works for **ALL users** regardless of Google account
- This is our **source of truth**

### 2. **Optional Enhancement: Google Calendar Sync**
- If mentor has Google account → Sync with Google Calendar
- If startup has Google account → Sync with Google Calendar
- **If no Google account** → Still works, just uses our system + email notifications

---

## Complete Flow Breakdown

### **Phase 1: Mentor Sets Availability**

#### Option A: Mentor has Google Calendar connected
1. Mentor connects Google Calendar (one-time OAuth)
2. System reads mentor's existing Google Calendar events
3. Mentor sets available slots in our system
4. System checks Google Calendar for conflicts
5. Only shows available slots (not conflicting with Google Calendar)

#### Option B: Mentor doesn't have Google Calendar
1. Mentor sets available slots directly in our system
2. No conflict checking (relies on mentor to manage)
3. All slots stored in `mentor_availability_slots` table

**Result**: Available slots stored in our database ✅

---

### **Phase 2: Startup Views & Selects Slot**

1. Startup opens "Schedule Session" modal
2. System fetches available slots from our database
3. **If mentor has Google Calendar**:
   - System checks Google Calendar API for real-time conflicts
   - Filters out conflicting slots
4. Startup sees available slots (day, date, time)
5. Startup selects preferred slot
6. System creates session in `mentor_startup_sessions` table

**Result**: Session booked in our database ✅

---

### **Phase 3: Google Calendar Event Creation & Google Meet Link**

#### If Mentor has Google Calendar:
1. System creates event in mentor's Google Calendar via API
2. **Auto-generates Google Meet link** (via Google Calendar API)
3. Sends calendar invite to mentor's email
4. Stores `google_calendar_event_id` and `google_meet_link` in `mentor_startup_sessions` table

#### If Startup has Google Calendar:
1. System adds startup as attendee to the event
2. Sends calendar invite to startup's email (includes Google Meet link)
3. Startup receives invite (works even without Google account - they get email with Meet link)

#### If Neither has Google Calendar:
1. System still creates Google Meet link (using our Google Calendar API credentials)
2. Google Meet link stored in database
3. System sends email notifications to both parties with Google Meet link
4. Session details stored in our database

**Result**: 
- Session in our database ✅
- **Google Meet link generated and stored** ✅
- **Google Meet link shown in BOTH dashboards** ✅
- Google Calendar event (if mentor has Google) ✅
- Email notifications to both (with Meet link) ✅

---

### **Phase 3a: Google Meet Link Display**

**After session is created, Google Meet link is shown in:**

1. **Mentor Dashboard** → My Startups → Currently Mentoring → Scheduled Sessions:
   - Session card shows: Date, Time, Startup Name, **Google Meet Link** (clickable button)
   - Can copy link or join directly

2. **Startup Dashboard** → Services → Scheduled Sessions:
   - Session card shows: Date, Time, Mentor Name, **Google Meet Link** (clickable button)
   - Can copy link or join directly

3. **Email Notifications**:
   - Booking confirmation email includes Google Meet link
   - Reminder emails include Google Meet link
   - Both parties receive the same link

**Google Meet Link Features:**
- ✅ Auto-generated when session is created
- ✅ Stored in `mentor_startup_sessions.google_meet_link`
- ✅ Same link for both mentor and startup
- ✅ Works for video/audio meetings
- ✅ Can be accessed from both dashboards
- ✅ Included in all email notifications

---

### **Phase 4: Notifications**

#### Always Sent (Regardless of Google):
1. **Email Notifications**:
   - Booking confirmation
   - Reminder 24 hours before
   - Reminder 1 hour before
   - Session details with Google Meet link (if created)

2. **In-App Notifications**:
   - Show in dashboard
   - Notification badge

#### If Google Calendar Connected:
3. **Google Calendar Notifications**:
   - Automatic reminders from Google Calendar
   - Calendar invite notifications

**Result**: Both parties get notifications ✅

---

## Database Schema (Already Created)

### Tables:
1. ✅ `mentor_availability_slots` - Stores mentor's available time slots
2. ✅ `mentor_startup_sessions` - Stores booked sessions
3. ✅ `google_calendar_integrations` - Stores Google OAuth tokens (optional)

---

## Google Calendar API Usage

### What We Use Google Calendar For:
1. **Conflict Detection** (if mentor has Google Calendar)
   - Check existing events before showing available slots
   - Real-time availability checking

2. **Event Creation** (if mentor has Google Calendar)
   - Create calendar event when slot is booked
   - Auto-generate Google Meet link
   - Send calendar invites

3. **Event Updates** (if mentor has Google Calendar)
   - Update event if session is rescheduled
   - Cancel event if session is cancelled

### What We DON'T Rely On Google Calendar For:
- ❌ Primary storage (we use our database)
- ❌ Availability management (we use our database)
- ❌ Notifications (we use email + in-app)

---

## Implementation Approach

### 1. **Core Scheduling System** (Works for Everyone)
```
Our Database → Primary Source of Truth
├── mentor_availability_slots (mentor's available times)
├── mentor_startup_sessions (booked sessions)
└── Email notifications (always sent)
```

### 2. **Google Calendar Enhancement** (Optional)
```
Google Calendar API → Enhancement Layer
├── Conflict detection (if mentor connected)
├── Event creation (if mentor connected)
├── Google Meet links (if mentor connected)
└── Calendar invites (works for everyone via email)
```

---

## User Experience Flow

### Scenario 1: Both Have Google Accounts
1. Mentor connects Google Calendar → Sees conflicts automatically
2. Startup books slot → Event created in both Google Calendars
3. Both get: Email + Google Calendar notification + Google Meet link

### Scenario 2: Only Mentor Has Google Account
1. Mentor connects Google Calendar → Sees conflicts automatically
2. Startup books slot → Event created in mentor's Google Calendar
3. Mentor gets: Email + Google Calendar notification + Google Meet link
4. Startup gets: Email notification with Google Meet link

### Scenario 3: Neither Has Google Account
1. Mentor sets slots in our system
2. Startup books slot → Stored in our database
3. Both get: Email notifications with session details
4. No Google Calendar events, but system still works perfectly

---

## Notification Strategy

### Email Notifications (Always Sent):
- ✅ Booking confirmation
- ✅ Session details (date, time, Google Meet link if available)
- ✅ Reminder 24 hours before
- ✅ Reminder 1 hour before
- ✅ Reschedule/cancellation notifications

### Google Calendar Notifications (If Connected):
- ✅ Calendar invite (sent via email even if no Google account)
- ✅ Automatic reminders from Google Calendar
- ✅ Event updates

### In-App Notifications:
- ✅ Notification badge
- ✅ Dashboard alerts
- ✅ Session reminders

---

## Technical Implementation

### Service Layer Structure:

```
SchedulingService (Core - Always Works)
├── getAvailableSlots(mentorId)
├── bookSession(mentorId, startupId, slotId)
├── sendEmailNotifications(sessionId)
└── getSessions(mentorId/startupId)

GoogleCalendarService (Optional Enhancement)
├── connectCalendar(userId) - OAuth flow
├── checkConflicts(mentorId, date, time)
├── createEvent(sessionId)
├── updateEvent(sessionId)
└── cancelEvent(sessionId)
```

---

## Benefits of This Approach

### ✅ Works for Everyone
- No Google account required
- System functions fully without Google Calendar

### ✅ Enhanced Experience (If Google Available)
- Automatic conflict detection
- Google Meet links
- Calendar integration

### ✅ Reliable Notifications
- Email always works
- Google Calendar adds extra layer
- In-app notifications for engagement

### ✅ Flexible
- Users can connect Google Calendar anytime
- Can disconnect without breaking system
- Gradual enhancement, not dependency

---

## Next Steps for Implementation

1. **Phase 1**: Core scheduling system (database + email)
   - Availability slot management
   - Session booking
   - Email notifications

2. **Phase 2**: Google Calendar integration (optional enhancement)
   - OAuth flow
   - Conflict detection
   - Event creation
   - Google Meet links

3. **Phase 3**: Enhanced notifications
   - In-app notifications
   - Push notifications (optional)

---

## Answer to Your Questions

### Q: What if user doesn't have Google account?
**A**: System works perfectly without Google. We use our database as primary, Google Calendar is optional enhancement.

### Q: Should we use Google Calendar API with Google Meet?
**A**: Yes, but as enhancement. We use our API to:
- Create events (if user has Google)
- Generate Google Meet links
- Send calendar invites (works via email even without Google account)

### Q: Will both guests get notifications?
**A**: Yes! Always:
- Email notifications (always sent)
- Google Calendar invites (if available, sent via email)
- In-app notifications

---

## Final Recommendation

**Use Hybrid Approach:**
- ✅ Primary: Our database calendar system (works for all)
- ✅ Enhancement: Google Calendar API integration (optional)
- ✅ Notifications: Email (always) + Google Calendar (if available)

This ensures the system works for everyone while providing enhanced features for those with Google accounts.

