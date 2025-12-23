# 🔐 Authenticated vs Public Data Access

## ✅ Correct Architecture

**YES - After login, authenticated users use the MAIN tables!**

---

## 📊 Data Access by User Type

### **1. Public Pages (Anyone Can View)**
**URLs:** `/mentor/mentor-name`, `/advisor/advisor-name`, `/startup/startup-name`

**Uses:**
- ✅ `mentors_public_table` (read-only public table)
- ✅ `advisors_public_table` (read-only public table)
- ✅ `startups_public` view (read-only view)

**Why:**
- Secure (read-only, no sensitive data)
- Fast (optimized for public queries)
- Accessible to everyone (no login required)

**Files:**
- `components/PublicMentorPage.tsx` → `mentors_public_table`
- `components/PublicAdvisorPage.tsx` → `advisors_public_table`
- `components/PublicStartupPage.tsx` → `startups_public` view

---

### **2. Authenticated User Edit Forms (Logged In Users)**
**URLs:** User's own profile edit pages (inside the app)

**Uses:**
- ✅ `mentor_profiles` (main table with RLS)
- ✅ `investment_advisor_profiles` (main table with RLS)
- ✅ `startups` (main table with RLS)

**Why:**
- Full data access (all fields, not just public ones)
- Can edit/update (RLS allows own data modification)
- Protected by RLS (users can only access their own data)

**Files:**
- `components/mentor/MentorProfileForm.tsx` → `mentor_profiles` (line 499)
- `components/investment-advisor/InvestmentAdvisorProfileForm.tsx` → `investment_advisor_profiles` (line 262)
- Startup edit forms → `startups` table

---

## 🔄 How It Works

### **Public Viewing:**
```
User visits /mentor/mentor-name
  ↓
PublicMentorPage.tsx loads
  ↓
Queries mentors_public_table (read-only)
  ↓
Shows public profile data
```

### **Authenticated User Editing:**
```
User logs in → Views own profile
  ↓
MentorProfileForm.tsx loads
  ↓
Queries mentor_profiles (main table with RLS)
  ↓
User can view/edit all their data
  ↓
Saves to mentor_profiles
  ↓
Trigger automatically syncs to mentors_public_table
```

---

## ✅ Current Implementation

### **Public Pages (Already Updated):**
- ✅ `PublicMentorPage.tsx` → Uses `mentors_public_table`
- ✅ `PublicAdvisorPage.tsx` → Uses `advisors_public_table`
- ✅ `PublicStartupPage.tsx` → Uses `startups_public` view

### **Edit Forms (Already Correct):**
- ✅ `MentorProfileForm.tsx` → Uses `mentor_profiles` (main table)
- ✅ `InvestmentAdvisorProfileForm.tsx` → Uses `investment_advisor_profiles` (main table)

---

## 🔒 Security Flow

### **1. User Updates Profile:**
```
User edits profile in MentorProfileForm
  ↓
Saves to mentor_profiles (main table)
  ↓
RLS policy checks: user can only update own data ✅
  ↓
Trigger fires: sync_mentor_to_public_table()
  ↓
Automatically updates mentors_public_table
  ↓
Public page now shows updated data
```

### **2. Public User Views Profile:**
```
Public user visits /mentor/mentor-name
  ↓
PublicMentorPage queries mentors_public_table
  ↓
Read-only access (no RLS needed)
  ↓
Shows public profile data
```

---

## 📋 Summary Table

| User Type | Page Type | Table Used | Can Edit? | RLS Protected? |
|-----------|-----------|------------|-----------|----------------|
| **Public** | Public View | `mentors_public_table` | ❌ No | ❌ Not needed (read-only) |
| **Public** | Public View | `advisors_public_table` | ❌ No | ❌ Not needed (read-only) |
| **Public** | Public View | `startups_public` view | ❌ No | ❌ Not needed (read-only) |
| **Authenticated** | Edit Form | `mentor_profiles` | ✅ Yes | ✅ Yes (own data only) |
| **Authenticated** | Edit Form | `investment_advisor_profiles` | ✅ Yes | ✅ Yes (own data only) |
| **Authenticated** | Edit Form | `startups` | ✅ Yes | ✅ Yes (own data only) |

---

## 🎯 Key Points

1. **Public Pages** → Use public tables (secure, fast, read-only)
2. **Edit Forms** → Use main tables (full access, can edit, RLS protected)
3. **Auto-Sync** → Triggers keep public tables updated automatically
4. **Security** → RLS ensures users can only edit their own data

---

## ✅ Everything is Correct!

- ✅ Public pages use public tables (read-only)
- ✅ Authenticated users use main tables (can edit)
- ✅ Triggers sync automatically
- ✅ RLS protects main tables

**Your architecture is perfect!** 🎉


