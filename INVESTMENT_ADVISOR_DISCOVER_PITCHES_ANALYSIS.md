# Investment Advisor Dashboard - Discover Pitches Section Analysis

## Overview
The **Discover Pitches** section in the Investment Advisor Dashboard allows advisors to browse active fundraising startups, recommend them to their assigned investors, and manage their own favorites. It's located in the `discovery` tab of the `InvestmentAdvisorView` component.

**Location:** `components/InvestmentAdvisorView.tsx` (Lines 4563-4923)

---

## Architecture & Structure

### Component Location
- **Main Component:** `components/InvestmentAdvisorView.tsx`
- **Tab Identifier:** `activeTab === 'discovery'`
- **Section Start:** Line 4563
- **Total Lines:** ~360 lines of code

### Key State Variables

```typescript
// Data State
const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
const [recommendedStartups, setRecommendedStartups] = useState<Set<number>>(new Set());

// UI State
const [searchTerm, setSearchTerm] = useState('');
const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
const [showOnlyValidated, setShowOnlyValidated] = useState(false);
const [showOnlyDueDiligence, setShowOnlyDueDiligence] = useState(false);
const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
const [dueDiligenceStartups, setDueDiligenceStartups] = useState<Set<number>>(new Set<number>());
const [approvedDueDiligenceStartups, setApprovedDueDiligenceStartups] = useState<Set<number>>(new Set<number>());
const [isLoadingPitches, setIsLoadingPitches] = useState(false);
```

---

## Features Breakdown

### 1. Header Section (Lines 4566-4678)

#### Title & Description
- **Title:** "Discover Pitches"
- **Subtitle:** "Watch startup videos and explore opportunities for your investors"
- **Styling:** Centered text with responsive sizing (text-xl to text-3xl)

#### Search Bar (Lines 4573-4587)
- **Functionality:** Real-time search filtering
- **Search Fields:** Startup name OR sector
- **Placeholder:** "Search startups by name or sector..."
- **Icon:** Inline SVG search icon (not lucide-react)
- **Styling:** Full-width input with focus ring

#### Filter Buttons (Lines 4589-4663)
Four filtering buttons (not sub-tabs like Investor Dashboard):

1. **All** (Video icon, blue)
   - Shows all active fundraising startups
   - Default view
   - Resets all filters

2. **Verified** (CheckCircle icon, green)
   - Only Startup Nation validated startups
   - Filters by `isStartupNationValidated === true`

3. **Favorites** (Heart icon, red)
   - Advisor's favorited startups
   - Filters by `favoritedPitches.has(startup.id)`

4. **Due Diligence** (Search icon, purple)
   - Startups with due diligence access
   - Filters by `dueDiligenceStartups.has(startup.id)`

**Note:** Unlike Investor Dashboard, there are NO:
- Recommended sub-tab
- Co-Investment sub-tab

#### Status Indicator (Lines 4665-4676)
- **Live Count:** Shows number of active pitches
- **Visual Indicator:** Animated green pulse dot
- **Icon:** Video icon for "Pitch Reels"
- **Layout:** Flex layout with responsive gap

---

### 2. Pitch Shuffling Algorithm (Lines 932-958)

#### Purpose
Shuffles pitches to provide variety, but **DIFFERENT from Investor Dashboard**.

#### Algorithm Details

```typescript
// Step 1: Separate verified and unverified startups
const verified = activeFundraisingStartups.filter(startup => 
    startup.complianceStatus === ComplianceStatus.Compliant
);
const unverified = activeFundraisingStartups.filter(startup => 
    startup.complianceStatus !== ComplianceStatus.Compliant
);

// Step 2: Shuffle each group independently
const shuffledVerified = shuffleArray(verified);
const shuffledUnverified = shuffleArray(unverified);

// Step 3: Simple concatenation (NOT 2:1 ratio like Investor Dashboard)
const mixed = [...shuffledVerified, ...shuffledUnverified];
```

#### Key Differences from Investor Dashboard:
- **No 2:1 Ratio:** Verified startups are NOT prioritized
- **Simple Concatenation:** All verified first, then all unverified
- **No Interleaving:** Unlike Investor Dashboard's sophisticated mixing

#### Shuffle Implementation
- Uses Fisher-Yates shuffle algorithm
- Creates independent random order for each group
- Simpler approach than Investor Dashboard

---

### 3. Filtering System (Lines 4690-4714)

#### Filter Chain
Filters are applied sequentially (same as Investor Dashboard):

1. **Search Filter** (Lines 4695-4700)
   - Case-insensitive matching
   - Searches: `startup.name` OR `startup.sector`
   - Applied first

2. **Validation Filter** (Lines 4703-4705)
   - Only if `showOnlyValidated === true`
   - Filters by `isStartupNationValidated`

3. **Favorites Filter** (Lines 4708-4710)
   - Only if `showOnlyFavorites === true`
   - Filters by `favoritedPitches.has(startup.id)`

4. **Due Diligence Filter** (Lines 4712-4714)
   - Only if `showOnlyDueDiligence === true`
   - Filters by `dueDiligenceStartups.has(startup.id)`

#### Data Source Selection
```typescript
const pitchesToShow = activeTab === 'discovery' 
    ? shuffledPitches  // Use shuffled for discovery tab
    : activeFundraisingStartups;  // Use original for other tabs
```

---

### 4. Pitch Card Component (Lines 4752-4918)

Each pitch is displayed as a card with multiple sections:

#### A. Video Section (Lines 4757-4804)
- **Aspect Ratio:** 16:9 (widescreen)
- **Background:** Gradient slate background
- **Video Support:**
  - YouTube embeds only (iframe)
  - **NO direct video URL support** (unlike Investor Dashboard)
  - Auto-play when clicked
  - Full-screen support
- **Fallback Options:**
  - Placeholder with Video icon if no video
  - **NO logo fallback** (unlike Investor Dashboard)
- **Play Button:** Large red circular play button overlay
- **Close Button:** Appears when video is playing

#### B. Content Section (Lines 4807-4901)

**Startup Information:**
- **Name:** Large, bold heading (responsive sizing)
- **Sector:** Displayed as subtitle
- **NO Domain/Round/Stage:** Unlike Investor Dashboard
- **NO Recommended Badge:** No recommendation display
- **NO Advisor Attribution:** No advisor name display

**Status Badges:**
- **Verified Badge:** Green gradient (if Startup Nation validated)
- **NO Offer Submitted Badge:** Advisors don't make offers

**Document Links:**
- **Pitch Deck:** Opens in new tab (if available)
- **One-Pager/Business Plan:** Opens in new tab (if available)
- **NO Business Plan separate button:** Uses one-pager URL for business plan

**Action Buttons Row:**
- **Favorite Button:** Heart icon, toggles favorite status
- **Share Button:** Opens native share dialog or copies link
- **Due Diligence Button:** Requests/indicates due diligence access
- **Recommend to Investors Button:** **UNIQUE TO ADVISOR DASHBOARD**
  - Green gradient when not recommended
  - Blue gradient when recommended
  - Shows "Recommended ✓" when active
  - Creates recommendations for all assigned investors

#### C. Investment Details Footer (Lines 4904-4916)

**Investment Ask:**
- **Format:** "Ask: [currency] for [equity]% equity"
- **Currency Formatting:** Uses `investorService.formatCurrency()`
- **Styling:** Bold ask amount, blue equity percentage

**Compliance Badge:**
- Green checkmark with "Verified" text
- Only shown if `complianceStatus === ComplianceStatus.Compliant`

**NO External Links:**
- **NO Website link** (unlike Investor Dashboard)
- **NO LinkedIn link** (unlike Investor Dashboard)

---

### 5. Empty States (Lines 4716-4749)

#### Context-Aware Messages
Different messages based on filter state:

1. **No Matching Startups** (search active)
   - "No startups found matching your search..."
   - Suggests adjusting search terms

2. **No Verified Startups** (verified filter active)
   - "No Startup Nation verified startups are currently fundraising..."
   - Suggests removing filter

3. **No Favorited Pitches** (favorites filter active)
   - "Start favoriting pitches to see them here."

4. **No Due Diligence Access** (due diligence filter active)
   - "Once due diligence access is granted for a startup, it will appear here for quick access."

5. **No Active Fundraising** (default)
   - "No startups are currently fundraising..."
   - Suggests checking back later

**Note:** No "All Offers Submitted" state (advisors don't make offers)

---

### 6. Loading States (Lines 4681-4688)

#### Pitch Loading
- **Spinner:** Animated blue spinner
- **Message:** "Loading Pitches..."
- **Subtext:** "Fetching active fundraising startups"
- **Styling:** White card with shadow

---

## Unique Features (Advisor-Specific)

### 1. Recommend to Investors Button (Lines 4886-4899)

#### Functionality
- **Purpose:** Allows advisor to recommend startups to all assigned investors
- **Action:** `handleRecommendCoInvestment(startupId)`
- **Database:** Creates entries in `investment_advisor_recommendations` table
- **Recipients:** All investors in `myInvestors` array

#### Implementation Details

```typescript
const handleRecommendCoInvestment = async (startupId: number) => {
    // Check if advisor has assigned investors
    if (myInvestors.length === 0) {
        // Show warning notification
        return;
    }
    
    // Get all assigned investor IDs
    const investorIds = myInvestors.map(investor => investor.id);
    
    // Create recommendations for each investor
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
    
    // Update UI state
    setRecommendedStartups(prev => new Set([...prev, startupId]));
    
    // Show success notification
};
```

#### Button States
- **Not Recommended:** Green gradient button
- **Recommended:** Blue gradient button with checkmark
- **Text:** "Recommend to Investors" → "Recommended ✓"

#### Notifications
- **Success:** Shows count of investors recommended to
- **Warning:** If no assigned investors
- **Error:** If recommendation creation fails

---

### 2. Advisor Favorites System

#### Implementation
- Uses same `investor_favorites` table as investors
- Advisors can favorite startups for their own reference
- Stored with `investor_id` = advisor's user ID

#### Functionality
- Same as Investor Dashboard
- Toggle favorite/unfavorite
- Persists to database
- Shows in favorites filter

---

### 3. Due Diligence Access

#### Implementation
- Same as Investor Dashboard
- Requests due diligence access
- Tracks in `due_diligence_requests` table
- Shows approved access status

---

## Data Flow

### 1. Initial Data Fetching

```typescript
// On component mount or tab switch
useEffect(() => {
    if (activeTab === 'discovery' || activeTab === 'interests') {
        fetchActiveFundraisingStartups();
        loadFavoritedPitches();
        loadDueDiligenceAccess();
    }
}, [activeTab]);
```

### 2. Shuffling Process

```typescript
// When activeFundraisingStartups changes
useEffect(() => {
    if (activeTab === 'discovery' && activeFundraisingStartups.length > 0) {
        // Separate verified/unverified
        // Shuffle each group
        // Concatenate (verified first, then unverified)
        setShuffledPitches(mixed);
    }
}, [activeFundraisingStartups, activeTab]);
```

### 3. Filtering Process

```typescript
// On every render with current filters
let filteredPitches = shuffledPitches;

// Apply search
if (searchTerm.trim()) {
    filteredPitches = filteredPitches.filter(...);
}

// Apply validation filter
if (showOnlyValidated) {
    filteredPitches = filteredPitches.filter(...);
}

// Apply favorites filter
if (showOnlyFavorites) {
    filteredPitches = filteredPitches.filter(...);
}

// Apply due diligence filter
if (showOnlyDueDiligence) {
    filteredPitches = filteredPitches.filter(...);
}
```

---

## User Interactions

### 1. Favorite Toggle
- **Action:** Click heart icon
- **Function:** `handleFavoriteToggle(startupId)`
- **Updates:** `favoritedPitches` Set
- **Persistence:** Saved to `investor_favorites` table
- **Error Handling:** Shows detailed error if database operation fails

### 2. Due Diligence Request
- **Action:** Click "Due Diligence" button
- **Function:** `handleDueDiligenceClick(startup)`
- **Process:**
  1. Check if payment required
  2. Create pending request if needed
  3. Update `dueDiligenceStartups` Set
- **Persistence:** Saved to `due_diligence_requests` table

### 3. Recommend to Investors
- **Action:** Click "Recommend to Investors" button
- **Function:** `handleRecommendCoInvestment(startupId)`
- **Process:**
  1. Check if advisor has assigned investors
  2. Get all assigned investor IDs
  3. Create recommendations in database
  4. Update `recommendedStartups` Set
  5. Show success notification
- **Persistence:** Saved to `investment_advisor_recommendations` table
- **Notifications:** Success/warning/error messages

### 4. Share Startup
- **Action:** Click share button
- **Function:** `handleShare(startup)`
- **Process:**
  1. Build shareable URL
  2. Try native share API
  3. Fallback to clipboard copy
  4. Show success message

### 5. Video Playback
- **Action:** Click video thumbnail
- **Function:** Sets `playingVideoId` state
- **Behavior:**
  - Auto-plays video
  - Shows close button
  - Full-screen support
  - **YouTube embeds only** (no direct video support)

### 6. Search
- **Action:** Type in search bar
- **Function:** Updates `searchTerm` state
- **Behavior:**
  - Real-time filtering
  - Case-insensitive
  - Searches name and sector

---

## Comparison: Investment Advisor vs Investor Dashboard

### Similarities ✅
- Same basic structure (header, search, filters, cards)
- Same filtering system (search, verified, favorites, due diligence)
- Same video playback functionality
- Same favorite system
- Same due diligence system
- Same share functionality
- Same empty states

### Key Differences ❌

| Feature | Investor Dashboard | Investment Advisor Dashboard |
|---------|------------------|------------------------------|
| **Sub-tabs** | 6 sub-tabs (All, Verified, Favorites, DD, Recommended, Co-Investment) | 4 filter buttons (All, Verified, Favorites, DD) |
| **Shuffling** | 2:1 ratio (verified:unverified) with interleaving | Simple concatenation (verified first, then unverified) |
| **Recommendations** | View recommended startups from advisor | **Recommend startups TO investors** |
| **Co-Investment** | View and make co-investment offers | Not available |
| **Make Offer** | Can make investment offers | Cannot make offers |
| **Video Support** | YouTube + direct video URLs | YouTube only |
| **Logo Fallback** | Shows logo if no video | No logo fallback |
| **External Links** | Website and LinkedIn links | No external links |
| **Domain/Round/Stage** | Shows domain, round, stage | Only shows sector |
| **Business Plan** | Separate button | Uses one-pager URL |
| **Offer Status** | Shows "Offer Submitted" badge | Not applicable |

---

## Integration Points

### 1. Services Used

**investorService** (`lib/investorService.ts`):
- `getActiveFundraisingStartups()`: Fetches active pitches
- `formatCurrency()`: Formats currency display
- `getYoutubeEmbedUrl()`: Converts YouTube URLs

**paymentService** (`lib/paymentService.ts`):
- `hasApprovedDueDiligence()`: Checks due diligence access
- `createPendingDueDiligenceIfNeeded()`: Creates request

**Supabase Client** (`lib/supabase.ts`):
- Direct queries to:
  - `investor_favorites`
  - `due_diligence_requests`
  - `investment_advisor_recommendations` (unique to advisor)

### 2. Component Dependencies

- **No Card Component:** Uses inline `div` with Tailwind classes
- **No Button Component:** Uses inline `button` elements
- **Icons:** Inline SVG (not lucide-react like Investor Dashboard)
- **Notifications:** Uses notification system for feedback

### 3. Data Tables

**investment_advisor_recommendations:**
- Stores advisor recommendations to investors
- Fields: `investment_advisor_id`, `startup_id`, `investor_id`, `recommendation_notes`, `status`
- Used to track which startups advisor has recommended

---

## Responsive Design

### Breakpoints Used
- **xs:** Extra small (hidden text)
- **sm:** Small (≥640px)
- **md:** Medium (≥768px)
- **lg:** Large (≥1024px)

### Responsive Features
- **Text Sizing:** Responsive font sizes (text-xs to text-3xl)
- **Button Labels:** Shortened on mobile (e.g., "Rec ✓" vs "Recommended ✓")
- **Layout:** Flex column on mobile, row on desktop
- **Cards:** Full width on mobile, max-width on desktop
- **Icons:** Smaller on mobile (h-3 w-3 vs h-4 w-4)

---

## Performance Considerations

### 1. Memoization
- Filtered results computed on each render
- Could benefit from `useMemo` for expensive filters

### 2. Data Fetching
- Fetches all pitches at once (no pagination)
- Could impact performance with large datasets

### 3. Video Loading
- Videos load on-demand (when clicked)
- Prevents initial page load slowdown

### 4. Shuffling
- Shuffles on every data change
- Simpler algorithm than Investor Dashboard

### 5. Recommendation Creation
- Creates recommendations for ALL assigned investors at once
- Uses `Promise.all()` for parallel database inserts
- Could be slow with many assigned investors

---

## Known Issues & Limitations

### 1. No Pagination
- All pitches loaded at once
- Could be slow with 100+ startups

### 2. Shuffling Resets
- Shuffles on every data refresh
- User loses scroll position

### 3. Search Performance
- No debouncing on search input
- Filters on every keystroke

### 4. Video Support
- **Only YouTube embeds** (no direct video URLs)
- Less flexible than Investor Dashboard

### 5. No Logo Fallback
- Shows placeholder if no video
- Doesn't show startup logo (unlike Investor Dashboard)

### 6. Recommendation Performance
- Creates recommendations synchronously for all investors
- Could timeout with many investors

### 7. No External Links
- Missing website and LinkedIn links
- Less information than Investor Dashboard

---

## Recommendations for Improvement

### 1. Performance
- **Add Pagination:** Load 20 pitches at a time
- **Debounce Search:** Wait 300ms before filtering
- **Memoize Filters:** Use `useMemo` for filtered results
- **Virtual Scrolling:** For large lists
- **Batch Recommendations:** Process in smaller batches

### 2. User Experience
- **Save Scroll Position:** Persist scroll on tab switch
- **Stable Shuffling:** Use seed-based shuffle
- **Loading Skeletons:** Show skeleton cards while loading
- **Infinite Scroll:** Load more as user scrolls
- **Add Logo Fallback:** Show logo if no video (like Investor Dashboard)

### 3. Features
- **Advanced Filters:** Filter by sector, stage, amount
- **Sorting Options:** Sort by date, amount, equity
- **Direct Video Support:** Support direct video URLs (like Investor Dashboard)
- **External Links:** Add website and LinkedIn links
- **Domain/Round/Stage:** Show more startup details
- **Recommendation Notes:** Allow custom notes when recommending

### 4. Code Quality
- **Extract Components:** Break pitch card into separate component
- **Custom Hooks:** Extract filtering logic to hook
- **Type Safety:** Improve TypeScript types
- **Error Boundaries:** Add error handling
- **Use lucide-react:** Replace inline SVGs with icon library

### 5. Consistency
- **Match Investor Dashboard:** Align features and UI
- **Unified Components:** Share components between dashboards
- **Consistent Shuffling:** Use same algorithm as Investor Dashboard

### 6. Analytics
- **Track Recommendations:** Log recommendation clicks
- **Track Favorites:** Log favorite toggles
- **Track Video Plays:** Log video engagement
- **Conversion Tracking:** Track recommendation → offer flow

---

## Code Statistics

- **Total Lines:** ~360 lines
- **State Variables:** 10+
- **useEffect Hooks:** 3+
- **Event Handlers:** 5+
- **Unique Features:** 1 (Recommend to Investors)

---

## Conclusion

The Investment Advisor Dashboard's Discover Pitches section is a **simplified version** of the Investor Dashboard with a **unique recommendation feature**. It provides:

✅ **Core Discovery:** Browse and filter startups  
✅ **Recommendation System:** Recommend startups to assigned investors  
✅ **Advisor Favorites:** Personal favorite system  
✅ **Due Diligence:** Request access to startup details  
✅ **Responsive Design:** Works on all devices  

**Key Differentiators:**
- **Recommend to Investors:** Unique advisor-only feature
- **Simpler UI:** Fewer sub-tabs and features
- **Simpler Shuffling:** No prioritization algorithm
- **Less Information:** Missing some details (external links, domain/round/stage)

**Areas for Enhancement:**
- Performance optimization (pagination, memoization)
- Feature parity with Investor Dashboard
- Better video support (direct URLs, logo fallback)
- Improved recommendation system (custom notes, batch processing)
- Code consistency and component reuse

Overall, it serves as a functional discovery interface for advisors, but could benefit from feature alignment with the Investor Dashboard and performance improvements.



