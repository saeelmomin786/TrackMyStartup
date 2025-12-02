# Restricted Public Access Summary

After running `FIX_PUBLIC_STARTUP_ACCESS_RESTRICTED.sql`, **ONLY** the following data will be publicly accessible (viewable by anyone without login):

## 🔓 Publicly Accessible Data (Restricted)

### **From `startups_public` View:**
Only these 6 columns are accessible:
- ✅ `id` - Startup ID (needed for operations)
- ✅ `name` - **Company name**
- ✅ `sector` - **Sector/Industry**
- ✅ `current_valuation` - **Valuation**
- ✅ `currency` - Currency (for formatting)
- ✅ `compliance_status` - **For Verified badge**
- ⚠️ **Note:** `pitch_video_url` is NOT in startups table - it's in `fundraising_details_public`

**NOT accessible:**
- ❌ `description` - Company description
- ❌ `total_funding` - Total funding
- ❌ `total_revenue` - Total revenue
- ❌ `registration_date` - Registration date
- ❌ `investment_type` - Investment type
- ❌ `investment_value` - Investment value
- ❌ `equity_allocation` - Equity allocation
- ❌ `created_at` - Creation date
- ❌ `updated_at` - Last update
- ❌ Any other columns

### **From `fundraising_details_public` View:**
Only these 8 columns are accessible:
- ✅ `id` - Fundraising detail ID
- ✅ `startup_id` - Associated startup ID
- ✅ `active` - **Active badge**
- ✅ `type` - **Round type** (Pre-Seed, Seed, Series A, etc.)
- ✅ `value` - **Investment ask amount**
- ✅ `equity` - **Investment ask equity %**
- ✅ `stage` - **Stage** (MVP, Growth, etc.)
- ✅ `pitch_deck_url` - **Pitch deck link**
- ✅ `pitch_video_url` - Pitch video URL (if different from startup's)
- ✅ `created_at` - Creation timestamp (needed for ordering to get latest fundraising)

**NOT accessible:**
- ❌ `domain` - Domain/industry (not needed, sector is in startups_public)
- ❌ `validation_requested` - Validation status
- ❌ `created_at` - Creation date
- ❌ `updated_at` - Last update
- ❌ Any other columns

---

## 📱 What's Displayed on Public Startup Page

The public startup page displays **ONLY** these fields:

1. ✅ **Company Name** - `startups_public.name`
2. ✅ **Sector/Industry** - `startups_public.sector`
3. ✅ **Round Type** - `fundraising_details_public.type`
4. ✅ **Stage** - `fundraising_details_public.stage`
5. ✅ **Active Badge** - `fundraising_details_public.active`
6. ✅ **Verified Badge** - `startups_public.compliance_status === 'Compliant'`
7. ✅ **Pitch Video** - `fundraising_details_public.pitch_video_url` (only source)
8. ✅ **Pitch Deck Link** - `fundraising_details_public.pitch_deck_url`
9. ✅ **Investment Ask** - `fundraising_details_public.value` + `fundraising_details_public.equity`
10. ✅ **Valuation** - `startups_public.current_valuation`

### **Action Buttons:**
- 🔗 **Share** - Works without login
- 📄 **View Deck** - Works without login (if URL is public)
- 🔍 **Due Diligence** - Visible but requires login
- 💰 **Make Offer** - Visible but requires login

---

## 🔒 What is NOT Publicly Accessible

### **Protected Data:**
- ❌ Company description
- ❌ Total funding amount
- ❌ Total revenue
- ❌ Registration date
- ❌ Investment history
- ❌ Cap table data
- ❌ Financial records
- ❌ Founder information
- ❌ Validation status
- ❌ Domain field (from fundraising_details)
- ❌ Any other sensitive data

### **Protected Tables:**
- ❌ `startups` table (full access) - Only authenticated users
- ❌ `fundraising_details` table (full access) - Only authenticated users
- ❌ All other tables remain protected

---

## 🛡️ Security Implementation

### **How It Works:**
1. **Database Views**: Created `startups_public` and `fundraising_details_public` views with only public columns
2. **RLS Policies**: 
   - Tables (`startups`, `fundraising_details`) are only accessible to `authenticated` users
   - Views are accessible to `anon` (anonymous) role
3. **Component Logic**: 
   - Checks authentication status
   - Uses views when not authenticated
   - Uses full tables when authenticated

### **Access Control:**
- **Anonymous Users**: Can only read from views (limited columns)
- **Authenticated Users**: Can read from full tables (all columns)
- **Write Operations**: Only authenticated users with proper permissions

---

## 📝 Summary

**After running the restricted SQL script:**
- ✅ Only 7 columns from startups are public
- ✅ Only 8 columns from fundraising_details are public
- ✅ All other data remains protected
- ✅ Public users can view startup cards with limited info
- ✅ Authenticated users get full access
- ❌ No sensitive data is exposed
- ❌ No write operations for anonymous users

This is a **much more secure** approach than allowing full table access!

