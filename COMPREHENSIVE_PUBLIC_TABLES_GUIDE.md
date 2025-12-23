# 🔒 Comprehensive Public Tables Guide

## 🎯 What's Stored in Public Tables

The public tables store **ALL portfolio/profile details** shown on public pages, not just minimal sitemap data.

---

## 📊 Public Tables Structure

### **1. `startups_public_table`**
Stores all public startup information:
- ✅ `id` - Startup ID
- ✅ `name` - Company name (for slug)
- ✅ `sector` - Business sector
- ✅ `current_valuation` - Valuation
- ✅ `currency` - Currency
- ✅ `compliance_status` - For verified badge
- ✅ `updated_at` - For sitemap lastmod

### **2. `fundraising_details_public_table`**
Stores all public fundraising information:
- ✅ `startup_id` - Linked to startup
- ✅ `active` - Active fundraising badge
- ✅ `type` - Round type (Pre-Seed, Seed, etc.)
- ✅ `value` - Investment ask amount
- ✅ `equity` - Investment ask equity %
- ✅ `stage` - Stage (MVP, Growth, etc.)
- ✅ `pitch_deck_url` - Pitch deck link
- ✅ `pitch_video_url` - Pitch video URL
- ✅ `logo_url` - Logo image
- ✅ `website_url` - Company website
- ✅ `linkedin_url` - LinkedIn profile
- ✅ `business_plan_url` - Business plan
- ✅ `one_pager_url` - One pager

### **3. `mentors_public_table`**
Stores ALL mentor portfolio details:
- ✅ `user_id` - Mentor user ID
- ✅ `mentor_name` - Name (for slug)
- ✅ `mentor_type` - Type (Industry Expert, etc.)
- ✅ `location` - Location
- ✅ `website` - Website URL
- ✅ `linkedin_link` - LinkedIn profile
- ✅ `email` - Email (public)
- ✅ `expertise_areas[]` - Array of expertise
- ✅ `sectors[]` - Array of sectors
- ✅ `mentoring_stages[]` - Array of stages
- ✅ `years_of_experience` - Experience years
- ✅ `companies_mentored` - Number of companies
- ✅ `companies_founded` - Number founded
- ✅ `current_role` - Current role
- ✅ `previous_companies[]` - Previous companies
- ✅ `mentoring_approach` - Approach description
- ✅ `availability` - Availability status
- ✅ `preferred_engagement` - Engagement type
- ✅ `fee_type` - Fee type
- ✅ `fee_amount_min/max` - Fee range
- ✅ `equity_amount_min/max` - Equity range
- ✅ `fee_description` - Fee description
- ✅ `logo_url` - Logo image
- ✅ `video_url` - Video URL
- ✅ `media_type` - Logo or video

### **4. `investors_public_table`**
Stores ALL investor portfolio details:
- ✅ `user_id` - Investor user ID
- ✅ `investor_name` - Name (for slug)
- ✅ `firm_type` - Firm type
- ✅ `global_hq` - Headquarters location
- ✅ `website` - Website URL
- ✅ `linkedin_link` - LinkedIn profile
- ✅ `email` - Email (public)
- ✅ `geography[]` - Array of geographies
- ✅ `ticket_size_min/max` - Investment range
- ✅ `currency` - Currency
- ✅ `investment_stages[]` - Array of stages
- ✅ `investment_thesis` - Investment thesis
- ✅ `logo_url` - Logo image
- ✅ `video_url` - Video URL
- ✅ `media_type` - Logo or video

### **5. `advisors_public_table`**
Stores ALL advisor portfolio details:
- ✅ `user_id` - Advisor user ID
- ✅ `advisor_name` - Advisor name
- ✅ `firm_name` - Firm name
- ✅ `display_name` - For slug (firm_name or advisor_name)
- ✅ `global_hq` - Headquarters location
- ✅ `website` - Website URL
- ✅ `linkedin_link` - LinkedIn profile
- ✅ `email` - Email (public)
- ✅ `geography[]` - Array of geographies
- ✅ `service_types[]` - Array of service types
- ✅ `investment_stages[]` - Array of stages
- ✅ `domain[]` - Array of domains
- ✅ `minimum_investment` - Min investment
- ✅ `maximum_investment` - Max investment
- ✅ `currency` - Currency
- ✅ `service_description` - Service description
- ✅ `logo_url` - Logo image
- ✅ `video_url` - Video URL
- ✅ `media_type` - Logo or video

---

## 🔒 Security Benefits

### **What's Public (Safe to Expose):**
- ✅ Profile names and basic info
- ✅ Portfolio details (expertise, sectors, stages)
- ✅ Contact info (website, LinkedIn, email)
- ✅ Media (logos, videos)
- ✅ Public metrics (companies mentored, etc.)

### **What's NOT Public (Still Protected):**
- ❌ User passwords and auth data
- ❌ Financial records (detailed)
- ❌ Investment history (private)
- ❌ Cap table data
- ❌ Due diligence documents
- ❌ Internal notes and communications

---

## 📋 Setup Steps

### **Step 1: Create Public Tables**
Run in Supabase SQL Editor:
```sql
-- Run: CREATE_COMPREHENSIVE_PUBLIC_TABLES.sql
```
This creates all public tables with full portfolio data.

### **Step 2: Create Sync Triggers**
Run in Supabase SQL Editor:
```sql
-- Run: CREATE_COMPREHENSIVE_SYNC_TRIGGERS.sql
```
This creates triggers to auto-sync data.

### **Step 3: Update Public Pages**
Update public page components to use public tables:
- `PublicStartupPage.tsx` → Use `startups_public_table` and `fundraising_details_public_table`
- `PublicMentorPage.tsx` → Use `mentors_public_table`
- `PublicInvestorPage.tsx` → Use `investors_public_table`
- `PublicAdvisorPage.tsx` → Use `advisors_public_table`

---

## ✅ Benefits

1. **Complete Portfolio Data** - All public profile details stored
2. **Better Security** - Clear separation of public vs private
3. **No RLS Overhead** - Simple SELECT queries
4. **Auto-Sync** - Triggers keep data updated
5. **Easy Maintenance** - Clear what's public

---

## 🎯 Next Steps

1. ✅ Run `CREATE_COMPREHENSIVE_PUBLIC_TABLES.sql`
2. ✅ Run `CREATE_COMPREHENSIVE_SYNC_TRIGGERS.sql`
3. ✅ Update public page components to use public tables
4. ✅ Test public pages
5. ✅ Verify sitemap works

---

**This stores ALL portfolio details needed for public pages!** 🚀


