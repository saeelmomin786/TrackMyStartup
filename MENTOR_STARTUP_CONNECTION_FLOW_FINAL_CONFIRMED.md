# Mentor-Startup Connection Flow - FINAL CONFIRMED

## Complete Flow Step-by-Step

---

## PHASE 1: Startup Sends Connect Request

### Location: Startup Dashboard → Services Section → Connect to Mentor

### Steps:
1. Startup searches/selects a mentor
2. System shows mentor's fee structure:
   - If `fee_type = 'Fees'` → Show **Fee Amount** field
   - If `fee_type = 'Equity'` → Show **Equity Amount** or **ESOP %** field
   - If `fee_type = 'Hybrid'` → Show **BOTH** Fee Amount and Equity Amount fields
   - If `fee_type = 'Free'` → No amount fields

3. Startup fills form:
   - Optional message/note
   - Fee amount (if applicable)
   - Equity amount (if applicable)

4. Startup clicks "Send Request"

### Database Action:
```sql
INSERT INTO mentor_requests (
  mentor_id,
  requester_id,
  requester_type = 'Startup',
  startup_id,
  status = 'pending',
  message,
  proposed_fee_amount,
  proposed_equity_amount,
  proposed_esop_percentage
)
```

### Result:
- ✅ Request created with status = 'pending'
- ✅ Appears in Mentor's "Pending Requests" section
- ✅ Startup sees request in "Services → Requests" with status = 'pending'

---

## PHASE 2: Mentor Sees Request in Pending Requests

### Location: Mentor Dashboard → Pending Requests Section

### Display:
- Startup name, website, sector
- Message/note from startup
- Proposed fee amount (if provided)
- Proposed equity amount (if provided)
- Request date

### Actions Available:

#### Option 1: ACCEPT
- Updates `mentor_requests.status = 'accepted'`
- Creates `mentor_startup_assignments` entry:
  - `status = 'active'`
  - `assigned_at = NOW()` (this becomes from_date)
  - `fee_amount` = proposed or negotiated amount
  - `esop_percentage` = proposed or negotiated amount
- Moves to "Currently Mentoring" section
- Sends notification to startup

#### Option 2: REJECT
- Updates `mentor_requests.status = 'rejected'`
- No assignment created
- Sends notification to startup
- Request closed

#### Option 3: SEND NEGOTIATION
- Updates `mentor_requests.status = 'negotiating'`
- Mentor enters counter-proposal:
  - Negotiated fee amount
  - Negotiated equity amount
- Stores in `mentor_requests`:
  - `negotiated_fee_amount`
  - `negotiated_equity_amount`
  - `negotiated_esop_percentage`
- Sends notification to startup
- Request moves to "negotiating" status

### Result:
- ✅ Mentor can Accept/Reject/Negotiate
- ✅ If negotiating, startup sees counter-proposal

---

## PHASE 3: Startup Sees Request Status

### Location: Startup Dashboard → Services → Requests

### Display:
- Mentor name
- Request status: pending / negotiating / accepted / rejected
- Original proposal (fee/equity amounts)
- Mentor's counter-proposal (if negotiating)

### Actions Available:

#### If Status = 'negotiating':
1. **ACCEPT NEGOTIATION**:
   - Updates `mentor_requests.status = 'accepted'`
   - Creates `mentor_startup_assignments` with negotiated amounts
   - Sets `assigned_at = NOW()` (from_date)
   - Moves to mentor's "Currently Mentoring"
   - Sends notification to mentor

2. **REJECT NEGOTIATION**:
   - Updates `mentor_requests.status = 'rejected'`
   - Request closed
   - Sends notification to mentor

#### If Status = 'pending':
- No actions (waiting for mentor response)

#### If Status = 'accepted':
- Shows "Accepted" status
- Can view in Services → Active Services

### Result:
- ✅ Startup can Accept/Reject negotiation
- ✅ When accepted, moves to mentor's Currently Mentoring

---

## PHASE 4: Accepted Request → Currently Mentoring

### Location: Mentor Dashboard → My Startups → Currently Mentoring

### For TMS Startups (startups with `startup_id`):
- Shows in "Currently Mentoring" table
- `from_date` = `assigned_at` date (displayed in table)
- Actions available:
  - **Schedule** button (opens scheduling modal)
  - **View** button (view startup details)
  - **Update** button (mark as completed, update details)

### For Non-TMS Startups (manually entered):
- Shows in "Currently Mentoring" table
- `from_date` = `assigned_at` date
- Actions available:
  - **View** button
  - **Update** button
  - No Schedule button (only for TMS startups)

### Result:
- ✅ Accepted requests appear in Currently Mentoring
- ✅ From date is set automatically
- ✅ TMS startups have Schedule button

---

## PHASE 5: Schedule Functionality

### Location: Currently Mentoring → Schedule Button (TMS startups only)

### Step 5.1: Mentor Sets Available Slots

#### Option A: Mentor has Google Calendar
1. Mentor connects Google Calendar (one-time OAuth)
2. System reads existing Google Calendar events
3. Mentor sets available slots in our system
4. System checks Google Calendar for conflicts
5. Only shows non-conflicting slots

#### Option B: Mentor doesn't have Google Calendar
1. Mentor sets available slots directly in our system
2. No conflict checking
3. All slots stored in `mentor_availability_slots` table

**Result**: Available slots stored in database ✅

---

### Step 5.2: Startup Views & Selects Slot

1. Startup clicks "Schedule" button (in their Services section OR mentor initiates)
2. System opens scheduling modal/popup
3. System fetches available slots from database
4. **If mentor has Google Calendar**:
   - System checks Google Calendar API for real-time conflicts
   - Filters out conflicting slots
5. Startup sees available slots:
   - Day of week
   - Date
   - Time (start - end)
   - Duration
6. Startup selects preferred slot
7. System creates session in `mentor_startup_sessions` table

**Result**: Session booked in database ✅

---

### Step 5.3: Google Meet Link Generation

**For ALL Sessions (regardless of Google Calendar):**

1. System generates Google Meet link:
   - **If mentor has Google Calendar**: Via Google Calendar API (creates event + Meet link)
   - **If no Google Calendar**: Direct generation using our Google API credentials

2. Stores in database:
   - `google_meet_link` = "https://meet.google.com/xxx-xxxx-xxx"
   - `google_calendar_event_id` (if created via Calendar API)

3. **Google Meet link is generated for ALL sessions**

**Result**: Google Meet link stored ✅

---

### Step 5.4: Google Calendar Event Creation (If Available)

#### If Mentor has Google Calendar:
1. System creates event in mentor's Google Calendar via API
2. Auto-generates Google Meet link
3. Adds startup as attendee
4. Sends calendar invite to both parties
5. Stores event_id and meet_link in database

#### If Neither has Google Calendar:
1. System still generates Google Meet link (using our API)
2. Stores meet_link in database
3. Sends email notifications with Meet link

**Result**: 
- Google Meet link always generated ✅
- Google Calendar event (if mentor has Google) ✅

---

### Step 5.5: Display in Dashboards

#### Mentor Dashboard:
**Location**: My Startups → Currently Mentoring → [Startup] → Scheduled Sessions

**Shows**:
- Session date and time
- Startup name
- **Google Meet link** (clickable "Join Google Meet" button)
- Copy link button
- Status (scheduled/completed/cancelled)

#### Startup Dashboard:
**Location**: Services → Scheduled Sessions

**Shows**:
- Session date and time
- Mentor name
- **Google Meet link** (clickable "Join Google Meet" button)
- Copy link button
- Status (scheduled/completed/cancelled)

**Result**: 
- ✅ Google Meet link shown in BOTH dashboards
- ✅ Same link for both parties
- ✅ Available immediately after booking

---

### Step 5.6: Notifications

#### Email Notifications (Always Sent):
1. **Booking Confirmation**:
   - Sent to both mentor and startup
   - Includes: Date, Time, Duration, **Google Meet Link**
   - Subject: "Mentoring Session Scheduled"

2. **Reminder 24 Hours Before**:
   - Sent to both parties
   - Includes: **Google Meet Link**
   - Subject: "Reminder: Mentoring Session Tomorrow"

3. **Reminder 1 Hour Before**:
   - Sent to both parties
   - Includes: **Google Meet Link**
   - Subject: "Your Session Starts in 1 Hour"

#### Google Calendar Notifications (If Connected):
- Calendar invite sent via email (works even without Google account)
- Automatic reminders from Google Calendar
- Event updates if rescheduled

#### In-App Notifications:
- Notification badge in dashboard
- Session reminders
- Status updates

**Result**: 
- ✅ Both parties get email notifications with Google Meet link
- ✅ Google Calendar notifications (if available)
- ✅ In-app notifications

---

## Complete Flow Summary

### 1. Request Flow:
```
Startup → Sends Request (with note + fee/equity)
  ↓
Mentor → Sees in Pending Requests
  ↓
Mentor → Accepts/Rejects/Negotiates
  ↓
Startup → Sees Status (if negotiating, can Accept/Reject)
  ↓
Accepted → Moves to Currently Mentoring
```

### 2. Scheduling Flow:
```
Mentor → Sets Available Slots
  ↓
Startup → Views Available Slots
  ↓
Startup → Selects Slot
  ↓
System → Creates Session + Generates Google Meet Link
  ↓
Both → See Google Meet Link in Dashboards
  ↓
Both → Receive Email Notifications with Link
```

### 3. Google Meet Link:
```
✅ Generated for ALL sessions
✅ Stored in database
✅ Shown in BOTH dashboards
✅ Included in ALL email notifications
✅ Same link for both parties
✅ Works without Google accounts (guest access)
```

---

## Database Tables Used

1. **mentor_requests** - Stores connection requests
2. **mentor_startup_assignments** - Stores active/completed mentoring relationships
3. **mentor_availability_slots** - Stores mentor's available time slots
4. **mentor_startup_sessions** - Stores scheduled sessions with Google Meet links
5. **google_calendar_integrations** - Stores Google OAuth tokens (optional)

---

## Key Confirmations

### ✅ Request Flow:
- Startup sends request with note + fee/equity (based on mentor's fee structure)
- Mentor sees in Pending Requests
- Mentor can Accept/Reject/Negotiate
- Startup sees negotiation and can Accept/Reject
- When accepted, moves to Currently Mentoring with from_date

### ✅ Scheduling Flow:
- Mentor sets available slots
- Startup views and selects slot
- System creates session
- Google Meet link generated for ALL sessions
- Link shown in BOTH dashboards
- Both parties get email notifications with link

### ✅ Google Meet Link:
- Generated for every session
- Stored in database
- Displayed in both mentor and startup dashboards
- Included in all email notifications
- Works for everyone (no Google account needed to join)

---

## Next Steps for Implementation

1. ✅ Database schema (already created)
2. ⏳ Update mentor_requests table (add negotiation fields)
3. ⏳ Create request sending UI (startup side)
4. ⏳ Create request management UI (mentor side)
5. ⏳ Create negotiation UI (both sides)
6. ⏳ Create scheduling UI (availability + booking)
7. ⏳ Implement Google Meet link generation
8. ⏳ Implement Google Calendar API integration
9. ⏳ Create email notification system
10. ⏳ Add dashboard displays for sessions and Meet links

---

## Questions Confirmed

### Q: Will Google Meet link be shown in both dashboards?
**A**: ✅ YES - Shown in both mentor and startup dashboards

### Q: When is Google Meet link created?
**A**: ✅ Immediately when session is booked/created

### Q: Do both parties get the same link?
**A**: ✅ YES - Same Google Meet link for both

### Q: What if user doesn't have Google account?
**A**: ✅ Still works - Google Meet link works for guests (no account needed to join)

### Q: Will notifications include Google Meet link?
**A**: ✅ YES - All email notifications include the Google Meet link

---

## Final Confirmation Checklist

- [x] Request flow with note + fee/equity
- [x] Mentor can Accept/Reject/Negotiate
- [x] Startup can Accept/Reject negotiation
- [x] Accepted requests move to Currently Mentoring
- [x] From_date set when accepted
- [x] Schedule functionality for TMS startups
- [x] Google Meet link generated for ALL sessions
- [x] Google Meet link shown in BOTH dashboards
- [x] Email notifications with Google Meet link
- [x] Works without Google accounts

**All confirmed and ready for implementation!** ✅

