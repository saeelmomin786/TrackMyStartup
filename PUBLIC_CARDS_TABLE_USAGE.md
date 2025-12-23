# 📊 Public Cards - Table Usage

## 🔍 Current Status

Based on your console logs and code analysis:

---

## 📋 Tables Used by Public Cards

### **1. Explore Profiles Page (Public Card List)**
**File:** `components/ExploreProfilesPage.tsx`

**Before (OLD):**
- ❌ `mentor_profiles` (main table) - Line 192
- ❌ `investment_advisor_profiles` (main table) - Line 150

**After (UPDATED):**
- ✅ `mentors_public_table` (public table) - Line 192
- ✅ `advisors_public_table` (public table) - Line 150
- ✅ Falls back to main tables if public tables don't exist

---

### **2. Public Mentor Page (Single Card View)**
**File:** `components/PublicMentorPage.tsx`

**Uses:**
- ✅ `mentors_public_table` (public table)
- ✅ Falls back to `mentor_profiles` if needed

---

### **3. Public Advisor Page (Single Card View)**
**File:** `components/PublicAdvisorPage.tsx`

**Uses:**
- ✅ `advisors_public_table` (public table)
- ✅ Falls back to `investment_advisor_profiles` if needed

---

### **4. Mentor Service (For Dashboard/Internal Use)**
**File:** `lib/mentorService.ts`

**Uses (for authenticated users):**
- ✅ `mentor_profiles` (main table) - Line 1023, 1063, 1121, 1159
- ✅ `mentor_startup_assignments` (main table) - Line 104
- ✅ `mentor_requests` (main table) - Line 193, 305, 551
- ✅ `mentor_founded_startups` (main table) - Line 329

**Why:** These are for authenticated users viewing their own dashboard, not public cards.

---

## 🎯 What Your Console Logs Show

The logs you're seeing:
```
mentorService.ts:102 🔍 Fetching active assignments for mentor_id: 50e3a3fc-41ee-4067-bd35-21d06eaaaa08
mentorService.ts:190 🔍 Fetching mentor requests for mentor_id: 50e3a3fc-41ee-4067-bd35-21d06eaaaa08
```

**These are NOT from public cards!** These are from:
- ✅ `mentorService.getMentorMetrics()` - Used in authenticated user's dashboard
- ✅ Queries `mentor_startup_assignments` and `mentor_requests` tables
- ✅ This is for logged-in users viewing their own mentor dashboard

---

## 📊 Summary Table

| Component | Table Used | Type | Status |
|-----------|-----------|------|--------|
| **ExploreProfilesPage (Mentor)** | `mentors_public_table` | Public | ✅ Updated |
| **ExploreProfilesPage (Advisor)** | `advisors_public_table` | Public | ✅ Updated |
| **PublicMentorPage** | `mentors_public_table` | Public | ✅ Updated |
| **PublicAdvisorPage** | `advisors_public_table` | Public | ✅ Updated |
| **MentorService (Dashboard)** | `mentor_profiles` | Authenticated | ✅ Correct (main table) |
| **MentorService (Assignments)** | `mentor_startup_assignments` | Authenticated | ✅ Correct (main table) |
| **MentorService (Requests)** | `mentor_requests` | Authenticated | ✅ Correct (main table) |

---

## ✅ What's Correct

1. **Public Cards** → Use public tables (`mentors_public_table`, `advisors_public_table`)
2. **Authenticated Dashboard** → Uses main tables (`mentor_profiles`, `mentor_startup_assignments`, etc.)
3. **Auto-Sync** → Triggers keep public tables updated

---

## 🔍 Your Console Logs Explained

The logs you're seeing are from:
- **`mentorService.getMentorMetrics()`** - Called when a logged-in mentor views their dashboard
- **NOT from public cards** - These are internal dashboard queries

**If you want to see public card queries**, check:
- Network tab → Filter by `mentors_public_table` or `advisors_public_table`
- Or visit `/explore` page (ExploreProfilesPage) to see public card queries

---

## 🎯 Bottom Line

**Public cards now use public tables!** ✅

The console logs you're seeing are from authenticated user dashboard queries, not public cards.


