# Step-by-Step Testing Guide - Mentor-Startup Connection Flow

## 🧪 Complete Testing Guide

This guide will walk you through testing the entire mentor-startup connection flow step by step.

---

## 📋 Pre-Testing Checklist

Before starting, ensure:

- [ ] Code is deployed to Vercel
- [ ] Environment variables are set in Vercel:
  - [ ] `GOOGLE_SERVICE_ACCOUNT_KEY`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`
- [ ] Database tables are created (all SQL files executed)
- [ ] You have access to:
  - [ ] A mentor account
  - [ ] A startup account
  - [ ] Both accounts can log in

---

## 🧪 TEST 1: Startup Sends Connect Request

### Step 1.1: Login as Startup
1. Log in to your application as a **Startup** user
2. Navigate to **Services** tab
3. Click on **"Explore"** sub-tab

### Step 1.2: Find a Mentor
1. You should see different profile types (Investor, Mentor, CA, CS, etc.)
2. **Note:** The "Connect" button needs to be added to the explore page
3. For now, you can test by:
   - Finding a mentor's profile URL
   - Or manually creating a request via the database

### Step 1.3: Send Connect Request (Manual Test)
**Option A: Via UI (if Connect button is added)**
1. Click "Connect" button on a mentor
2. Fill in the form:
   - Message (optional): "I'd like to connect with you"
   - Proposed Fee Amount: 1000 (if mentor charges fees)
   - Proposed Equity Amount: 5000 (if applicable)
   - Proposed ESOP %: 2.5 (if applicable)
3. Click "Send Request"

**Option B: Via Database (for quick testing)**
```sql
-- Insert a test request
INSERT INTO mentor_requests (
  mentor_id,
  requester_id,
  requester_type,
  startup_id,
  status,
  message,
  proposed_fee_amount,
  proposed_equity_amount,
  proposed_esop_percentage
) VALUES (
  'mentor_user_id_here',
  'startup_user_id_here',
  'Startup',
  startup_id_here,
  'pending',
  'Test connection request',
  1000.00,
  5000.00,
  2.5
);
```

### ✅ Expected Result:
- Request appears in mentor's "Pending Requests" section
- Request has status = 'pending'
- Proposed amounts are stored correctly

---

## 🧪 TEST 2: Mentor Sees and Manages Request

### Step 2.1: Login as Mentor
1. Log in as the **Mentor** user
2. Navigate to **Dashboard** tab
3. Scroll to **"Pending Requests"** section

### Step 2.2: View Request
**Expected to see:**
- ✅ Startup name
- ✅ Startup website
- ✅ Startup sector
- ✅ Message from startup
- ✅ Proposed fee amount (if provided)
- ✅ Proposed equity amount (if provided)
- ✅ Proposed ESOP % (if provided)
- ✅ Request date
- ✅ Three action buttons: **Accept**, **Reject**, **Negotiate**

### Step 2.3: Test Accept Action
1. Click **"Accept"** button
2. Confirm in the popup
3. **Expected Result:**
   - ✅ Request status changes to 'accepted'
   - ✅ New entry created in `mentor_startup_assignments`
   - ✅ Startup appears in "Currently Mentoring" section
   - ✅ `from_date` is set to current date

### Step 2.4: Test Reject Action (Create new request first)
1. Create another test request (via database or UI)
2. Click **"Reject"** button
3. Confirm in the popup
4. **Expected Result:**
   - ✅ Request status changes to 'rejected'
   - ✅ No assignment created
   - ✅ Request removed from Pending Requests

### Step 2.5: Test Negotiate Action
1. Create another test request
2. Click **"Negotiate"** button
3. Fill in counter-proposal:
   - Negotiated Fee Amount: 1500
   - Negotiated Equity Amount: 6000
   - Negotiated ESOP %: 3.0
4. Click **"Send Negotiation"**
5. **Expected Result:**
   - ✅ Request status changes to 'negotiating'
   - ✅ Negotiated amounts stored in database
   - ✅ Request moves to "Negotiating Requests" section
   - ✅ Startup can see the negotiation

---

## 🧪 TEST 3: Startup Views Request Status

### Step 3.1: Login as Startup
1. Log in as the **Startup** user
2. Navigate to **Services** tab
3. Click on **"Requested"** sub-tab

### Step 3.2: View Request Status
**Expected to see:**
- ✅ All requests sent by this startup
- ✅ Status badges: Pending, Negotiating, Accepted, Rejected
- ✅ Original proposal amounts
- ✅ Mentor's counter-proposal (if negotiating)

### Step 3.3: Test Accept Negotiation
1. Find a request with status = 'negotiating'
2. Click **"Accept Negotiation"** button
3. Confirm in the popup
4. **Expected Result:**
   - ✅ Request status changes to 'accepted'
   - ✅ Assignment created with negotiated amounts
   - ✅ Startup appears in mentor's "Currently Mentoring"

### Step 3.4: Test Reject Negotiation
1. Create another negotiating request
2. Click **"Reject"** button
3. Confirm in the popup
4. **Expected Result:**
   - ✅ Request status changes to 'rejected'
   - ✅ Request closed

---

## 🧪 TEST 4: Schedule Session

### Step 4.1: Login as Mentor
1. Log in as **Mentor**
2. Navigate to **Dashboard** → **My Startups**
3. Click on **"Currently Mentoring"** tab
4. Find a startup with `startup_id` (TMS startup)

### Step 4.2: Click Schedule Button
1. Find a startup in the "Currently Mentoring" table
2. Click **"Schedule"** button (only visible for TMS startups)
3. **Expected Result:**
   - ✅ Scheduling modal opens
   - ✅ Shows duration selector
   - ✅ Shows date picker
   - ✅ Shows available time slots (if mentor has set availability)

### Step 4.3: Book a Session
1. Select duration: 60 minutes
2. Select a date (tomorrow or later)
3. Select a time slot
4. Click **"Book Session"**
5. **Expected Result:**
   - ✅ Session created in `mentor_startup_sessions` table
   - ✅ Google Meet link generated (if API is working)
   - ✅ `google_meet_link` stored in database
   - ✅ Modal closes
   - ✅ Session appears in both dashboards

### Step 4.4: Verify Session Created
**Check Database:**
```sql
SELECT * FROM mentor_startup_sessions 
WHERE mentor_id = 'your_mentor_id' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
- ✅ `session_date` = selected date
- ✅ `session_time` = selected time
- ✅ `duration_minutes` = 60
- ✅ `status` = 'scheduled'
- ✅ `google_meet_link` = valid Meet link (if API working)

---

## 🧪 TEST 5: View Scheduled Sessions

### Step 5.1: View in Mentor Dashboard
1. As **Mentor**, go to **My Startups** → **Currently Mentoring**
2. Scroll down to **"Scheduled Sessions"** section
3. **Expected to see:**
   - ✅ Session date and time
   - ✅ Duration
   - ✅ Google Meet link (if generated)
   - ✅ "Join" button (opens Meet link)
   - ✅ "Copy" button (copies link)

### Step 5.2: View in Startup Dashboard
1. As **Startup**, go to **Services** → **My Services**
2. Scroll to **"Scheduled Sessions"** section
3. **Expected to see:**
   - ✅ Same session details
   - ✅ Same Google Meet link
   - ✅ "Join" and "Copy" buttons

### Step 5.3: Test Google Meet Link
1. Click **"Join"** button
2. **Expected Result:**
   - ✅ Opens Google Meet link in new tab
   - ✅ Link is valid and accessible

3. Click **"Copy"** button
4. **Expected Result:**
   - ✅ Link copied to clipboard
   - ✅ Button shows "Copied" confirmation

---

## 🧪 TEST 6: Google Meet Link Generation

### Step 6.1: Test API Endpoint Directly
**Using curl or Postman:**
```bash
curl -X POST https://yourdomain.vercel.app/api/google-calendar?action=generate-meet-link \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx"
}
```

### Step 6.2: Test via Booking Flow
1. Book a new session (as in Test 4)
2. Check if Meet link is generated
3. **Expected:**
   - ✅ Meet link appears in session details
   - ✅ Link is valid Google Meet URL
   - ✅ Both parties see the same link

---

## 🧪 TEST 7: Complete End-to-End Flow

### Full Flow Test:
1. **Startup** → Send connect request with fee/equity
2. **Mentor** → See request in Pending Requests
3. **Mentor** → Negotiate with counter-proposal
4. **Startup** → See negotiation in Requested tab
5. **Startup** → Accept negotiation
6. **Mentor** → See startup in Currently Mentoring
7. **Mentor** → Click Schedule button
8. **Mentor** → Book a session
9. **Both** → See session with Google Meet link
10. **Both** → Can join/copy Meet link

**Expected:** All steps work smoothly end-to-end ✅

---

## 🐛 Troubleshooting

### Issue: Request not appearing
**Check:**
- Database: Is request in `mentor_requests` table?
- User IDs: Are `mentor_id` and `requester_id` correct?
- Status: Is status = 'pending'?

### Issue: Schedule button not showing
**Check:**
- Is `assignment.startup` not null? (Only TMS startups show Schedule button)
- Is startup in "Currently Mentoring" tab?

### Issue: Google Meet link not generating
**Check:**
- Environment variables set in Vercel?
- API endpoint working? Test directly
- Check browser console for errors
- Check Vercel function logs

### Issue: Sessions not appearing
**Check:**
- Database: Is session in `mentor_startup_sessions` table?
- User IDs: Are `mentor_id` and `startup_id` correct?
- Status: Is status = 'scheduled'?

---

## ✅ Testing Checklist

### Request Flow:
- [ ] Startup can send request
- [ ] Mentor sees request
- [ ] Mentor can accept
- [ ] Mentor can reject
- [ ] Mentor can negotiate
- [ ] Startup sees negotiation
- [ ] Startup can accept negotiation
- [ ] Startup can reject negotiation
- [ ] Accepted requests move to Currently Mentoring

### Scheduling Flow:
- [ ] Schedule button appears for TMS startups
- [ ] Scheduling modal opens
- [ ] Can select date and time
- [ ] Can book session
- [ ] Session appears in database
- [ ] Google Meet link generated
- [ ] Session appears in mentor dashboard
- [ ] Session appears in startup dashboard
- [ ] Meet link is same for both
- [ ] Join button works
- [ ] Copy button works

---

## 📝 Test Data Setup

### Create Test Mentor:
```sql
-- Get a mentor user ID
SELECT id, email FROM auth.users WHERE role = 'Mentor' LIMIT 1;
```

### Create Test Startup:
```sql
-- Get a startup user ID
SELECT id, email FROM auth.users WHERE role = 'Startup' LIMIT 1;

-- Get startup ID
SELECT id FROM startups WHERE user_id = 'startup_user_id' LIMIT 1;
```

### Create Test Request:
```sql
INSERT INTO mentor_requests (
  mentor_id,
  requester_id,
  requester_type,
  startup_id,
  status,
  message,
  proposed_fee_amount,
  proposed_equity_amount
) VALUES (
  'mentor_user_id',
  'startup_user_id',
  'Startup',
  startup_id,
  'pending',
  'Test request for testing',
  1000.00,
  5000.00
);
```

---

## 🎯 Quick Test Scenarios

### Scenario 1: Happy Path
1. Startup sends request → Mentor accepts → Schedule session → Both see Meet link
2. **Expected:** Everything works ✅

### Scenario 2: Negotiation Path
1. Startup sends request → Mentor negotiates → Startup accepts → Schedule session
2. **Expected:** Negotiated amounts used ✅

### Scenario 3: Rejection Path
1. Startup sends request → Mentor rejects
2. **Expected:** Request closed, no assignment created ✅

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________

Phase 1: Startup Sends Request
- [ ] Pass / [ ] Fail
- Notes: ___________

Phase 2: Mentor Manages Request
- [ ] Pass / [ ] Fail
- Notes: ___________

Phase 3: Startup Views Status
- [ ] Pass / [ ] Fail
- Notes: ___________

Phase 4: Schedule Session
- [ ] Pass / [ ] Fail
- Notes: ___________

Phase 5: View Sessions
- [ ] Pass / [ ] Fail
- Notes: ___________

Phase 6: Google Meet Links
- [ ] Pass / [ ] Fail
- Notes: ___________

Overall: [ ] All Pass / [ ] Issues Found
```

---

**Ready to start testing!** Follow each test step by step and check off items as you go. 🧪✅

