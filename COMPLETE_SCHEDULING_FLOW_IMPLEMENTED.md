# Complete Scheduling Flow - What We Have Implemented

## 🎯 Overview

We have implemented a **complete mentor-startup scheduling system** that allows mentors to create availability slots and startups to book sessions. The system includes conflict prevention, dual access (mentor and startup), and real-time slot management.

---

## 📋 Complete Flow - Step by Step

### **PHASE 1: Mentor-Startup Connection** (Prerequisite)

```
1. Startup adds Mentor
   ↓
   Location: Services Tab → Explore → Connect with Mentor
   OR
   Location: Cap Table Tab → Add Mentor
   ↓
2. System creates mentor_request (status='pending')
   ↓
3. Mentor sees request in Dashboard → Pending Requests
   ↓
4. Mentor accepts request
   ↓
5. System creates mentor_startup_assignment (status='active')
   ↓
6. Startup appears in:
   - Mentor's "Currently Mentoring" section
   - Startup's "My Services" → Accepted Connections
```

**Database Tables:**
- `mentor_requests` - Tracks connection requests
- `mentor_startup_assignments` - Active mentoring relationships

---

### **PHASE 2: Mentor Creates Availability Slots**

```
STEP 1: Mentor Opens Schedule Tab
   ↓
   Location: Mentor Dashboard → Schedule Tab
   ↓
STEP 2: Mentor Clicks "Manage Availability"
   ↓
   Opens: ManageAvailabilityModal
   ↓
STEP 3: Mentor Creates Slots
   
   Option A: Recurring Slot
   ├─ Day of Week: Monday
   ├─ Start Time: 2:00 PM
   ├─ End Time: 4:00 PM
   ├─ Valid From: (optional)
   ├─ Valid Until: (optional)
   └─ Timezone: UTC
   
   Option B: One-Time Slot
   ├─ Specific Date: Dec 25, 2024
   ├─ Start Time: 10:00 AM
   ├─ End Time: 11:00 AM
   └─ Timezone: UTC
   ↓
STEP 4: System Saves Slot
   ↓
   Table: mentor_availability_slots
   ├─ mentor_id
   ├─ day_of_week (for recurring)
   ├─ specific_date (for one-time)
   ├─ start_time
   ├─ end_time
   ├─ is_recurring (true/false)
   ├─ is_active (true)
   ├─ valid_from (optional)
   └─ valid_until (optional)
```

**Features:**
- ✅ Create recurring weekly slots
- ✅ Create one-time slots
- ✅ Edit existing slots
- ✅ Activate/Deactivate slots
- ✅ Delete slots

---

### **PHASE 3: Booking a Session**

#### **Path A: Mentor Initiates Booking**

```
STEP 1: Mentor Opens "Currently Mentoring" Tab
   ↓
   Location: Mentor Dashboard → Dashboard Tab → Currently Mentoring
   ↓
STEP 2: Mentor Sees Startup List
   ↓
   Shows: All active mentor_startup_assignments
   ↓
STEP 3: Mentor Clicks "Schedule" Button
   ↓
   Next to: Startup name (e.g., "TechStart Inc.")
   ↓
STEP 4: SchedulingModal Opens
   ↓
   System automatically:
   ├─ Fetches mentor's availability slots
   ├─ Fetches already booked sessions
   ├─ Filters out conflicts
   └─ Shows available slots
```

#### **Path B: Startup Initiates Booking**

```
STEP 1: Startup Opens "My Services" Tab
   ↓
   Location: Startup Dashboard → Services Tab → My Services
   ↓
STEP 2: Startup Sees Accepted Mentor Connections
   ↓
   Shows: All accepted mentor_requests
   ↓
STEP 3: Startup Clicks "Schedule" Button
   ↓
   Next to: Mentor name (e.g., "John Doe")
   ↓
STEP 4: SchedulingModal Opens
   ↓
   System automatically:
   ├─ Fetches mentor's availability slots
   ├─ Fetches already booked sessions
   ├─ Filters out conflicts
   └─ Shows available slots
```

---

### **PHASE 4: Slot Selection & Booking**

```
STEP 1: User Sees Available Slots
   ↓
   Modal shows:
   ├─ Date picker (next 30 days)
   ├─ Duration selector (30/60/90/120 minutes)
   └─ Available time slots for selected date
   ↓
STEP 2: User Selects Date
   ↓
   Example: Dec 16, 2024
   ↓
STEP 3: System Shows Available Times
   ↓
   For Dec 16, 2024:
   ├─ 2:00 PM ✅ (available)
   ├─ 2:30 PM ✅ (available)
   ├─ 3:00 PM ✅ (available)
   └─ 3:30 PM ✅ (available)
   ↓
   Note: Already booked times are hidden
   ↓
STEP 4: User Selects Time
   ↓
   Example: 2:00 PM
   ↓
STEP 5: User Clicks "Book Session"
   ↓
STEP 6: System Creates Session
   ↓
   Table: mentor_startup_sessions
   ├─ mentor_id
   ├─ startup_id
   ├─ assignment_id
   ├─ session_date: "2024-12-16"
   ├─ session_time: "14:00:00"
   ├─ duration_minutes: 60
   ├─ status: "scheduled"
   ├─ google_meet_link: (generated)
   └─ timezone: "UTC"
   ↓
STEP 7: Google Calendar Integration (if enabled)
   ↓
   Creates calendar event with Google Meet link
```

---

### **PHASE 5: Conflict Prevention**

```
When User Books Slot:
   ↓
   System checks:
   ├─ Is this slot already booked?
   ├─ Is there a conflict?
   └─ Is the slot still available?
   ↓
   If BOOKED:
   ├─ Slot is filtered out
   ├─ Not shown to other users
   └─ Prevents double-booking
   ↓
   If AVAILABLE:
   ├─ Slot is shown
   ├─ User can book
   └─ Slot becomes unavailable after booking
```

**How It Works:**
1. System fetches all `mentor_startup_sessions` with `status='scheduled'`
2. Creates a `Set` of booked times: `{date}T{time}`
3. When generating available slots, checks if `{date}T{time}` is in the Set
4. Only shows slots that are NOT in the booked Set

**Example:**
```
Mentor has: Every Monday, 2:00 PM - 4:00 PM

Available slots for Dec 16:
- 2:00 PM ✅
- 2:30 PM ✅
- 3:00 PM ✅
- 3:30 PM ✅

Startup A books: Dec 16, 2:00 PM

Now available for Startup B:
- 2:00 PM ❌ (booked, filtered out)
- 2:30 PM ✅
- 3:00 PM ✅
- 3:30 PM ✅
```

---

### **PHASE 6: Viewing Scheduled Sessions**

#### **Mentor View**

```
Location: Mentor Dashboard → Schedule Tab → Upcoming Sessions
   ↓
   Shows:
   ├─ All sessions where mentor_id = current mentor
   ├─ Status: scheduled, completed, cancelled
   ├─ Date, Time, Duration
   ├─ Startup name
   └─ Google Meet link
```

#### **Startup View**

```
Location: Startup Dashboard → Services Tab → My Services
   ↓
   Shows:
   ├─ All sessions where startup_id = current startup
   ├─ Status: scheduled, completed, cancelled
   ├─ Date, Time, Duration
   ├─ Mentor name
   └─ Google Meet link
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MENTOR-STARTUP CONNECTION                 │
├─────────────────────────────────────────────────────────────┤
│  1. Startup adds Mentor                                     │
│  2. mentor_request created (pending)                        │
│  3. Mentor accepts                                          │
│  4. mentor_startup_assignment created (active)             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  MENTOR CREATES SLOTS                        │
├─────────────────────────────────────────────────────────────┤
│  Schedule Tab → Manage Availability                         │
│  ├─ Create Recurring: Every Monday, 2-4 PM                 │
│  └─ Create One-Time: Dec 25, 10-11 AM                      │
│  Saved in: mentor_availability_slots                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    BOOKING INITIATION                        │
├─────────────────────────────────────────────────────────────┤
│  Option A: Mentor clicks "Schedule" (Currently Mentoring)   │
│  Option B: Startup clicks "Schedule" (My Services)         │
│  ↓                                                           │
│  SchedulingModal opens                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  SYSTEM FETCHES SLOTS                        │
├─────────────────────────────────────────────────────────────┤
│  1. Get mentor's availability slots                        │
│  2. Get already booked sessions                             │
│  3. Filter by date range (next 30 days)                     │
│  4. Filter out booked slots (conflict prevention)           │
│  5. Generate available time slots                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER SELECTS SLOT                        │
├─────────────────────────────────────────────────────────────┤
│  1. User selects date (Dec 16, 2024)                      │
│  2. User sees available times (2:00 PM, 2:30 PM...)        │
│  3. User selects time (2:00 PM)                            │
│  4. User clicks "Book Session"                              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    SESSION CREATED                          │
├─────────────────────────────────────────────────────────────┤
│  mentor_startup_sessions                                    │
│  ├─ session_date: "2024-12-16"                             │
│  ├─ session_time: "14:00:00"                                │
│  ├─ status: "scheduled"                                     │
│  ├─ google_meet_link: (generated)                          │
│  └─ Google Calendar event created (if enabled)             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  SLOT BECOMES UNAVAILABLE                    │
├─────────────────────────────────────────────────────────────┤
│  That slot (Dec 16, 2:00 PM) is now BOOKED                 │
│  ↓                                                           │
│  When other users try to book:                              │
│  ├─ System checks booked sessions                           │
│  ├─ Dec 16, 2:00 PM is filtered out                        │
│  └─ Other users don't see that slot                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Tables Used

### 1. `mentor_availability_slots`
**Purpose:** Stores mentor's available time slots

**Key Fields:**
- `mentor_id` - Which mentor
- `day_of_week` - For recurring slots (0=Sunday, 6=Saturday)
- `specific_date` - For one-time slots
- `start_time` - Slot start time
- `end_time` - Slot end time
- `is_recurring` - true/false
- `is_active` - true/false
- `valid_from` - Optional start date
- `valid_until` - Optional end date

### 2. `mentor_startup_sessions`
**Purpose:** Stores booked sessions

**Key Fields:**
- `mentor_id` - Which mentor
- `startup_id` - Which startup
- `assignment_id` - Links to mentor_startup_assignments
- `session_date` - Date of session
- `session_time` - Time of session
- `duration_minutes` - Session duration
- `status` - scheduled, completed, cancelled, etc.
- `google_meet_link` - Meeting link
- `google_calendar_event_id` - Calendar event ID

### 3. `mentor_startup_assignments`
**Purpose:** Active mentoring relationships

**Key Fields:**
- `mentor_id` - Which mentor
- `startup_id` - Which startup
- `status` - active, completed, cancelled

### 4. `mentor_requests`
**Purpose:** Connection requests

**Key Fields:**
- `mentor_id` - Which mentor
- `startup_id` - Which startup
- `status` - pending, accepted, rejected

---

## ✨ Key Features Implemented

### ✅ **Dual Access**
- **Mentors** can schedule from "Currently Mentoring" tab
- **Startups** can schedule from "My Services" tab
- Both use the same `SchedulingModal` component

### ✅ **Conflict Prevention**
- Booked slots are automatically filtered out
- Uses `bookedTimes` Set to track conflicts
- Prevents double-booking
- Real-time availability updates

### ✅ **Slot Management**
- Create recurring weekly slots
- Create one-time slots
- Edit, activate, deactivate, delete slots
- Date range validation

### ✅ **Session Management**
- View upcoming sessions
- View past sessions
- Google Meet link generation
- Google Calendar integration (optional)

### ✅ **User Experience**
- Clean, intuitive UI
- Date picker for easy selection
- Time slot grid display
- Real-time slot availability
- Error handling and validation

---

## 📍 UI Locations

### **Mentor Dashboard**

1. **Schedule Tab**
   - Manage Availability (create/edit slots)
   - Upcoming Sessions
   - Past Sessions

2. **Dashboard Tab → Currently Mentoring**
   - List of active startups
   - "Schedule" button next to each startup

### **Startup Dashboard**

1. **Services Tab → My Services**
   - List of accepted mentor connections
   - "Schedule" button next to each mentor
   - Upcoming Sessions section

---

## 🔧 Technical Implementation

### **Components**

1. **ManageAvailabilityModal**
   - Location: `components/mentor/ManageAvailabilityModal.tsx`
   - Purpose: Create/edit availability slots

2. **SchedulingModal**
   - Location: `components/mentor/SchedulingModal.tsx`
   - Purpose: Book sessions from available slots

3. **ScheduledSessionsSection**
   - Location: `components/mentor/ScheduledSessionsSection.tsx`
   - Purpose: Display upcoming sessions

4. **PastSessionsSection**
   - Location: `components/mentor/PastSessionsSection.tsx`
   - Purpose: Display past sessions

### **Services**

1. **mentorSchedulingService**
   - Location: `lib/mentorSchedulingService.ts`
   - Functions:
     - `getAvailabilitySlots()` - Get mentor's slots
     - `createAvailabilitySlot()` - Create new slot
     - `updateAvailabilitySlot()` - Update existing slot
     - `deleteAvailabilitySlot()` - Delete slot
     - `getAvailableSlotsForDateRange()` - Get available slots for booking
     - `bookSession()` - Book a session
     - `getMentorSessions()` - Get mentor's sessions
     - `getStartupSessions()` - Get startup's sessions

---

## 🎯 Summary

### **What We Have Implemented:**

✅ **Complete slot creation system**
- Recurring and one-time slots
- Full CRUD operations

✅ **Dual booking access**
- Mentors can book for startups
- Startups can book for themselves

✅ **Conflict prevention**
- Automatic filtering of booked slots
- Real-time availability updates

✅ **Session management**
- View upcoming and past sessions
- Google Meet integration
- Google Calendar integration

✅ **User-friendly UI**
- Clean, intuitive interface
- Easy slot selection
- Clear feedback

### **The Flow Works Like This:**

1. **Mentor creates slots** → Saved in database
2. **User clicks "Schedule"** → Modal opens
3. **System fetches slots** → Filters out conflicts
4. **User selects slot** → Books session
5. **Session created** → Slot becomes unavailable
6. **Other users see updated availability** → No conflicts

---

## 🚀 Ready to Use!

The complete scheduling flow is **fully implemented and functional**. Both mentors and startups can create slots, book sessions, and manage their schedules seamlessly! 🎉

