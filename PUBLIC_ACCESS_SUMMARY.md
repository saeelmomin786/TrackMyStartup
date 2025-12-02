# Public Access Summary

After running `FIX_PUBLIC_STARTUP_ACCESS.sql`, the following data will be **PUBLICLY ACCESSIBLE** (viewable by anyone without login):

## 🔓 Publicly Accessible Tables

### 1. **`startups` Table** - FULL READ ACCESS
All columns in the startups table will be readable by unauthenticated users:

- ✅ `id` - Startup ID
- ✅ `name` - Startup name
- ✅ `investment_type` - Investment type (Pre-Seed, Seed, Series A, etc.)
- ✅ `investment_value` - Investment value
- ✅ `equity_allocation` - Equity allocation percentage
- ✅ `current_valuation` - Current company valuation
- ✅ `compliance_status` - Compliance status (Compliant, Pending, Non-Compliant)
- ✅ `sector` - Industry sector
- ✅ `total_funding` - Total funding received
- ✅ `total_revenue` - Total revenue
- ✅ `registration_date` - Company registration date
- ✅ `currency` - Currency (INR, USD, etc.)
- ✅ `description` - Company description
- ✅ `pitch_video_url` - Pitch video URL (if exists)
- ✅ `created_at` - Creation timestamp
- ✅ `updated_at` - Last update timestamp
- ✅ **Any other columns** in the startups table

### 2. **`fundraising_details` Table** - FULL READ ACCESS
All columns in the fundraising_details table will be readable by unauthenticated users:

- ✅ `id` - Fundraising detail ID
- ✅ `startup_id` - Associated startup ID
- ✅ `active` - Whether fundraising is currently active
- ✅ `type` - Fundraising round type (Pre-Seed, Seed, Series A, etc.)
- ✅ `value` - Fundraising amount requested
- ✅ `equity` - Equity percentage offered
- ✅ `domain` - Startup domain/industry
- ✅ `stage` - Startup stage (Idea, MVP, Growth, etc.)
- ✅ `validation_requested` - Whether validation was requested
- ✅ `pitch_deck_url` - Pitch deck document URL
- ✅ `pitch_video_url` - Pitch video URL
- ✅ `created_at` - Creation timestamp
- ✅ `updated_at` - Last update timestamp
- ✅ **Any other columns** in the fundraising_details table

---

## 📱 What's Displayed on Public Startup Page

The public startup page (`PublicStartupPage.tsx`) displays the following information:

### **Visible Information:**
1. **Startup Name** - Company name
2. **Sector/Industry** - Business sector
3. **Round Type** - Fundraising round (Pre-Seed, Seed, etc.)
4. **Stage** - Startup stage (MVP, Growth, etc.)
5. **Active Badge** - Shows if fundraising is active
6. **Verified Badge** - Shows if compliance status is "Compliant"
7. **Pitch Video** - Embedded YouTube video (if available)
8. **Pitch Deck** - Link to view/download pitch deck (if available)
9. **Investment Ask** - Amount requested and equity percentage
10. **Valuation** - Current company valuation
11. **Currency** - Display currency

### **Action Buttons (Visible but Require Login):**
- 🔗 **Share** - Share the public link (works without login)
- 📄 **View Deck** - Opens pitch deck (works without login if URL is public)
- 🔍 **Due Diligence** - Requires login (Investor/Investment Advisor role)
- 💰 **Make Offer** - Requires login (Investor/Investment Advisor role)

---

## ⚠️ Important Security Notes

### ✅ **What IS Public:**
- All startup basic information (name, sector, valuation, etc.)
- All fundraising details (amount, equity, round type, etc.)
- Pitch videos and pitch deck URLs
- Compliance status
- Company description

### 🔒 **What is NOT Public (Still Protected):**
- **User data** - User emails, passwords, personal info
- **Investment records** - Detailed investment history
- **Cap table data** - Equity distribution details
- **Financial records** - Detailed financial data
- **Founder information** - Founder details
- **Due diligence documents** - Protected documents
- **Investment offers** - Private offer details
- **Write operations** - No INSERT, UPDATE, or DELETE permissions for anonymous users

### 🛡️ **RLS Policy Details:**
- **Read Access (SELECT)**: ✅ Allowed for `anon` and `authenticated` roles
- **Write Access (INSERT/UPDATE/DELETE)**: ❌ Only for `authenticated` users with proper permissions
- **Other Tables**: ❌ Not affected - remain protected by existing RLS policies

---

## 🎯 Use Case

This public access is designed for:
- ✅ Sharing startup profiles publicly
- ✅ Allowing investors to view startup information before signing up
- ✅ Marketing and showcasing startups
- ✅ Public fundraising pages

**Actions that require login:**
- Making investment offers
- Requesting due diligence access
- Viewing detailed financial data
- Accessing private documents

---

## 📝 Summary

**After running the SQL script:**
- ✅ Anyone can view startup basic information
- ✅ Anyone can view fundraising details
- ✅ Anyone can watch pitch videos
- ✅ Anyone can download pitch decks (if URLs are public)
- ❌ No one can modify data without authentication
- ❌ No one can access private/sensitive data
- ❌ No one can make offers without login

The public access is **read-only** and limited to **display purposes only**.

