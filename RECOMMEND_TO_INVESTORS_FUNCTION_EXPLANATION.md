# "Recommend to Investors" Function - Complete Explanation

## Overview
The **"Recommend to Investors"** function allows Investment Advisors to recommend startup pitches to all their assigned investors from the Discover Pitches tab. This creates personalized recommendations that appear in the investors' "Recommended" sub-tab.

---

## How It Works - Step by Step

### 1. **User Action**
- **Location:** Investment Advisor Dashboard → Discover Tab
- **Action:** Advisor clicks the **"Recommend to Investors"** button on any startup pitch card
- **Button States:**
  - **Not Recommended:** Green gradient button with text "Recommend to Investors"
  - **Recommended:** Blue gradient button with text "Recommended ✓"

### 2. **Pre-Check: Validates Assigned Investors**

```typescript
if (myInvestors.length === 0) {
    // Show warning notification
    message: 'You have no assigned investors to recommend this startup to. Please accept investor requests first.'
    return; // Stop execution
}
```

**What are `myInvestors`?**
- Investors who have:
  1. Entered the advisor's investment advisor code
  2. Been **accepted** by the advisor (`advisor_accepted === true`)
- Retrieved from the `users` table filtered by:
  - `role === 'Investor'`
  - `investment_advisor_code_entered === advisorCode`
  - `advisor_accepted === true`

### 3. **Validates Startup Exists**

```typescript
const startup = startups.find(s => s.id === startupId);
if (!startup) {
    // Show error notification
    message: 'Startup not found. Please refresh the page and try again.'
    return;
}
```

### 4. **Creates Recommendations for ALL Assigned Investors**

```typescript
const investorIds = myInvestors.map(investor => investor.id);

// Create one recommendation record for EACH assigned investor
const recommendationPromises = investorIds.map(investorId => 
    supabase
        .from('investment_advisor_recommendations')
        .insert({
            investment_advisor_id: currentUser?.id,
            startup_id: startupId,
            investor_id: investorId,
            recommended_deal_value: 0,
            recommended_valuation: 0,
            recommendation_notes: `Recommended by ${currentUser?.name} - Co-investment opportunity`,
            status: 'pending'
        })
);
```

**Key Points:**
- Creates **one recommendation record per investor**
- All recommendations are created in **parallel** using `Promise.all()`
- Each record links:
  - **Advisor** → **Startup** → **Investor**
- Default values:
  - `recommended_deal_value`: 0
  - `recommended_valuation`: 0
  - `recommendation_notes`: Auto-generated with advisor name
  - `status`: 'pending'

### 5. **Error Handling**

```typescript
const results = await Promise.all(recommendationPromises);
const errors = results.filter(result => result.error);

if (errors.length > 0) {
    // Show error notification
    message: 'Failed to create some recommendations. Please try again.'
    return;
}
```

### 6. **Updates UI State**

```typescript
// Add startup ID to recommendedStartups Set
setRecommendedStartups(prev => new Set([...prev, startupId]));
```

**Purpose:**
- Changes button color from green to blue
- Changes button text to "Recommended ✓"
- Prevents duplicate recommendations (visual feedback)

### 7. **Success Notification**

```typescript
setNotifications(prev => [...prev, {
    id: Date.now().toString(),
    message: `Successfully recommended "${startup.name}" to ${myInvestors.length} investors!`,
    type: 'success',
    timestamp: new Date()
}]);
```

---

## Database Structure

### Table: `investment_advisor_recommendations`

```sql
CREATE TABLE investment_advisor_recommendations (
    id SERIAL PRIMARY KEY,
    investment_advisor_id UUID NOT NULL REFERENCES users(id),
    startup_id INTEGER NOT NULL REFERENCES startups(id),
    investor_id UUID NOT NULL REFERENCES users(id),
    recommended_deal_value DECIMAL(15,2),
    recommended_valuation DECIMAL(15,2),
    recommendation_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'interested', 'not_interested')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `investment_advisor_id`: The advisor who made the recommendation
- `startup_id`: The startup being recommended
- `investor_id`: The investor receiving the recommendation
- `recommended_deal_value`: Suggested investment amount (currently 0)
- `recommended_valuation`: Suggested valuation (currently 0)
- `recommendation_notes`: Notes from advisor (auto-generated)
- `status`: Tracks investor's interaction ('pending', 'viewed', 'interested', 'not_interested')

---

## How Investors See Recommendations

### 1. **Location in Investor Dashboard**
- **Tab:** Discover Pitches → **"Recommended"** sub-tab
- **Icon:** Star icon (purple)

### 2. **Data Fetching**

```typescript
// In InvestorView.tsx
const fetchRecommendations = async () => {
    const { data: recData, error: recError } = await supabase
        .from('investment_advisor_recommendations')
        .select(`
            id,
            startup_id,
            recommended_deal_value,
            recommended_valuation,
            recommendation_notes,
            status,
            created_at,
            investment_advisor:users!investment_advisor_recommendations_investment_advisor_id_fkey(name),
            startup:startups(name, sector, current_valuation, investment_value, equity_allocation)
        `)
        .eq('investor_id', currentUser.id)
        .order('created_at', { ascending: false });
}
```

**Query Details:**
- Filters by `investor_id` = current investor's ID
- Joins with `users` table to get advisor name
- Joins with `startups` table to get startup details
- Orders by `created_at` (newest first)

### 3. **Display in Recommended Sub-Tab**

**Features:**
- Shows all recommended startups
- Displays advisor name: "Recommended by [Advisor Name]"
- Shows recommendation notes
- Special purple badge: "Recommended"
- Same pitch card format as regular pitches
- Searchable and filterable

### 4. **Recommendation Card Display**

```typescript
// Shows advisor attribution
{rec?.advisor_name && rec.advisor_name !== '—' && (
    <p className="text-sm text-purple-600 mt-1">
        <Star className="h-3 w-3 inline mr-1" />
        Recommended by {rec.advisor_name}
    </p>
)}

// Shows recommendation notes
{rec?.recommendation_notes && (
    <p className="text-xs text-slate-500 mt-2 italic">
        {rec.recommendation_notes}
    </p>
)}
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Investment Advisor Dashboard - Discover Tab                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Startup Pitch Card                                    │  │
│  │  [Recommend to Investors] Button (Green)              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  Check: myInvestors.length > 0?  │
        └─────────────────────────────────┘
                  │                    │
            YES   │                    │ NO
                  │                    │
                  ▼                    ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │  Get all investor IDs │   │  Show Warning:       │
    │  from myInvestors     │   │  "No assigned        │
    │                       │   │   investors"         │
    └──────────────────────┘   └──────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │  Create recommendation records       │
    │  For EACH investor:                  │
    │  - investment_advisor_id             │
    │  - startup_id                        │
    │  - investor_id                       │
    │  - recommendation_notes              │
    │  - status: 'pending'                 │
    └──────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │  Insert into database                │
    │  (Parallel execution)                │
    └──────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │  Update UI:                          │
    │  - Button → Blue "Recommended ✓"     │
    │  - Add to recommendedStartups Set    │
    │  - Show success notification          │
    └──────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │  Investors see recommendations in:   │
    │  Discover → Recommended sub-tab      │
    │  - Shows advisor name                 │
    │  - Shows recommendation notes         │
    │  - Special "Recommended" badge       │
    └──────────────────────────────────────┘
```

---

## Key Features

### ✅ **Bulk Recommendation**
- Recommends to **ALL assigned investors** at once
- One click = Multiple recommendations created

### ✅ **Parallel Processing**
- Uses `Promise.all()` for fast execution
- All database inserts happen simultaneously

### ✅ **Visual Feedback**
- Button changes color (green → blue)
- Button text changes ("Recommend" → "Recommended ✓")
- Success notification shows count

### ✅ **Error Handling**
- Validates assigned investors exist
- Validates startup exists
- Handles database errors gracefully
- Shows user-friendly error messages

### ✅ **State Management**
- Uses `Set<number>` to track recommended startups
- Prevents duplicate visual states
- Persists across page refreshes (via database)

---

## Current Limitations

### 1. **No Custom Notes**
- Recommendation notes are auto-generated
- Format: "Recommended by [Advisor Name] - Co-investment opportunity"
- **Cannot customize** per recommendation

### 2. **No Deal Value/Valuation**
- `recommended_deal_value`: Always 0
- `recommended_valuation`: Always 0
- **Cannot suggest specific amounts**

### 3. **No Un-Recommend**
- Once recommended, cannot undo
- Button stays blue permanently
- **No way to remove recommendation**

### 4. **No Per-Investor Customization**
- Same recommendation sent to all investors
- **Cannot customize per investor**

### 5. **No Recommendation History**
- Cannot see when recommendations were sent
- **No tracking of recommendation dates**

---

## Potential Improvements

### 1. **Add Custom Notes Field**
```typescript
// Modal to enter custom notes
const [recommendationNotes, setRecommendationNotes] = useState('');
```

### 2. **Add Deal Value/Valuation**
```typescript
// Allow advisor to suggest amounts
recommended_deal_value: customDealValue,
recommended_valuation: customValuation,
```

### 3. **Add Un-Recommend Function**
```typescript
const handleUnRecommend = async (startupId: number) => {
    // Delete recommendations from database
    // Update UI state
};
```

### 4. **Add Per-Investor Selection**
```typescript
// Checkbox list to select specific investors
const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
```

### 5. **Add Recommendation History**
```typescript
// Show when recommendations were sent
// Track recommendation status changes
```

---

## Code Location

**File:** `components/InvestmentAdvisorView.tsx`

**Function:** `handleRecommendCoInvestment` (Lines 2260-2338)

**Button:** Lines 4928-4937

**State:** `recommendedStartups` (Line 59)

**Database Table:** `investment_advisor_recommendations`

---

## Summary

The "Recommend to Investors" function is a **bulk recommendation system** that:

1. ✅ Validates advisor has assigned investors
2. ✅ Creates recommendation records for ALL assigned investors
3. ✅ Stores recommendations in `investment_advisor_recommendations` table
4. ✅ Updates UI to show recommendation status
5. ✅ Shows recommendations to investors in "Recommended" sub-tab
6. ✅ Displays advisor name and notes on recommendation cards

**Current Status:** Fully functional but with limited customization options.

**Key Benefit:** Allows advisors to quickly share investment opportunities with all their assigned investors in one click.



