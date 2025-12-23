# 📋 What ENHANCE_EXISTING_VIEWS_AND_ADD_TABLES.sql Does

## 🎯 Overview

This script enhances your existing public views and creates new public tables for mentors and advisors.

---

## 📊 Section-by-Section Breakdown

### **Section 1: Enhance `startups_public` View**

**What it does:**
```sql
DROP VIEW IF EXISTS public.startups_public;
CREATE VIEW public.startups_public AS
SELECT id, name, sector, current_valuation, currency, compliance_status, updated_at
FROM public.startups;
```

**Changes:**
- ✅ **Drops** your existing `startups_public` view
- ✅ **Recreates** it with the same columns PLUS `updated_at`
- ✅ **Why:** Sitemap needs `updated_at` for the `<lastmod>` field

**Result:**
- Your existing view gets `updated_at` column added
- Public pages continue to work (they already use this view)
- Sitemap can now get `updated_at` from the view

---

### **Section 2: Enhance `fundraising_details_public` View**

**What it does:**
```sql
DROP VIEW IF EXISTS public.fundraising_details_public;
CREATE VIEW public.fundraising_details_public AS
SELECT id, startup_id, active, type, value, equity, stage, 
       pitch_deck_url, pitch_video_url, logo_url, website_url, linkedin_url,
       business_plan_url, one_pager_url, created_at, updated_at
FROM public.fundraising_details;
```

**Changes:**
- ✅ **Drops** your existing `fundraising_details_public` view
- ✅ **Recreates** it with more columns (adds missing URLs and `updated_at`)
- ✅ **Why:** Public pages need these URLs, sitemap needs `updated_at`

**Result:**
- View now includes all URLs (website, linkedin, business_plan, one_pager)
- View now includes `updated_at` for sitemap
- Public pages get more data to display

---

### **Section 3: Create `mentors_public_table` Table**

**What it does:**
```sql
CREATE TABLE public.mentors_public_table (
    user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
    expertise_areas[], sectors[], mentoring_stages[], years_of_experience,
    companies_mentored, companies_founded, current_role, previous_companies[],
    mentoring_approach, availability, preferred_engagement, fee_type,
    fee_amount_min/max, equity_amount_min/max, fee_description,
    logo_url, video_url, media_type, updated_at, created_at
);
```

**Why:**
- ❌ You don't have a `mentors_public` view
- ✅ Need a public table for sitemap
- ✅ Stores ALL mentor portfolio data (for public pages)

**Result:**
- New table created with all mentor profile data
- Read-only (users can't modify it)
- Will be auto-synced by triggers

---

### **Section 4: Create `advisors_public_table` Table**

**What it does:**
```sql
CREATE TABLE public.advisors_public_table (
    user_id, advisor_name, firm_name, display_name, global_hq, website, linkedin_link, email,
    geography[], service_types[], investment_stages[], domain[],
    minimum_investment, maximum_investment, currency, service_description,
    logo_url, video_url, media_type, updated_at, created_at
);
```

**Why:**
- ❌ You don't have an `advisors_public` view
- ✅ Need a public table for sitemap
- ✅ Stores ALL advisor portfolio data (for public pages)

**Result:**
- New table created with all advisor profile data
- Read-only (users can't modify it)
- Will be auto-synced by triggers

---

### **Section 5: Initial Data Sync**

**What it does:**
```sql
-- Copies existing mentor data from mentor_profiles to mentors_public_table
INSERT INTO mentors_public_table SELECT ... FROM mentor_profiles;

-- Copies existing advisor data from investment_advisor_profiles to advisors_public_table
INSERT INTO advisors_public_table SELECT ... FROM investment_advisor_profiles;
```

**Why:**
- ✅ Populates the new tables with existing data
- ✅ Makes sure public tables have current data immediately

**Result:**
- New tables are populated with existing mentor/advisor data
- Ready to use right away

---

## ✅ Summary: What Happens

### **Before Running Script:**
- ✅ `startups_public` view exists (without `updated_at`)
- ✅ `fundraising_details_public` view exists (missing some columns)
- ❌ No public table for mentors
- ❌ No public table for advisors

### **After Running Script:**
- ✅ `startups_public` view enhanced (now has `updated_at`)
- ✅ `fundraising_details_public` view enhanced (has all URLs + `updated_at`)
- ✅ `mentors_public_table` created (with all mentor data)
- ✅ `advisors_public_table` created (with all advisor data)
- ✅ All tables populated with existing data

---

## 🔄 What Happens Next

After running this script, you need to:

1. **Run `CREATE_MENTOR_ADVISOR_SYNC_TRIGGERS_ONLY.sql`**
   - Creates triggers to auto-sync mentors and advisors
   - When users update mentor_profiles → mentors_public_table updates automatically
   - When users update investment_advisor_profiles → advisors_public_table updates automatically

2. **Deploy updated sitemap code**
   - Sitemap will use:
     - `startups_public` view (enhanced)
     - `mentors_public_table` (new)
     - `advisors_public_table` (new)
     - `investor_profiles` (main table with RLS)

---

## 🎯 End Result

- ✅ **Startups:** Use enhanced view (has `updated_at`)
- ✅ **Mentors:** Use new public table (auto-synced)
- ✅ **Advisors:** Use new public table (auto-synced)
- ✅ **Investors:** Use main table with RLS (as requested)
- ✅ **Sitemap:** Works with all profile types
- ✅ **Public Pages:** Continue working (views enhanced, not replaced)

---

## ⚠️ Important Notes

1. **Views are recreated** - But with same data, just enhanced
2. **No data loss** - All existing data preserved
3. **Public pages unaffected** - They continue using views
4. **Main tables safe** - Not modified, only views/tables created
5. **Read-only public tables** - Users can't modify them directly

---

**This script enhances what you have and adds what's missing!** ✨


