# Mentor-Startup Connection Flow - Implementation Guide

## Overview
This guide explains how to implement the complete mentor-startup connection and scheduling flow with proper Supabase tables and React components.

---

## Step 1: Database Setup

### Run SQL Files in Order:

1. **UPDATE_MENTOR_REQUESTS_COMPLETE.sql**
   - Adds negotiation fields to `mentor_requests` table
   - Adds `proposed_fee_amount`, `proposed_equity_amount`, `proposed_esop_percentage`
   - Adds `negotiated_fee_amount`, `negotiated_equity_amount`, `negotiated_esop_percentage`
   - Updates status constraint to include 'negotiating'

2. **CREATE_MENTOR_AVAILABILITY_SLOTS_COMPLETE.sql**
   - Creates `mentor_availability_slots` table
   - Supports both recurring and one-time slots
   - Includes RLS policies

3. **CREATE_MENTOR_STARTUP_SESSIONS_COMPLETE.sql**
   - Creates `mentor_startup_sessions` table
   - Stores scheduled sessions with Google Meet links
   - Includes RLS policies

4. **CREATE_GOOGLE_CALENDAR_INTEGRATIONS_COMPLETE.sql**
   - Creates `google_calendar_integrations` table
   - Stores OAuth tokens for Google Calendar sync
   - Includes RLS policies

### Execute in Supabase SQL Editor:
```sql
-- Run each file in order
-- 1. UPDATE_MENTOR_REQUESTS_COMPLETE.sql
-- 2. CREATE_MENTOR_AVAILABILITY_SLOTS_COMPLETE.sql
-- 3. CREATE_MENTOR_STARTUP_SESSIONS_COMPLETE.sql
-- 4. CREATE_GOOGLE_CALENDAR_INTEGRATIONS_COMPLETE.sql
```

---

## Step 2: Service Layer Integration

### Files Created:
- ✅ `lib/mentorService.ts` - Updated with negotiation methods
- ✅ `lib/mentorSchedulingService.ts` - New scheduling service
- ✅ `lib/googleCalendarService.ts` - New Google Calendar service

### Key Methods:

#### mentorService:
- `sendConnectRequest()` - Startup sends request with fee/equity
- `sendNegotiation()` - Mentor sends counter-proposal
- `acceptMentorRequest()` - Accept request (updated to handle negotiation)
- `rejectMentorRequest()` - Reject request

#### mentorSchedulingService:
- `getAvailabilitySlots()` - Get mentor's availability
- `createAvailabilitySlot()` - Create new slot
- `getAvailableSlotsForDateRange()` - Get available slots for booking
- `bookSession()` - Book a session
- `getMentorSessions()` - Get mentor's sessions
- `getStartupSessions()` - Get startup's sessions

#### googleCalendarService:
- `generateGoogleMeetLink()` - Generate Meet link
- `createCalendarEventWithMeet()` - Create event with Meet link
- `checkConflicts()` - Check calendar conflicts

---

## Step 3: UI Components Integration

### Components Created:

1. **ConnectMentorRequestModal.tsx**
   - Startup-side: Send connect request form
   - Shows fee/equity fields based on mentor's fee structure
   - Location: `components/mentor/ConnectMentorRequestModal.tsx`

2. **MentorPendingRequestsSection.tsx**
   - Mentor-side: View and manage pending requests
   - Actions: Accept, Reject, Negotiate
   - Location: `components/mentor/MentorPendingRequestsSection.tsx`

3. **StartupRequestsSection.tsx**
   - Startup-side: View request status
   - Actions: Accept/Reject negotiation
   - Location: `components/mentor/StartupRequestsSection.tsx`

4. **SchedulingModal.tsx**
   - Booking interface for startups
   - Shows available slots, generates Google Meet link
   - Location: `components/mentor/SchedulingModal.tsx`

5. **ScheduledSessionsSection.tsx**
   - Display scheduled sessions with Google Meet links
   - Works for both mentor and startup dashboards
   - Location: `components/mentor/ScheduledSessionsSection.tsx`

---

## Step 4: Integration into Existing Dashboards

### A. Mentor Dashboard (MentorView.tsx)

#### Add Pending Requests Section:
```typescript
import MentorPendingRequestsSection from '../mentor/MentorPendingRequestsSection';

// In MentorView component, add to "Pending Requests" section:
<MentorPendingRequestsSection
  requests={mentorMetrics?.pendingRequests || []}
  onRequestAction={() => {
    // Reload metrics
    if (currentUser?.id) {
      mentorService.getMentorMetrics(currentUser.id).then(setMentorMetrics);
    }
  }}
/>
```

#### Add Scheduled Sessions to "My Startups":
```typescript
import ScheduledSessionsSection from '../mentor/ScheduledSessionsSection';

// In Currently Mentoring section:
<ScheduledSessionsSection
  mentorId={currentUser?.id}
  userType="Mentor"
/>
```

#### Add Schedule Button to Currently Mentoring Table:
```typescript
import SchedulingModal from '../mentor/SchedulingModal';

// Add state:
const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
const [selectedAssignmentForScheduling, setSelectedAssignmentForScheduling] = useState<any>(null);

// In table actions:
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    setSelectedAssignmentForScheduling(assignment);
    setSchedulingModalOpen(true);
  }}
>
  Schedule
</Button>

// Add modal:
{schedulingModalOpen && selectedAssignmentForScheduling && (
  <SchedulingModal
    isOpen={schedulingModalOpen}
    onClose={() => {
      setSchedulingModalOpen(false);
      setSelectedAssignmentForScheduling(null);
    }}
    mentorId={currentUser?.id!}
    startupId={selectedAssignmentForScheduling.startup_id}
    assignmentId={selectedAssignmentForScheduling.id}
    onSessionBooked={() => {
      // Reload metrics
      if (currentUser?.id) {
        mentorService.getMentorMetrics(currentUser.id).then(setMentorMetrics);
      }
    }}
  />
)}
```

### B. Startup Dashboard (StartupHealthView.tsx)

#### Add Connect Request Modal to Services Tab:
```typescript
import ConnectMentorRequestModal from '../mentor/ConnectMentorRequestModal';

// In Services tab "explore" sub-tab, when showing mentors:
<ConnectMentorRequestModal
  isOpen={connectModalOpen}
  onClose={() => setConnectModalOpen(false)}
  mentorId={selectedMentor.id}
  mentorName={selectedMentor.name}
  mentorFeeType={selectedMentor.fee_type}
  mentorFeeAmount={selectedMentor.fee_amount}
  mentorEquityPercentage={selectedMentor.equity_percentage}
  startupId={startup.id}
  requesterId={currentUser?.id!}
  onRequestSent={() => {
    // Reload requests
    loadStartupRequests();
  }}
/>
```

#### Add Requests Section to Services Tab:
```typescript
import StartupRequestsSection from '../mentor/StartupRequestsSection';

// In Services tab "requested" sub-tab:
<StartupRequestsSection
  requests={startupRequests}
  onRequestAction={() => {
    loadStartupRequests();
  }}
/>
```

#### Add Scheduled Sessions to Services Tab:
```typescript
import ScheduledSessionsSection from '../mentor/ScheduledSessionsSection';

// In Services tab "my-services" sub-tab:
<ScheduledSessionsSection
  startupId={startup.id}
  userType="Startup"
/>
```

---

## Step 5: Backend API Endpoints (Required)

The Google Calendar service requires backend API endpoints. Create these in your backend:

### 1. Generate Google Meet Link
```
POST /api/generate-google-meet-link
Body: {}
Response: { meetLink: string }
```

### 2. Create Google Calendar Event
```
POST /api/create-google-calendar-event
Body: {
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent
}
Response: { eventId: string, hangoutLink: string }
```

### 3. Check Calendar Conflicts
```
POST /api/check-google-calendar-conflicts
Body: {
  accessToken: string,
  calendarId: string,
  startDateTime: string,
  endDateTime: string
}
Response: { hasConflicts: boolean }
```

### 4. Refresh Google Token
```
POST /api/refresh-google-token
Body: { refreshToken: string }
Response: { accessToken: string }
```

---

## Step 6: Google Calendar OAuth Setup

### Required:
1. Google Cloud Console project
2. OAuth 2.0 credentials
3. Calendar API enabled
4. Redirect URI configured

### OAuth Flow:
1. User clicks "Connect Google Calendar"
2. Redirect to Google OAuth consent screen
3. User grants permissions
4. Receive access_token and refresh_token
5. Store in `google_calendar_integrations` table

---

## Step 7: Testing Checklist

### Request Flow:
- [ ] Startup can send connect request with fee/equity
- [ ] Mentor sees request in Pending Requests
- [ ] Mentor can Accept/Reject/Negotiate
- [ ] Startup sees negotiation and can Accept/Reject
- [ ] Accepted requests move to Currently Mentoring

### Scheduling Flow:
- [ ] Mentor can set availability slots
- [ ] Startup can view available slots
- [ ] Startup can book a session
- [ ] Google Meet link is generated
- [ ] Session appears in both dashboards
- [ ] Google Meet link is displayed in both dashboards

### Google Calendar Integration:
- [ ] Mentor can connect Google Calendar
- [ ] Calendar conflicts are checked
- [ ] Events are created in Google Calendar
- [ ] Google Meet links are generated
- [ ] Email notifications are sent

---

## Step 8: Email Notifications

### Required Email Templates:

1. **Request Sent** (to Mentor)
   - Subject: "New Connection Request from [Startup Name]"
   - Include: Startup details, proposed terms, message

2. **Request Accepted** (to Startup)
   - Subject: "Your Connection Request Has Been Accepted"
   - Include: Mentor details, accepted terms

3. **Negotiation Sent** (to Startup)
   - Subject: "Mentor Counter-Proposal"
   - Include: Counter-proposal terms

4. **Session Booked** (to Both)
   - Subject: "Mentoring Session Scheduled"
   - Include: Date, time, duration, **Google Meet link**

5. **Session Reminder** (to Both, 24h before)
   - Subject: "Reminder: Mentoring Session Tomorrow"
   - Include: **Google Meet link**

---

## Step 9: Data Flow Summary

```
1. Startup → Send Request
   ↓
   mentor_requests (status: 'pending')

2. Mentor → Accept/Reject/Negotiate
   ↓
   mentor_requests (status: 'accepted'/'rejected'/'negotiating')
   ↓ (if accepted)
   mentor_startup_assignments (status: 'active')

3. Startup → Accept Negotiation
   ↓
   mentor_requests (status: 'accepted')
   ↓
   mentor_startup_assignments (status: 'active')

4. Startup → Book Session
   ↓
   mentor_startup_sessions (status: 'scheduled')
   ↓
   Google Meet link generated
   ↓
   Google Calendar event created (if connected)
   ↓
   Email notifications sent
```

---

## Step 10: Next Steps

1. ✅ Run SQL files in Supabase
2. ✅ Integrate components into dashboards
3. ⏳ Create backend API endpoints for Google Calendar
4. ⏳ Set up Google OAuth
5. ⏳ Implement email notifications
6. ⏳ Test complete flow
7. ⏳ Deploy

---

## Notes

- Google Meet links are generated for ALL sessions, regardless of Google Calendar connection
- The internal database is the primary source of truth
- Google Calendar integration is optional enhancement
- All sessions include Google Meet links in both dashboards
- Email notifications always include Google Meet links

---

## Support

For issues or questions:
1. Check SQL execution logs in Supabase
2. Check browser console for errors
3. Verify RLS policies are correct
4. Ensure backend API endpoints are working
5. Verify Google OAuth credentials

