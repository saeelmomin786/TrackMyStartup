# Schedule Button Flow - Mentor Dashboard

## 📍 Location

**Mentor Dashboard → Dashboard Tab → Currently Mentoring Section → Schedule Button**

The Schedule button appears next to each startup in the "Currently Mentoring" table.

---

## 🔄 Complete Flow When Mentor Clicks "Schedule"

### **STEP 1: Mentor Clicks "Schedule" Button**

```
Location: Mentor Dashboard → Dashboard Tab → Currently Mentoring
   ↓
Table shows: List of active mentor_startup_assignments
   ↓
Each row has: Startup name, ESOP %, Actions column
   ↓
In Actions column: [Schedule] button (green, with Video icon)
   ↓
Mentor clicks: "Schedule" button next to a startup
```

**Code Location:** `components/MentorView.tsx` (lines 806-817)

```tsx
{assignment.startup && (
  <Button
    size="sm"
    variant="outline"
    className="text-green-600 border-green-300 hover:bg-green-50"
    onClick={() => {
      setSelectedAssignmentForScheduling(assignment);
      setSchedulingModalOpen(true);
    }}
  >
    <Video className="mr-1 h-3 w-3" /> Schedule
  </Button>
)}
```

**What Happens:**
1. Sets `selectedAssignmentForScheduling` = the clicked assignment
2. Sets `schedulingModalOpen` = true
3. This triggers the `SchedulingModal` to open

---

### **STEP 2: SchedulingModal Opens**

**Code Location:** `components/MentorView.tsx` (lines 2018-2036)

```tsx
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
    onSessionBooked={async () => {
      // Reload metrics after booking
      if (currentUser?.id) {
        const metrics = await mentorService.getMentorMetrics(currentUser.id);
        setMentorMetrics(metrics);
      }
    }}
  />
)}
```

**Props Passed:**
- `mentorId` = Current mentor's user ID
- `startupId` = The startup's ID from the assignment
- `assignmentId` = The mentor_startup_assignment ID
- `onSessionBooked` = Callback to reload metrics after booking

---

### **STEP 3: Modal Loads Available Slots**

**Code Location:** `components/mentor/SchedulingModal.tsx` (lines 46-50)

```tsx
useEffect(() => {
  if (isOpen && mentorId) {
    loadAvailableSlots();
  }
}, [isOpen, mentorId, startDate, endDate]);
```

**What Happens:**
1. When modal opens, `useEffect` triggers
2. Calls `loadAvailableSlots()` function
3. Fetches slots for the next 30 days (from tomorrow)

---

### **STEP 4: System Fetches Available Slots**

**Code Location:** `components/mentor/SchedulingModal.tsx` (lines 52-71)

```tsx
const loadAvailableSlots = async () => {
  setIsLoading(true);
  setError(null);
  try {
    console.log('🔍 Loading available slots:', { mentorId, startDate, endDate });
    const slots = await mentorSchedulingService.getAvailableSlotsForDateRange(
      mentorId,
      startDate,  // Tomorrow
      endDate     // 30 days from now
    );
    console.log('✅ Loaded slots:', slots.length, slots);
    setAvailableSlots(slots);
    
    if (slots.length === 0) {
      console.warn('⚠️ No slots found. Check if mentor has created availability slots.');
    }
  } catch (err: any) {
    console.error('❌ Error loading slots:', err);
    setError(err.message || 'Failed to load available slots');
  } finally {
    setIsLoading(false);
  }
};
```

**What the System Does:**
1. Calls `mentorSchedulingService.getAvailableSlotsForDateRange()`
2. Passes:
   - `mentorId` - Current mentor's ID
   - `startDate` - Tomorrow's date
   - `endDate` - 30 days from now
3. Service fetches:
   - All mentor's availability slots (recurring + one-time)
   - Already booked sessions
   - Filters out conflicts
4. Returns available slots array
5. Sets `availableSlots` state

---

### **STEP 5: User Sees Available Slots**

**Modal UI Shows:**
```
┌─────────────────────────────────────┐
│  Schedule Session                   │
├─────────────────────────────────────┤
│  Duration (minutes): [60 ▼]        │
│                                     │
│  Select Date: [📅 Date Picker]     │
│                                     │
│  Available Times:                   │
│  [2:00 PM] [2:30 PM] [3:00 PM]     │
│  [3:30 PM]                          │
│                                     │
│  Selected:                          │
│  📅 Dec 16, 2024 (Monday)          │
│  🕐 2:00 PM (60 minutes)           │
│  🎥 Google Meet link will be        │
│     generated after booking         │
│                                     │
│  [Cancel]  [Book Session]          │
└─────────────────────────────────────┘
```

**Code Location:** `components/mentor/SchedulingModal.tsx` (lines 132-205)

**Features:**
- Duration selector (30/60/90/120 minutes)
- Date picker (shows next 30 days)
- Available time slots for selected date
- Visual confirmation of selection

---

### **STEP 6: User Selects Date & Time**

**User Actions:**
1. Selects date from date picker (e.g., Dec 16, 2024)
2. System filters slots for that date
3. User sees available times (e.g., 2:00 PM, 2:30 PM, 3:00 PM)
4. User clicks on a time slot (e.g., 2:00 PM)
5. Selection is highlighted

**Code Logic:**
```tsx
const slotsForSelectedDate = availableSlots.filter(slot => slot.date === selectedDate);

// When user selects a time
onClick={() => setSelectedTime(slot.time)}
```

---

### **STEP 7: User Clicks "Book Session"**

**Code Location:** `components/mentor/SchedulingModal.tsx` (lines 69-130)

```tsx
const handleBookSession = async () => {
  if (!selectedDate || !selectedTime) {
    setError('Please select a date and time');
    return;
  }

  setIsBooking(true);
  setError(null);

  try {
    // Generate Google Meet link first
    let meetLink: string | undefined;
    try {
      meetLink = await googleCalendarService.generateGoogleMeetLink();
    } catch (err) {
      console.warn('Failed to generate Google Meet link, continuing without it:', err);
    }

    // Book the session
    await mentorSchedulingService.bookSession(
      mentorId,
      startupId,
      assignmentId,
      selectedDate,
      selectedTime,
      duration,
      'UTC',
      meetLink
    );

    // If mentor has Google Calendar, create event
    try {
      const integration = await googleCalendarService.getIntegration(mentorId, 'Mentor');
      if (integration && integration.calendar_sync_enabled) {
        const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
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
        });
      }
    } catch (err) {
      console.warn('Failed to create Google Calendar event, continuing:', err);
    }

    onSessionBooked();
    onClose();
  } catch (err: any) {
    setError(err.message || 'Failed to book session. Please try again.');
  } finally {
    setIsBooking(false);
  }
};
```

**What Happens:**
1. Validates date and time are selected
2. Generates Google Meet link
3. Calls `mentorSchedulingService.bookSession()` with:
   - `mentorId` - Current mentor
   - `startupId` - Selected startup
   - `assignmentId` - The assignment ID
   - `selectedDate` - Chosen date
   - `selectedTime` - Chosen time
   - `duration` - Selected duration
   - `meetLink` - Google Meet link
4. Creates Google Calendar event (if enabled)
5. Calls `onSessionBooked()` callback
6. Closes modal

---

### **STEP 8: Session Created in Database**

**Database Table:** `mentor_startup_sessions`

**Record Created:**
```sql
INSERT INTO mentor_startup_sessions (
  mentor_id,           -- Current mentor's ID
  startup_id,          -- Selected startup's ID
  assignment_id,      -- The assignment ID
  session_date,        -- "2024-12-16"
  session_time,        -- "14:00:00"
  duration_minutes,    -- 60
  status,              -- "scheduled"
  google_meet_link,     -- Generated link
  timezone             -- "UTC"
)
```

---

### **STEP 9: Modal Closes & Metrics Reload**

**After Booking:**
1. Modal closes
2. `onSessionBooked()` callback executes
3. Reloads mentor metrics:
   ```tsx
   const metrics = await mentorService.getMentorMetrics(currentUser.id);
   setMentorMetrics(metrics);
   ```
4. Dashboard updates with new session count

---

## 🎯 Key Points

### **1. Button Visibility**
- Schedule button only shows if `assignment.startup` exists
- Only for TMS startups (not manual entries)

### **2. Data Passed**
- `mentorId` = Current mentor (from `currentUser?.id`)
- `startupId` = From the assignment
- `assignmentId` = The assignment ID (links to `mentor_startup_assignments`)

### **3. Slot Fetching**
- Fetches slots for next 30 days
- Automatically filters out booked slots
- Shows only available times

### **4. Booking Process**
- Validates selection
- Generates Google Meet link
- Creates session record
- Creates Google Calendar event (optional)
- Updates dashboard metrics

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────┐
│  Mentor Dashboard                       │
│  Dashboard Tab → Currently Mentoring   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Startup Name | ESOP % | Actions  │ │
│  │ TechStart Inc | 2.5%  | [Schedule]│ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
              ↓ (Click)
┌─────────────────────────────────────────┐
│  State Updated:                         │
│  - selectedAssignmentForScheduling      │
│  - schedulingModalOpen = true            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  SchedulingModal Opens                  │
│  ├─ mentorId: current mentor           │
│  ├─ startupId: from assignment        │
│  └─ assignmentId: assignment ID       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  System Fetches Slots                   │
│  ├─ Get availability slots              │
│  ├─ Get booked sessions                 │
│  ├─ Filter conflicts                    │
│  └─ Show available slots               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  User Selects:                          │
│  ├─ Date: Dec 16, 2024                 │
│  ├─ Time: 2:00 PM                      │
│  └─ Duration: 60 minutes               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  User Clicks "Book Session"             │
│  ├─ Generate Google Meet link          │
│  ├─ Create session record              │
│  ├─ Create calendar event (optional)    │
│  └─ Close modal                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Session Created:                       │
│  mentor_startup_sessions                │
│  ├─ status: "scheduled"                 │
│  ├─ google_meet_link: (generated)      │
│  └─ All details saved                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Dashboard Updates:                     │
│  ├─ Metrics reloaded                    │
│  ├─ Session count updated               │
│  └─ Ready for next booking              │
└─────────────────────────────────────────┘
```

---

## ✅ Summary

**When Mentor Clicks "Schedule" Button:**

1. ✅ Modal opens with scheduling interface
2. ✅ System fetches mentor's available slots (next 30 days)
3. ✅ Filters out already booked slots
4. ✅ User selects date and time
5. ✅ User clicks "Book Session"
6. ✅ Session created in database
7. ✅ Google Meet link generated
8. ✅ Calendar event created (if enabled)
9. ✅ Modal closes
10. ✅ Dashboard metrics updated

**The button is fully functional and ready to use!** 🎉



