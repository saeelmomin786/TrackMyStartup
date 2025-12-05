# Investor Profile Implementation

## Overview
This implementation adds investor profile cards similar to startup cards, allowing investors to create detailed profiles and display them in a card format.

## Files Created

### 1. Components
- **`components/investor/InvestorProfileForm.tsx`**: Form component for investors to fill out their profile information
- **`components/investor/InvestorCard.tsx`**: Card component to display investor profiles in a grid layout

### 2. Database
- **`CREATE_INVESTOR_PROFILES_TABLE.sql`**: SQL script to create the `investor_profiles` table
- **`CREATE_INVESTOR_STORAGE_BUCKET.sql`**: Instructions for creating the storage bucket for investor assets

## Features

### Investor Profile Form Fields
The form includes all the requested fields:

1. **Basic Information**
   - Investor Name / Firm Name
   - Firm Type (VC, Angel Investor, Corporate VC, Family Office, PE Firm, Government, Other)
   - Global HQ

2. **Investment Preferences**
   - Geography (multi-select checkboxes for countries)
   - Ticket Size (Min/Max in USD)
   - Investment Stages (Pre-Seed, Seed, Series A, etc.)
   - Investment Thesis (text area)

3. **Funding Requirements**
   - Funding Stages
   - Target Countries
   - Company Size (1-10, 11-50, 51-200, etc.)
   - Funding Requirements (text area)

4. **Media**
   - Logo Upload (image file)
   - YouTube Video URL
   - Media Type selector (Logo or Video)

### Investor Cards
The cards display:
- Logo or YouTube video (based on media type)
- Investor/Firm name
- Firm type
- Global HQ location
- Ticket size range
- Investment stages (badges)
- Geography (badges)
- Investment thesis preview
- View Profile button

## Setup Instructions

### 1. Database Setup
Run the SQL script to create the table:
```sql
-- Run CREATE_INVESTOR_PROFILES_TABLE.sql in your Supabase SQL Editor
```

### 2. Storage Bucket Setup
Create a storage bucket named `investor-assets` in Supabase:
1. Go to Supabase Dashboard > Storage
2. Create new bucket: `investor-assets`
3. Set to public (if you want logos to be publicly accessible)
4. Or configure RLS policies for private access

### 3. Usage
The Portfolio tab in the Investor Dashboard now has two sections:
- **My Profile**: Form to create/edit investor profile
- **Discover Investors**: Grid view of all investor cards

## Integration

The components are integrated into `components/InvestorView.tsx`:
- Added imports for `InvestorProfileForm` and `InvestorCard`
- Added state management for investor profiles
- Updated Portfolio tab with tabs for "My Profile" and "Discover Investors"
- Added function to load all investor profiles

## Notes

- The form supports both logo uploads and YouTube video URLs
- All array fields (geography, investment_stages, etc.) use checkboxes for multi-select
- The cards are displayed in a responsive grid (1 column on mobile, 2 on tablet, 3 on desktop)
- Profile data is stored in the `investor_profiles` table with proper RLS policies

## Future Enhancements

- Add filtering/search functionality for investor cards
- Add investor profile detail view page
- Add ability to contact investors directly
- Add analytics for profile views

