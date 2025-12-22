# Mentor Scheduling Flow - Complete Implementation

## Overview
This document explains the complete scheduling system where mentors create availability slots (like Google Calendar) and startups can book sessions from those slots.

## Flow Diagram

```
1. MENTOR CREATES AVAILABILITY SLOTS
   ↓
   Mentor Dashboard → "Manage Availability" Button
   ↓
   Opens ManageAvailabilityModal
   ↓
   Mentor can create:
   - Recurring slots (e.g., Every Monday 2-4 PM)
   - One-time slots (e.g., Dec 25, 2024 10-11 AM)
   ↓
   Slots stored in mentor_availability_slots table

2. STARTUP VIEWS AVAILABILITY & BOOKS
   ↓
   Startup Dashboard → "My Services" → Accepted Mentor
   OR
   Mentor Dashboard → "Currently Mentoring" → "Schedule" Button
   ↓
   Opens SchedulingModal
   ↓
   System fetches mentor's active availability slots
   ↓
   Startup selects:
   - Date (from available dates)
   - Time (from available times for that date)
   - Duration
   ↓
   System books session:
   - Creates entry in mentor_startup_sessions
   - Generates Google Meet link (if integrated)
   - Creates Google Calendar event (if mentor has integration)
   ↓
   Both parties see session in "Scheduled Sessions"
```

## Components

### 1. ManageAvailabilityModal (`components/mentor/ManageAvailabilityModal.tsx`)
**Purpose**: Allows mentors to create and manage their availability slots

**Features**:
- Create recurring slots (weekly, e.g., Every Monday 2-4 PM)
- Create one-time slots (specific date and time)
- Set valid from/until dates for slots
- Activate/deactivate slots
- Edit existing slots
- Delete slots
- View all slots in a list

**Slot Types**:
- **Recurring**: Available every week on selected day
  - Example: "Every Monday, 2:00 PM - 4:00 PM"
  - Uses `day_of_week` (0=Sunday, 6=Saturday)
  - `is_recurring = true`
  
- **One-Time**: Available only on a specific date
  - Example: "December 25, 2024, 10:00 AM - 11:00 AM"
  - Uses `specific_date`
  - `is_recurring = false`

**Form Fields**:
- Slot Type (Recurring/One-Time)
- Day of Week (for recurring) OR Specific Date (for one-time)
- Start Time
- End Time
- Valid From (optional)
- Valid Until (optional)
- Timezone

### 2. SchedulingModal (`components/mentor/SchedulingModal.tsx`)
**Purpose**: Allows startups (or mentors) to book sessions from available slots

**Features**:
- Shows available slots for selected date range
- Filters slots by selected date
- Displays available times for selected date
- Books session with selected date/time
- Generates Google Meet link
- Creates Google Calendar event (if mentor has integration)

**User Flow**:
1. Select duration (30, 60, 90, or 120 minutes)
2. Select date (from available dates)
3. Select time (from available times for that date)
4. Click "Book Session"
5. System creates session and generates Meet link

### 3. ScheduledSessionsSection (`components/mentor/ScheduledSessionsSection.tsx`)
**Purpose**: Displays all scheduled sessions for mentor or startup

**Features**:
- Shows upcoming sessions
- Displays session date, time, duration
- Shows Google Meet link (if available)
- Shows session status
- Shows other party's name (startup name for mentor, mentor name for startup)

## Database Tables

### mentor_availability_slots
Stores mentor's available time slots.

**Key Fields**:
- `mentor_id`: UUID (references auth.users)
- `day_of_week`: INTEGER (0-6, NULL for one-time slots)
- `specific_date`: DATE (NULL for recurring slots)
- `start_time`: TIME
- `end_time`: TIME
- `is_recurring`: BOOLEAN
- `valid_from`: DATE (optional)
- `valid_until`: DATE (optional)
- `is_active`: BOOLEAN
- `timezone`: TEXT

**Constraints**:
- Either `day_of_week` OR `specific_date` must be set (not both)
- `end_time` must be after `start_time`

### mentor_startup_sessions
Stores booked sessions between mentors and startups.

**Key Fields**:
- `mentor_id`: UUID
- `startup_id`: INTEGER
- `assignment_id`: INTEGER (references mentor_startup_assignments)
- `session_date`: DATE
- `session_time`: TIME
- `duration_minutes`: INTEGER
- `status`: TEXT ('scheduled', 'completed', 'cancelled', etc.)
- `google_meet_link`: TEXT
- `google_calendar_event_id`: TEXT
- `google_calendar_synced`: BOOLEAN

## Service Functions

### mentorSchedulingService

#### `getAvailabilitySlots(mentorId: string)`
Returns all active availability slots for a mentor.

#### `createAvailabilitySlot(slot: AvailabilitySlot)`
Creates a new availability slot.

#### `updateAvailabilitySlot(slotId: number, updates: Partial<AvailabilitySlot>)`
Updates an existing availability slot.

#### `deleteAvailabilitySlot(slotId: number)`
Deletes an availability slot.

#### `getAvailableSlotsForDateRange(mentorId, startDate, endDate)`
Returns available slots for a date range, excluding already booked sessions.
- Processes recurring slots (generates dates for each week)
- Processes one-time slots
- Filters out conflicts with booked sessions
- Returns array of `{ date, time, slotId }`

#### `bookSession(mentorId, startupId, assignmentId, sessionDate, sessionTime, duration, timezone, googleMeetLink?)`
Books a session:
- Creates entry in `mentor_startup_sessions`
- Sets status to 'scheduled'
- Stores Google Meet link if provided

#### `getMentorSessions(mentorId, status?)`
Returns all sessions for a mentor (optionally filtered by status).

#### `getStartupSessions(startupId, status?)`
Returns all sessions for a startup (optionally filtered by status).

## User Interface Integration

### Mentor Dashboard

#### Availability Management Section
- **Location**: Dashboard tab, above "My Startups" section
- **Button**: "Manage Availability"
- **Action**: Opens `ManageAvailabilityModal`
- **Purpose**: Create and manage availability slots

#### Currently Mentoring Section
- **Action Button**: "Schedule" (only for TMS startups)
- **Action**: Opens `SchedulingModal` for that specific startup
- **Purpose**: Book a session with a specific startup

#### Scheduled Sessions Section
- **Location**: Below "Currently Mentoring" table
- **Purpose**: View all upcoming sessions

### Startup Dashboard

#### My Services Tab
- **Accepted Mentor Connections**: Shows accepted mentors
- **Scheduled Sessions Section**: Shows all sessions with mentors
- **Action**: Can view session details and Google Meet links

## Complete User Journey

### For Mentors:

1. **Set Up Availability**:
   - Go to Dashboard
   - Click "Manage Availability"
   - Create recurring slots (e.g., "Every Monday 2-4 PM")
   - Create one-time slots if needed
   - Set valid from/until dates

2. **Accept Startup Request**:
   - Startup sends connection request
   - Mentor accepts in "Pending Requests"
   - Startup appears in "Currently Mentoring"

3. **Schedule Session** (Optional - can also be done by startup):
   - Click "Schedule" button next to startup
   - Select date and time from available slots
   - Book session
   - Google Meet link generated automatically

4. **View Sessions**:
   - See all scheduled sessions in "Scheduled Sessions" section
   - View Google Meet links
   - Mark sessions as completed after they happen

### For Startups:

1. **Send Connection Request**:
   - Browse mentors in "Explore" tab
   - Click "Connect" on a mentor
   - Fill out request form
   - Send request

2. **Wait for Acceptance**:
   - Request appears in "Requested" tab
   - Status shows "Pending"

3. **After Acceptance**:
   - Request moves to "My Services" tab
   - Mentor appears in "Accepted Mentor Connections"

4. **Book Session**:
   - View mentor's available slots
   - Select date and time
   - Book session
   - Receive Google Meet link

5. **View Sessions**:
   - See all scheduled sessions
   - Access Google Meet links
   - View session details

## Google Calendar Integration

### Automatic Features:
- **Google Meet Link Generation**: Automatically generated when session is booked
- **Calendar Event Creation**: If mentor has Google Calendar connected, event is created automatically
- **Sync Status**: Tracked in `google_calendar_synced` field

### Manual Features:
- Mentors can connect their Google Calendar in settings
- Events sync to mentor's calendar
- Both parties receive notifications

## Key Features

### 1. Slot Management
- ✅ Recurring weekly slots
- ✅ One-time slots
- ✅ Date range validity (valid from/until)
- ✅ Activate/deactivate slots
- ✅ Edit and delete slots

### 2. Conflict Prevention
- ✅ System automatically filters out booked slots
- ✅ Only shows available slots to startups
- ✅ Prevents double-booking

### 3. Timezone Support
- ✅ Each slot has timezone setting
- ✅ Sessions stored with timezone
- ✅ Display adjusted for user's timezone

### 4. Google Meet Integration
- ✅ Automatic link generation
- ✅ Links shown in both dashboards
- ✅ Accessible before and during session

### 5. Session Management
- ✅ View all scheduled sessions
- ✅ Filter by status
- ✅ Mark as completed
- ✅ Cancel sessions
- ✅ Reschedule (future feature)

## Next Steps / Future Enhancements

1. **Email Notifications**: Send email when session is booked
2. **Reminder Notifications**: Remind both parties before session
3. **Rescheduling**: Allow rescheduling of sessions
4. **Session Notes**: Add notes/agenda before session
5. **Feedback**: Collect feedback after session
6. **Calendar Sync**: Two-way sync with Google Calendar
7. **Multiple Timezones**: Better timezone handling and display
8. **Recurring Sessions**: Book recurring sessions automatically
9. **Buffer Time**: Add buffer time between sessions
10. **Custom Duration**: Allow custom duration per slot

## Testing Checklist

- [ ] Mentor can create recurring availability slot
- [ ] Mentor can create one-time availability slot
- [ ] Mentor can edit availability slot
- [ ] Mentor can delete availability slot
- [ ] Mentor can activate/deactivate slots
- [ ] Startup sees only active slots
- [ ] Startup can book session from available slot
- [ ] Booked slots don't appear as available
- [ ] Google Meet link is generated
- [ ] Session appears in both dashboards
- [ ] Session details are correct
- [ ] Timezone is handled correctly
- [ ] Recurring slots generate correct dates
- [ ] One-time slots work correctly
- [ ] Valid from/until dates work correctly




