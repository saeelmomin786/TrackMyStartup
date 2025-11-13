# Investor Dashboard - Startup Dashboard Integration Analysis

## Overview
This document analyzes how the Investor Dashboard displays and integrates with the Startup Dashboard functionality.

## Architecture Flow

### 1. Investor Dashboard Component Structure

**Location:** `components/InvestorView.tsx`

The Investor Dashboard has three main tabs:
- **Dashboard Tab** (`activeTab === 'dashboard'`)
  - Shows portfolio summary (Total Funding, Total Revenue, Compliance Rate, My Startups)
  - Lists startup addition requests
  - Displays portfolio startups in a table with "View" buttons
  - Shows portfolio distribution chart

- **Discover Pitches Tab** (`activeTab === 'reels'`)
  - Shows active fundraising startups
  - Video pitch reels interface
  - Co-investment opportunities
  - Recommended opportunities

- **Offers Tab** (`activeTab === 'offers'`)
  - Shows investment offers made by the investor
  - Co-investment offers
  - Offer management interface

### 2. How Investors Access Startup Dashboards

#### Entry Points in InvestorView:

1. **Portfolio Startups Table** (Dashboard Tab)
   - **Location:** Line ~1625 in `InvestorView.tsx`
   - **Code:**
     ```tsx
     <Button size="sm" variant="outline" onClick={() => onViewStartup(startup)}>
       <Eye className="mr-2 h-4 w-4" /> View
     </Button>
     ```
   - **Action:** Calls `onViewStartup(startup)` prop function

2. **Due Diligence Request Handler** (Reels/Discover Tab)
   - **Location:** Line ~1108 in `InvestorView.tsx`
   - **Code:**
     ```tsx
     if (approved) {
       // Open full Startup Dashboard (read-only) for due diligence review
       (onViewStartup as any)(startup.id, 'dashboard');
       return;
     }
     ```
   - **Action:** Opens startup dashboard when due diligence is approved

3. **Co-Investment Opportunities** (Discover Tab)
   - **Location:** Line ~1901 in `InvestorView.tsx`
   - **Code:**
     ```tsx
     const startup = startups.find(s => s.id === opp.startup_id);
     if (startup) {
       onViewStartup(startup);
     }
     ```
   - **Action:** Opens startup dashboard from co-investment opportunity

### 3. Navigation Flow (App.tsx)

**Location:** `App.tsx` - `handleViewStartup` function (Line ~1762)

#### Flow for Investors:

```typescript
const handleViewStartup = useCallback((startup: Startup | number, targetTab?: string) => {
  // Handle both startup object and startup ID
  let startupObj: Startup;
  if (typeof startup === 'number') {
    startupObj = startupsRef.current.find(s => s.id === startup);
    if (!startupObj) {
      // Fallback: fetch from database
      handleFacilitatorStartupAccess(startup, targetTab);
      return;
    }
  } else {
    startupObj = startup;
  }
  
  // For investors, always fetch fresh, enriched startup data from DB
  if (currentUser?.role === 'Investor' || currentUser?.role === 'Investment Advisor') {
    console.log('🔍 Investor access: fetching enriched startup data for view');
    handleFacilitatorStartupAccess(startupObj.id, targetTab);
    return;
  }
  
  // Set view-only mode for investors
  const isViewOnlyMode = currentUser?.role === 'Investor' || ...;
  setSelectedStartup(startupObj);
  setIsViewOnly(isViewOnlyMode);
  setView('startupHealth'); // Opens StartupHealthView
}, [currentUser?.role]);
```

#### Key Points:
- **Investors always fetch fresh data** from database via `handleFacilitatorStartupAccess`
- **View-only mode** is enabled for investors
- **Target tab** can be specified (defaults to 'dashboard')

### 4. Data Fetching for Investors

**Location:** `App.tsx` - `handleFacilitatorStartupAccess` (Line ~1826)

This function:
1. Fetches startup data from `startups` table
2. Fetches fundraising details from `fundraising_details` table
3. Fetches share data from `startup_shares` table
4. Fetches founders data from `founders` table
5. Enriches and maps all data to `Startup` interface format
6. Sets the view to `startupHealth` with enriched data

### 5. Startup Dashboard Component

**Location:** `components/StartupHealthView.tsx`

#### Tabs Available:
1. **Dashboard** - `StartupDashboardTab` component
2. **Opportunities** - `OpportunitiesTab`
3. **Profile** - `ProfileTab`
4. **Compliance** - `ComplianceTab`
5. **Financials** - `FinancialsTab`
6. **Employees** - `EmployeesTab`
7. **Cap Table** - `CapTableTab`

#### Startup Dashboard Tab Details:

**Location:** `components/startup-health/StartupDashboardTab.tsx`

**Key Features:**
- Dashboard metrics (revenue, funding, compliance)
- Revenue charts (monthly/daily views)
- Fund usage charts
- Offers received section
- Due diligence requests
- Admin program posts
- Investment offers management

### 6. Investment Advisor View Integration

**Location:** `components/InvestmentAdvisorView.tsx`

#### Investor Dashboard Modal (Line ~3794):
```tsx
{viewingInvestorDashboard && selectedInvestor && (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
      <InvestorView
        startups={investorDashboardData.investorStartups}
        newInvestments={investorDashboardData.investorInvestments}
        startupAdditionRequests={investorDashboardData.investorStartupAdditionRequests}
        investmentOffers={investorOffers}
        currentUser={selectedInvestor}
        onViewStartup={() => {}} // Empty handler in view-only mode
        isViewOnly={true}
        initialTab="dashboard"
      />
    </div>
  </div>
)}
```

#### Startup Dashboard Modal (Line ~3831):
```tsx
{viewingStartupDashboard && selectedStartup && (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
      <StartupHealthView
        startup={selectedStartup}
        userRole="Startup"
        user={currentUser}
        onBack={handleCloseStartupDashboard}
        isViewOnly={true}
        investmentOffers={startupOffers}
      />
    </div>
  </div>
)}
```

**Note:** In Investment Advisor View, the `onViewStartup` handler is empty (`() => {}`), so clicking "View" in the investor dashboard modal doesn't open the startup dashboard. This is a limitation in the current implementation.

## Data Flow Summary

```
InvestorView Component
    ↓ (User clicks "View" button)
onViewStartup(startup) prop
    ↓
App.tsx handleViewStartup()
    ↓ (For investors)
handleFacilitatorStartupAccess()
    ↓ (Fetches from database)
Enriched Startup Data
    ↓
setView('startupHealth')
    ↓
StartupHealthView Component
    ↓
StartupDashboardTab (default tab)
```

## Key Components

### InvestorView Props:
- `startups: Startup[]` - Portfolio startups
- `newInvestments: NewInvestment[]` - Investment opportunities
- `startupAdditionRequests: StartupAdditionRequest[]` - Pending requests
- `investmentOffers: InvestmentOffer[]` - Investor's offers
- `currentUser` - Investor user object
- `onViewStartup: (startup: Startup) => void` - Callback to open startup dashboard
- `isViewOnly?: boolean` - Whether in read-only mode

### StartupHealthView Props:
- `startup: Startup` - Startup data
- `userRole: string` - User's role
- `user: any` - Current user
- `isViewOnly?: boolean` - Read-only mode
- `investmentOffers?: InvestmentOffer[]` - Offers for the startup

## Current Limitations

1. **Investment Advisor View:** The `onViewStartup` handler in the investor dashboard modal is empty, preventing navigation to startup dashboards from within the modal.

2. **View-Only Mode:** Investors can only view startup dashboards in read-only mode - they cannot edit any data.

3. **Data Freshness:** While investors get fresh data on initial load, there's no automatic refresh mechanism.

## Recommendations

1. **Fix Investment Advisor View:** Implement proper `onViewStartup` handler in `InvestmentAdvisorView` to allow opening startup dashboards from investor dashboard modal.

2. **Add Refresh Mechanism:** Consider adding a refresh button or auto-refresh for startup data when viewing from investor dashboard.

3. **Improve Navigation:** Add breadcrumbs or back button to help investors navigate back to their dashboard from startup view.

4. **Enhanced Permissions:** Consider granular permissions for what investors can view in startup dashboards (e.g., financials, cap table).




