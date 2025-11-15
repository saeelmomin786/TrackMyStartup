# Admin View Investor & Investment Advisor Data - Setup Instructions

## Problem
When admin views investor or investment advisor dashboards, they cannot see:
- Favorites (liked startups)
- Due diligence requests
- Other investor-specific data

This is due to RLS (Row Level Security) policies blocking admin access.

## Solution

### Step 1: Run the SQL Script
**CRITICAL**: You must run the SQL script to allow admin access:

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `FIX_ADMIN_VIEW_INVESTOR_DATA.sql`
4. Click "Run" to execute the script

This script creates RLS policies that allow:
- Admin to view all `investor_favorites`
- Admin to view all `due_diligence_requests`
- Admin to view all `investment_records`
- Admin to view all `startup_addition_requests`

### Step 2: Verify It's Working
After running the SQL script:

1. Log in as Admin
2. Go to User Management tab
3. Click "View Dashboard" on any Investor or Investment Advisor
4. You should now see:
   - ✅ Their favorites (heart icon filled on favorited startups)
   - ✅ Their due diligence requests
   - ✅ All their dashboard data

### What Was Changed

#### 1. SQL Script (`FIX_ADMIN_VIEW_INVESTOR_DATA.sql`)
- Creates RLS policies for Admin role to view all investor data
- Handles cases where tables might not exist yet
- Includes verification queries to check policies were created

#### 2. AdminView Component (`components/AdminView.tsx`)
- Updated `handleViewInvestorDashboard` to fetch:
  - Investor's favorites from `investor_favorites` table
  - Investor's due diligence requests from `due_diligence_requests` table
- Updated `handleViewInvestmentAdvisorDashboard` to fetch:
  - Investment advisor's favorites
  - Investment advisor's due diligence requests
- Added loading states and error handling

### Data Flow

When Admin views an Investor Dashboard:
1. Admin clicks "View Dashboard" on an investor
2. `handleViewInvestorDashboard` is called
3. Fetches investor's:
   - Offers
   - Startup addition requests
   - Startups (from investments and offers)
   - **Favorites** (NEW)
   - **Due diligence requests** (NEW)
4. Passes all data to `InvestorView` component
5. `InvestorView` displays the data (including favorites and due diligence)

When Admin views an Investment Advisor Dashboard:
1. Admin clicks "View Dashboard" on an investment advisor
2. `handleViewInvestmentAdvisorDashboard` is called
3. Fetches investment advisor's:
   - **Favorites** (NEW)
   - **Due diligence requests** (NEW)
4. Passes data to `InvestmentAdvisorView` component
5. Component displays the data

### Tables Affected

1. **investor_favorites** - Stores investor/investment advisor favorites
2. **due_diligence_requests** - Stores due diligence requests
3. **investment_records** - Investment history
4. **startup_addition_requests** - Startup addition requests

### RLS Policies Created

All policies check if the user's role is 'Admin':

```sql
EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'Admin'
)
```

This ensures only Admin users can view all data, while maintaining security for other roles.

### Troubleshooting

**If favorites/due diligence still don't show:**
1. Verify the SQL script ran successfully (check for errors)
2. Check browser console for RLS errors (usually 42501 or PGRST301)
3. Verify your user role is 'Admin' in the database
4. Refresh the page after running the SQL script

**Common Error Codes:**
- `42501` - Permission denied (RLS policy blocking)
- `PGRST116` - Table not found
- `PGRST301` - RLS policy violation

### Security Note

These policies only grant **SELECT** (read) access to Admin users. Admin cannot:
- Insert/update/delete investor favorites
- Modify due diligence requests
- Change investment records

This maintains data integrity while allowing admin to view all information for support and monitoring purposes.

