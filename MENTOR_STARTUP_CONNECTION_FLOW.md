# Mentor-Startup Connection Flow Implementation Plan

## Complete Flow Overview

### 1. Startup Sends Connect Request
**Location**: Startup Dashboard → Services Section → Connect to Mentor

**Fields to Collect**:
- Mentor selection (by mentor_code or search)
- Optional message/note
- **Fee/Equity based on mentor's fee structure**:
  - If `fee_type = 'Fees'`: Show `fee_amount` field
  - If `fee_type = 'Equity'`: Show `equity_amount` or `esop_percentage` field
  - If `fee_type = 'Hybrid'`: Show both `fee_amount` and `equity_amount` fields
  - If `fee_type = 'Free'`: No amount fields

**Action**: Creates entry in `mentor_requests` table with:
- `status = 'pending'`
- `message` (optional note)
- `fee_amount` (if applicable)
- `esop_percentage` or `equity_amount` (if applicable)

---

### 2. Mentor Sees Request in Pending Requests
**Location**: Mentor Dashboard → Pending Requests Section

**Display**:
- Startup name, website, sector
- Message/note from startup
- Proposed fee amount (if applicable)
- Proposed equity amount (if applicable)
- Request date

**Actions Available**:
1. **Accept**: 
   - Updates `mentor_requests.status = 'accepted'`
   - Creates `mentor_startup_assignments` entry with `status = 'active'`
   - Sets `assigned_at = NOW()` (this becomes from_date)
   - Moves to "Currently Mentoring" section

2. **Reject**: 
   - Updates `mentor_requests.status = 'rejected'`
   - No assignment created

3. **Send Negotiation**: 
   - Updates `mentor_requests.status = 'negotiating'`
   - Stores mentor's counter-proposal (fee/equity amounts)
   - Sends notification to startup

---

### 3. Startup Sees Request Status
**Location**: Startup Dashboard → Services Section → Requests

**Display**:
- Mentor name
- Request status (pending, negotiating, accepted, rejected)
- Original proposal (fee/equity)
- Mentor's counter-proposal (if negotiating)

**Actions Available** (only when status = 'negotiating'):
1. **Accept Negotiation**: 
   - Updates `mentor_requests.status = 'accepted'`
   - Creates `mentor_startup_assignments` with negotiated amounts
   - Sets `assigned_at = NOW()`

2. **Reject Negotiation**: 
   - Updates `mentor_requests.status = 'rejected'`
   - Request closed

---

### 4. Accepted Request → Currently Mentoring
**Location**: Mentor Dashboard → My Startups → Currently Mentoring

**For TMS Startups** (startups with `startup_id`):
- Show: Schedule, View, Update buttons
- `from_date` = `assigned_at` date

**For Non-TMS Startups** (manually entered):
- Show: View, Update buttons (no Schedule)

---

### 5. Schedule Functionality
**Location**: Currently Mentoring → Schedule Button (for TMS startups only)

**Flow**:
1. **Mentor Sets Available Slots**:
   - Mentor defines available time slots (day, date, time)
   - Stored in `mentor_availability_slots` table
   - Can sync with Google Calendar for conflict detection

2. **Startup Views Available Slots**:
   - Opens modal/popup showing mentor's available slots
   - Shows slots that don't conflict with mentor's Google Calendar
   - Startup selects preferred slot

3. **Slot Confirmation**:
   - Shows selected slot details (day, date, time) to both parties
   - Creates entry in `mentor_startup_sessions` table
   - Status: 'scheduled'

4. **Google Calendar Integration**:
   - Creates event in mentor's Google Calendar
   - Creates event in startup's Google Calendar (if they have Google Calendar connected)
   - Sends calendar invites to both parties
   - Includes Google Meet link (if enabled)

---

## Database Schema Updates Needed

### 1. Update `mentor_requests` table:
```sql
ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS proposed_fee_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS proposed_equity_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS proposed_esop_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS negotiated_fee_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS negotiated_equity_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS negotiated_esop_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'cancelled'));
```

### 2. Create `mentor_availability_slots` table:
```sql
CREATE TABLE IF NOT EXISTS mentor_availability_slots (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    is_recurring BOOLEAN DEFAULT false,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Create `mentor_startup_sessions` table:
```sql
CREATE TABLE IF NOT EXISTS mentor_startup_sessions (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES mentor_startup_assignments(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    timezone TEXT DEFAULT 'UTC',
    status TEXT NOT NULL DEFAULT 'scheduled' 
      CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    google_calendar_event_id TEXT, -- Store Google Calendar event ID
    google_meet_link TEXT, -- Store Google Meet link if created
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Create `google_calendar_integrations` table:
```sql
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('Mentor', 'Startup')),
    google_calendar_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    calendar_sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, user_type)
);
```

---

## Google Calendar Integration Approach

### Recommended: Full Google Calendar Integration

**Why Full Integration?**
1. **Two-way sync**: Check mentor's calendar for conflicts before showing available slots
2. **Automatic event creation**: When startup selects slot, create event in both calendars
3. **Meeting links**: Auto-generate Google Meet links
4. **Reminders**: Google Calendar handles reminders automatically
5. **Timezone handling**: Google Calendar handles timezone conversions
6. **Conflict detection**: Real-time conflict checking
7. **Rescheduling**: Easy to update/cancel events

### Implementation Steps:

1. **OAuth Setup**:
   - Mentor connects Google Calendar (one-time OAuth)
   - Store access_token and refresh_token securely
   - Startup can optionally connect (for receiving invites)

2. **Availability Management**:
   - Mentor sets recurring or one-time availability slots
   - System checks Google Calendar for conflicts
   - Only shows available slots to startup

3. **Booking Flow**:
   - Startup selects slot
   - System creates Google Calendar event
   - Sends invites to both parties
   - Stores event_id for future updates

4. **Session Management**:
   - Both can view scheduled sessions
   - Can reschedule (updates Google Calendar event)
   - Can cancel (removes Google Calendar event)

---

## Component Structure

### 1. Startup Side:
- `SendMentorRequestModal.tsx` - Form to send connect request
- `MentorRequestsList.tsx` - Show pending/negotiating requests
- `ScheduleSessionModal.tsx` - View and select mentor's available slots

### 2. Mentor Side:
- `PendingRequestsList.tsx` - Show pending requests with Accept/Reject/Negotiate
- `ManageAvailabilitySlots.tsx` - Set available time slots
- `ScheduledSessionsList.tsx` - View all scheduled sessions
- `ScheduleSessionModal.tsx` - Create/view/edit sessions

### 3. Shared:
- `GoogleCalendarService.ts` - Handle Google Calendar API calls
- `SessionService.ts` - Handle session CRUD operations

---

## Next Steps

1. Update database schema (add new columns/tables)
2. Create Google Calendar OAuth flow
3. Build availability slot management
4. Implement request flow with fee/equity negotiation
5. Build scheduling UI components
6. Integrate Google Calendar API for event creation
7. Add notifications for both parties


