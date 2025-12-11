# 🎯 **Complete Investment Advisor Startup Management Flow**

## 📋 **Table of Contents**
1. [Overview](#overview)
2. [Adding Startups](#adding-startups)
3. [Inviting Startups](#inviting-startups)
4. [Duplicate Detection & Handling](#duplicate-detection--handling)
5. [Permission Request System](#permission-request-system)
6. [Registration & Auto-Linking](#registration--auto-linking)
7. [Logo Replacement](#logo-replacement)
8. [Complete Flow Diagrams](#complete-flow-diagrams)

---

## 🎯 **Overview**

The Investment Advisor system manages startups through two main flows:
1. **Manual Addition**: Advisor adds startup details manually
2. **Invite to TMS**: Advisor invites startup to join TMS platform

The system handles:
- ✅ Duplicate detection (by email and name)
- ✅ Permission requests for existing startups
- ✅ Auto-linking for invited startups
- ✅ Conflict resolution (startups already linked to other advisors)
- ✅ Logo replacement for all linked startups

---

## 📝 **Adding Startups**

### **Flow: Advisor Adds Startup Manually**

```
1. Advisor clicks "Add Startup" → Fills form → Clicks "Save"
   ↓
2. System checks for duplicates:
   ├─ Check by email (contact_email)
   └─ Check by name (startup_name)
   ↓
3. Duplicate Detection Results:
   ├─ NO DUPLICATE FOUND
   │  └─ ✅ Creates entry in `advisor_added_startups`
   │     Status: `is_on_tms = false`, `invite_status = 'not_sent'`
   │
   ├─ DUPLICATE FOUND - Same Advisor
   │  └─ ✅ Updates existing entry (if same advisor)
   │
   ├─ DUPLICATE FOUND - Different Advisor
   │  └─ ❌ Shows error: "Startup already linked with another Investment Advisor"
   │     Message: "Please contact the startup directly to change their Investment Advisor code"
   │     Does NOT create entry
   │
   └─ DUPLICATE FOUND - No Advisor Linked
      └─ ✅ Creates entry + Permission Request
         Status: `is_on_tms = false`, `invite_status = 'not_sent'`
         Creates: `advisor_startup_link_requests` entry
```

### **Duplicate Detection Logic**

```typescript
// In advisorAddedStartupService.createStartup()

1. Check by Email:
   - Query `users` table: `email = contact_email AND role = 'Startup'`
   - If found → Get `investment_advisor_code_entered`
   
2. Check by Name:
   - Query `startups` table: `name = startup_name`
   - If found → Get `user_id` → Check `users.investment_advisor_code_entered`

3. Decision Tree:
   IF startup exists on TMS:
      IF already linked to SAME advisor:
         → Allow update (same advisor managing)
      ELSE IF already linked to DIFFERENT advisor:
         → ❌ REJECT: Show error message
      ELSE IF no advisor linked:
         → ✅ Create entry + Permission Request
   ELSE:
      → ✅ Create new entry (not on TMS yet)
```

---

## 📧 **Inviting Startups**

### **Flow: Advisor Invites Startup to TMS**

```
1. Advisor clicks "Invite to TMS" on added startup
   ↓
2. System calls API: `/api/invite-startup-advisor`
   ↓
3. API checks if startup exists on TMS:
   ├─ Check by email in `users` table
   └─ Check by name in `startups` table
   ↓
4. Decision Tree:
   ├─ USER DOES NOT EXIST
   │  └─ ✅ NEW USER FLOW:
   │     ├─ Invite via Supabase Admin: `supabaseAdmin.auth.admin.inviteUserByEmail()`
   │     ├─ Set user metadata:
   │     │  - `role: 'Startup'`
   │     │  - `source: 'advisor_invite'`
   │     │  - `investment_advisor_code_entered: advisorCode`
   │     │  - `skip_form1: true`
   │     ├─ Set redirect: `/complete-registration?page=complete-registration&advisorCode=${advisorCode}`
   │     ├─ Upsert `users` table:
   │     │  - `role: 'Startup'`
   │     │  - `startup_name: startupName`
   │     │  - `investment_advisor_code_entered: advisorCode`
   │     │  - `is_verified: true`
   │     ├─ Insert `startups` table:
   │     │  - `name: startupName`
   │     │  - `user_id: userId`
   │     │  - `investment_advisor_code: advisorCode`
   │     │  - `is_verified: true`
   │     └─ Update `advisor_added_startups`:
   │        - `invite_status: 'sent'`
   │        - `invite_sent_at: now()`
   │        - `invited_user_id: userId`
   │        - `invited_email: contactEmail`
   │
   ├─ USER EXISTS - Same Advisor
   │  └─ ✅ ALREADY LINKED:
   │     ├─ Update `advisor_added_startups`:
   │     │  - `is_on_tms: true`
   │     │  - `tms_startup_id: startupId`
   │     │  - `invite_status: 'accepted'`
   │     └─ Return: "Startup already linked to your account!"
   │
   ├─ USER EXISTS - Different Advisor
   │  └─ ❌ CONFLICT:
   │     ├─ Get existing advisor name
   │     ├─ Update `advisor_added_startups`:
   │     │  - `is_on_tms: false`
   │     │  - `tms_startup_id: startupId`
   │     │  - `invite_status: 'not_sent'`
   │     └─ Return: "This startup is already managed by [Advisor Name]. Please contact the startup to change their Investment Advisor code."
   │     Does NOT create permission request
   │
   └─ USER EXISTS - No Advisor
      └─ ⚠️ PERMISSION REQUIRED:
         ├─ Create `advisor_startup_link_requests` entry:
         │  - `status: 'pending'`
         │  - `advisor_id: advisorId`
         │  - `startup_id: startupId`
         │  - `message: "Investment Advisor [Name] wants to link your startup..."`
         ├─ Update `advisor_added_startups`:
         │  - `is_on_tms: false`
         │  - `tms_startup_id: startupId`
         │  - `invite_status: 'not_sent'`
         └─ Return: "Startup already exists on TMS. A permission request has been sent to the startup."
         Does NOT send invite email
```

---

## 🔍 **Duplicate Detection & Handling**

### **Detection Points**

1. **When Adding Startup** (`advisorAddedStartupService.createStartup`)
   - Checks: Email + Name
   - Actions: Create entry or show error

2. **When Inviting Startup** (`api/invite-startup-advisor.ts`)
   - Checks: Email in `users` table
   - Actions: Invite, create permission request, or show error

### **Duplicate Scenarios**

| Scenario | Detection | Action | Result |
|----------|-----------|--------|--------|
| **Same Email, Same Advisor** | ✅ Found | Update existing entry | ✅ Allowed |
| **Same Email, Different Advisor** | ✅ Found | Show error message | ❌ Rejected |
| **Same Name, Same Advisor** | ✅ Found | Update existing entry | ✅ Allowed |
| **Same Name, Different Advisor** | ✅ Found | Show error message | ❌ Rejected |
| **Same Email, No Advisor** | ✅ Found | Create entry + Permission Request | ⚠️ Pending |
| **No Duplicate** | ❌ Not Found | Create new entry | ✅ Created |

### **Error Messages**

```typescript
// When startup already linked to different advisor:
"⚠️ Startup '[Name]' is already linked with another Investment Advisor ([Advisor Name]). Please contact the startup directly to change their Investment Advisor code."

// When inviting startup already linked to different advisor:
"⚠️ This startup is already linked with another Investment Advisor ([Advisor Name]). Please contact the startup directly to change their Investment Advisor code."
```

---

## 📨 **Permission Request System**

### **When Permission Requests Are Created**

1. **Adding Startup (Manual)**
   - Startup exists on TMS
   - Startup has NO advisor linked
   - → Creates `advisor_startup_link_requests` entry

2. **Inviting Startup**
   - Startup exists on TMS
   - Startup has NO advisor linked
   - → Creates `advisor_startup_link_requests` entry
   - Does NOT send invite email

### **Permission Request Flow**

```
1. Request Created:
   ├─ Table: `advisor_startup_link_requests`
   ├─ Status: `'pending'`
   ├─ Fields:
   │  - `advisor_id`
   │  - `advisor_code`
   │  - `advisor_name`
   │  - `startup_id`
   │  - `startup_name`
   │  - `startup_user_id`
   │  - `startup_email`
   │  - `message`
   └─ `advisor_added_startup_id` (if from manual add)
   ↓
2. Startup Views Request:
   ├─ Startup sees request in their dashboard
   ├─ Shows: Advisor name, message, date
   └─ Options: Approve or Reject
   ↓
3. Startup Approves:
   ├─ Update `advisor_startup_link_requests`:
   │  - `status: 'approved'`
   │  - `responded_at: now()`
   ├─ Update `users`:
   │  - `investment_advisor_code_entered: advisorCode`
   │  - `advisor_accepted: true` (if switching advisors)
   ├─ Update `startups`:
   │  - `investment_advisor_code: advisorCode`
   ├─ Update `advisor_added_startups`:
   │  - `is_on_tms: true`
   │  - `tms_startup_id: startupId`
   │  - `invite_status: 'accepted'`
   ├─ Reject other pending requests for this startup
   └─ Result: Startup appears in advisor's "My Startups"
   ↓
4. Startup Rejects:
   ├─ Update `advisor_startup_link_requests`:
   │  - `status: 'rejected'`
   │  - `responded_at: now()`
   └─ Result: Request closed, startup remains unlinked
```

### **Duplicate Request Prevention**

```typescript
// In advisorStartupLinkRequestService.createRequest()

1. Check for existing request:
   - Query: `advisor_id = X AND startup_id = Y`
   
2. If exists:
   ├─ Status = 'pending' → ❌ Error: "A pending request already exists"
   ├─ Status = 'approved' → ❌ Error: "This startup is already linked"
   └─ Status = 'rejected' → ✅ Allow new request (startup can change mind)
```

---

## 🎓 **Registration & Auto-Linking**

### **Flow: Startup Completes Registration**

```
1. Startup receives invite email → Sets password → Redirects to Form 2
   ↓
2. CompleteRegistrationPage loads:
   ├─ Checks URL: `advisorCode` parameter
   ├─ Checks user metadata: `source === 'advisor_invite'`
   └─ If both true → Pre-fills advisor code (hidden, disabled)
   ↓
3. Startup completes Form 2 → Submits
   ↓
4. System saves startup data:
   ├─ Creates/updates `startups` table
   ├─ Creates founders, shares, etc.
   └─ Checks: Was user invited by advisor?
   ↓
5. Auto-Linking Logic:
   ├─ IF invited by advisor:
   │  ├─ Get advisor details by code
   │  ├─ Update `users`:
   │  │  - `advisor_accepted: true` ✅
   │  │  - `investment_advisor_code_entered: advisorCode`
   │  ├─ Update `startups`:
   │  │  - `investment_advisor_code: advisorCode`
   │  ├─ Update `advisor_added_startups`:
   │  │  - `is_on_tms: true`
   │  │  - `tms_startup_id: startupId`
   │  │  - `invite_status: 'accepted'`
   │  └─ Result: ✅ Startup appears in "My Startups" automatically
   │
   └─ IF manual registration (entered code in Form 1):
      ├─ `investment_advisor_code_entered` is set
      ├─ `advisor_accepted: false` (default)
      └─ Result: ⚠️ Startup appears in "Pending Requests"
         → Advisor must accept
```

### **Auto-Linking Code**

```typescript
// In CompleteRegistrationPage.tsx (after Form 2 submission)

const wasInvitedByAdvisor = authUser?.user_metadata?.source === 'advisor_invite';
const advisorCodeFromInvite = authUser?.user_metadata?.investment_advisor_code_entered;

if (wasInvitedByAdvisor && advisorCodeFromInvite) {
  // Auto-accept: Set advisor_accepted = true
  await supabase
    .from('users')
    .update({
      advisor_accepted: true,
      investment_advisor_code_entered: advisorCodeFromInvite
    })
    .eq('id', userData.id);

  // Update startup record
  await supabase
    .from('startups')
    .update({
      investment_advisor_code: advisorCodeFromInvite
    })
    .eq('id', startup.id);

  // Update advisor_added_startups
  await supabase
    .from('advisor_added_startups')
    .update({
      is_on_tms: true,
      tms_startup_id: startup.id,
      invite_status: 'accepted'
    })
    .eq('advisor_id', advisorData.id)
    .eq('tms_startup_id', startup.id);
}
```

---

## 🎨 **Logo Replacement**

### **Flow: Advisor Logo Display**

```
1. User logs in (Startup or Investor)
   ↓
2. AdvisorAwareLogo component checks:
   ├─ Does user have `investment_advisor_code_entered`?
   ├─ Is user role 'Startup' or 'Investor'?
   └─ If both YES → Fetch advisor info
   ↓
3. Fetch advisor:
   ├─ Query: `users.investment_advisor_code = code AND role = 'Investment Advisor'`
   └─ Get: `logo_url`, `name`
   ↓
4. Display Logic:
   ├─ IF advisor has `logo_url`:
   │  └─ ✅ Show advisor logo + name
   │     Text: "[Advisor Name]"
   │     Subtext: "Supported by Track My Startup"
   │
   └─ ELSE:
      └─ ✅ Show TrackMyStartup default logo
```

### **Where Logo Appears**

- ✅ **Startup Dashboard** (`StartupView.tsx`)
- ✅ **Investor Dashboard** (`InvestorView.tsx`)
- ✅ **App Header** (`App.tsx`)

### **Logo Replacement Conditions**

| User Type | Has Advisor Code? | Advisor Has Logo? | Result |
|-----------|-------------------|-------------------|--------|
| Startup | ✅ Yes | ✅ Yes | Show Advisor Logo |
| Startup | ✅ Yes | ❌ No | Show TMS Logo |
| Startup | ❌ No | - | Show TMS Logo |
| Investor | ✅ Yes | ✅ Yes | Show Advisor Logo |
| Investor | ✅ Yes | ❌ No | Show TMS Logo |
| Investor | ❌ No | - | Show TMS Logo |

---

## 🔄 **Complete Flow Diagrams**

### **Scenario 1: New Startup (Not on TMS)**

```
Advisor Adds Startup
    ↓
[Duplicate Check: NO]
    ↓
✅ Created in advisor_added_startups
    ↓
Advisor Clicks "Invite to TMS"
    ↓
[Check: User exists? NO]
    ↓
✅ Send Invite Email
✅ Create User (with advisor code)
✅ Create Startup Record
✅ Update advisor_added_startups: invite_status = 'sent'
    ↓
Startup Receives Email → Sets Password
    ↓
✅ Redirects to Form 2 (with advisorCode in URL)
    ↓
Startup Completes Form 2
    ↓
✅ Auto-Link:
   - advisor_accepted = true
   - investment_advisor_code = set
   - is_on_tms = true
    ↓
✅ Startup appears in "My Startups" automatically
✅ Advisor logo shows on startup dashboard
```

### **Scenario 2: Existing Startup (No Advisor)**

```
Advisor Adds Startup
    ↓
[Duplicate Check: YES - Found by email/name]
[Check: Has advisor? NO]
    ↓
✅ Created in advisor_added_startups
✅ Created Permission Request
    ↓
Advisor Clicks "Invite to TMS"
    ↓
[Check: User exists? YES]
[Check: Has advisor? NO]
    ↓
✅ Created Permission Request (if not exists)
❌ Does NOT send invite email
    ↓
Startup Views Request in Dashboard
    ↓
Startup Approves Request
    ↓
✅ Update users: advisor_accepted = true
✅ Update startups: investment_advisor_code = set
✅ Update advisor_added_startups: is_on_tms = true
    ↓
✅ Startup appears in "My Startups"
✅ Advisor logo shows on startup dashboard
```

### **Scenario 3: Existing Startup (Different Advisor)**

```
Advisor Adds Startup
    ↓
[Duplicate Check: YES - Found by email/name]
[Check: Has advisor? YES - Different advisor]
    ↓
❌ REJECTED
Error: "Startup already linked with another Investment Advisor ([Name]). 
       Please contact the startup directly to change their Investment Advisor code."
    ↓
[No entry created]
[No permission request created]
```

### **Scenario 4: Existing Startup (Same Advisor)**

```
Advisor Adds Startup
    ↓
[Duplicate Check: YES - Found by email/name]
[Check: Has advisor? YES - Same advisor]
    ↓
✅ Update existing entry
    ↓
Advisor Clicks "Invite to TMS"
    ↓
[Check: User exists? YES]
[Check: Has advisor? YES - Same advisor]
    ↓
✅ Update advisor_added_startups:
   - is_on_tms = true
   - invite_status = 'accepted'
    ↓
✅ Startup already in "My Startups"
✅ Advisor logo shows on startup dashboard
```

### **Scenario 5: Manual Registration (User Enters Code)**

```
User Registers (Form 1)
    ↓
User Enters Advisor Code
    ↓
✅ users.investment_advisor_code_entered = code
✅ users.advisor_accepted = false (default)
    ↓
User Completes Form 2
    ↓
✅ Startup record created
✅ startups.investment_advisor_code = code
    ↓
[No auto-linking - not invited by advisor]
    ↓
⚠️ Startup appears in "Pending Requests"
    ↓
Advisor Views Request → Accepts
    ↓
✅ Update users: advisor_accepted = true
    ↓
✅ Startup moves to "My Startups"
✅ Advisor logo shows on startup dashboard
```

---

## 📊 **Status Tracking**

### **advisor_added_startups Status Values**

| Status | Meaning | When Set |
|--------|---------|----------|
| `not_sent` | Not invited yet | After manual add |
| `sent` | Invite email sent | After successful invite (new user) |
| `accepted` | Linked to advisor | After auto-link or approval |
| `declined` | Startup rejected | If startup rejects (future) |

### **advisor_startup_link_requests Status Values**

| Status | Meaning | When Set |
|--------|---------|----------|
| `pending` | Waiting for startup response | When request created |
| `approved` | Startup approved linking | When startup approves |
| `rejected` | Startup rejected linking | When startup rejects |

### **is_on_tms Flag**

| Value | Meaning | When Set |
|-------|---------|----------|
| `true` | Startup is on TMS and linked | After invite accepted or permission approved |
| `false` | Startup not on TMS or not linked | Initially, or when permission pending |

---

## 🛡️ **Error Handling & Edge Cases**

### **1. Duplicate Prevention**
- ✅ Checks before creating entries
- ✅ Prevents duplicate permission requests
- ✅ Handles same advisor re-adding same startup

### **2. Conflict Resolution**
- ✅ Detects startups linked to different advisors
- ✅ Shows clear error messages
- ✅ Prevents unauthorized linking

### **3. Permission Request Management**
- ✅ Prevents duplicate pending requests
- ✅ Allows new request if previous was rejected
- ✅ Auto-rejects other requests when one is approved

### **4. Auto-Linking Safety**
- ✅ Only auto-links if `source === 'advisor_invite'`
- ✅ Verifies advisor exists before linking
- ✅ Updates all related tables atomically

### **5. Logo Display**
- ✅ Graceful fallback if advisor logo fails to load
- ✅ Shows default logo if no advisor assigned
- ✅ Works for both startups and investors

---

## ✅ **Summary**

### **Key Features**
1. ✅ **Duplicate Detection**: By email and name
2. ✅ **Conflict Prevention**: Blocks linking to different advisors
3. ✅ **Permission System**: For existing startups without advisors
4. ✅ **Auto-Linking**: For invited startups
5. ✅ **Status Tracking**: Clear status for all operations
6. ✅ **Logo Replacement**: Automatic for all linked users
7. ✅ **Error Handling**: Clear messages for all scenarios

### **Flow Summary**
- **New Startups**: Add → Invite → Auto-link ✅
- **Existing (No Advisor)**: Add → Permission Request → Approve → Link ✅
- **Existing (Different Advisor)**: Reject with clear message ❌
- **Existing (Same Advisor)**: Update and link ✅
- **Manual Registration**: Enter code → Pending → Approve → Link ✅

---

**🎉 The system handles all scenarios, prevents duplicates, manages requests, and ensures smooth linking!**


