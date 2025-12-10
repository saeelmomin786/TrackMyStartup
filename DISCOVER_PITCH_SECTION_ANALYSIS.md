# Discover Pitch Section - Comprehensive Analysis

## Overview
The **Discover Pitches** section is a core feature of the Investor Dashboard that allows investors to browse, filter, and interact with active fundraising startups. It's located in the `reels` tab of the `InvestorView` component.

**Location:** `components/InvestorView.tsx` (Lines 2725-3700+)

---

## Architecture & Structure

### Component Location
- **Main Component:** `components/InvestorView.tsx`
- **Tab Identifier:** `activeTab === 'reels'`
- **Section Start:** Line 2725
- **Total Lines:** ~975 lines of code

### Key State Variables

```typescript
// Data State
const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
const [recommendations, setRecommendations] = useState<any[]>([]);
const [coInvestmentOpportunities, setCoInvestmentOpportunities] = useState<any[]>([]);

// UI State
const [discoverySubTab, setDiscoverySubTab] = useState<'all' | 'verified' | 'favorites' | 'due-diligence' | 'recommended' | 'co-investment'>('all');
const [searchTerm, setSearchTerm] = useState('');
const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
const [showOnlyValidated, setShowOnlyValidated] = useState(false);
const [showOnlyDueDiligence, setShowOnlyDueDiligence] = useState(false);
const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
const [dueDiligenceStartups, setDueDiligenceStartups] = useState<Set<number>>(new Set());
```

---

## Features Breakdown

### 1. Header Section (Lines 2727-2879)

#### Title & Description
- **Title:** "Discover Pitches"
- **Subtitle:** "Watch startup videos and explore opportunities"
- **Styling:** Centered text with responsive sizing

#### Search Bar (Lines 2734-2746)
- **Functionality:** Real-time search filtering
- **Search Fields:** Startup name OR sector
- **Placeholder:** "Search startups by name or sector..."
- **Icon:** Search icon (lucide-react)
- **Styling:** Full-width input with focus ring

#### Discovery Sub-Tabs (Lines 2748-2858)
Six filtering sub-tabs with icons and responsive labels:

1. **All** (Film icon)
   - Shows all active fundraising startups
   - Default view

2. **Verified** (CheckCircle icon, green)
   - Only Startup Nation validated startups
   - Filters by `isStartupNationValidated === true`

3. **Favorites** (Heart icon, red)
   - Investor's favorited startups
   - Filters by `favoritedPitches.has(startup.id)`

4. **Due Diligence** (Shield icon, purple)
   - Startups with due diligence access
   - Filters by `dueDiligenceStartups.has(startup.id)`

5. **Recommended** (Star icon, purple)
   - AI/ML recommended opportunities
   - Fetched from recommendation service
   - Shows advisor name and recommendation notes

6. **Co-Investment** (Users icon, orange)
   - Active co-investment opportunities
   - Shows lead investor details
   - Displays remaining investment amount

#### Status Indicator (Lines 2860-2878)
- **Live Count:** Shows number of pitches/opportunities
- **Dynamic Text:** Changes based on active sub-tab
- **Visual Indicator:** Animated green pulse dot
- **Icon:** Film icon for "Pitch Reels"

---

### 2. Pitch Shuffling Algorithm (Lines 1086-1121)

#### Purpose
Prioritizes verified startups while maintaining variety in the feed.

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

// Step 3: Interleave with 2:1 ratio (66% verified, 33% unverified)
// Pattern: V, V, U, V, V, U, V, V, U...
```

#### Shuffle Implementation
- Uses Fisher-Yates shuffle algorithm
- Creates independent random order for each group
- Maintains fairness while prioritizing verified startups

#### Ratio Logic
- **2 verified pitches** for every **1 unverified pitch**
- Ensures verified startups get more visibility
- Still shows unverified opportunities for discovery

---

### 3. Filtering System (Lines 3489-3513)

#### Filter Chain
Filters are applied sequentially:

1. **Search Filter** (Lines 3494-3499)
   - Case-insensitive matching
   - Searches: `startup.name` OR `startup.sector`
   - Applied first

2. **Validation Filter** (Lines 3502-3504)
   - Only if `showOnlyValidated === true`
   - Filters by `isStartupNationValidated`

3. **Favorites Filter** (Lines 3507-3509)
   - Only if `showOnlyFavorites === true`
   - Filters by `favoritedPitches.has(startup.id)`

4. **Due Diligence Filter** (Lines 3511-3513)
   - Only if `showOnlyDueDiligence === true`
   - Filters by `dueDiligenceStartups.has(startup.id)`

#### Data Source Selection
```typescript
const pitchesToShow = activeTab === 'reels' 
    ? shuffledPitches  // Use shuffled for reels tab
    : activeFundraisingStartups;  // Use original for other tabs
```

---

### 4. Pitch Card Component (Lines 3569-3700+)

Each pitch is displayed as a card with multiple sections:

#### A. Video/Logo Section (Lines 3575-3654)
- **Aspect Ratio:** 16:7 (widescreen)
- **Background:** Gradient slate background
- **Video Support:**
  - YouTube embeds (iframe)
  - Direct video URLs (HTML5 video)
  - Auto-play when clicked
  - Full-screen support
- **Fallback Options:**
  - Startup logo if no video
  - Placeholder with Video icon if neither available
- **Play Button:** Large red circular play button overlay
- **Close Button:** Appears when video is playing

#### B. Content Section (Lines 3657-3423)

**Startup Information:**
- **Name:** Large, bold heading (responsive sizing)
- **Domain, Round, Stage:** Single line with bullet separators
- **Sector:** Displayed as subtitle
- **Recommended Badge:** Shows if from recommendations sub-tab
- **Advisor Name:** Displays recommending advisor
- **Recommendation Notes:** Italicized notes from advisor

**Status Badges:**
- **Verified Badge:** Green gradient (if Startup Nation validated)
- **Offer Submitted Badge:** Blue (if investor has pending offer)
- **Share Button:** Opens native share dialog or copies link

**Document Links Row:**
- **Pitch Deck:** Opens in new tab
- **Business Plan:** Opens in new tab
- **One-Pager:** Opens in new tab
- All buttons are responsive with icon + text

**Action Buttons Row:**
- **Favorite Button:** Heart icon, toggles favorite status
- **Due Diligence Button:** Requests/indicates due diligence access
- **Make Offer Button:** Opens offer modal (disabled if offer already submitted)

#### C. Investment Details Footer (Lines 3425-3468)

**Investment Ask:**
- **Format:** "Ask: [currency] for [equity]% equity"
- **Currency Formatting:** Uses `investorService.formatCurrency()`
- **Styling:** Bold ask amount, purple equity percentage

**External Links:**
- **Website:** Globe icon with truncation
- **LinkedIn:** LinkedIn icon with truncation
- Both open in new tabs with external link indicator

**Compliance Badge:**
- Green checkmark with "Verified" text
- Only shown if `complianceStatus === ComplianceStatus.Compliant`

---

### 5. Co-Investment Opportunities Display (Lines 2884-3081)

#### Special Card Layout
When `discoverySubTab === 'co-investment'`, displays specialized cards:

**Header Section:**
- **Co-Investment Badge:** Orange gradient badge (top-right)
- **Startup Info:** Name and sector
- **Approved Badge:** Green "Approved" indicator

**Lead Investor Section:**
- **Lead Investor Name:** Prominently displayed
- **Investment Breakdown:**
  - Already Invested (blue box)
  - Remaining for Co-Investment (green box)
- **Investment Details:**
  - Total Investment Ask
  - Equity Percentage
  - Co-Investment Range (min-max)
- **Description:** Optional opportunity description

**Action Buttons:**
- **View Startup Profile:** Navigates to startup details
- **Make Co-Investment Offer:** Opens offer modal with co-investment flag
- **Disabled State:** Lead investor cannot make offer on own opportunity

---

### 6. Recommended Startups Display (Lines 3084-3474)

#### Data Transformation
Converts recommendation objects to `ActiveFundraisingStartup` format:

```typescript
const recommendedStartupsForDisplay = recommendations.map(rec => {
    // Try to find matching startup in activeFundraisingStartups
    const matchingStartup = activeFundraisingStartups.find(s => 
        s.id === rec.startup_id || s.name === rec.startup_name
    );
    
    // If found, use it; otherwise create new object
    return matchingStartup || {
        id: rec.startup_id,
        name: rec.startup_name,
        // ... other fields from recommendation
    };
});
```

#### Special Features
- **Recommended Badge:** Purple gradient badge (top-right)
- **Advisor Attribution:** Shows recommending advisor name
- **Recommendation Notes:** Displays advisor's notes
- **Search Integration:** Recommendations are also searchable

---

### 7. Empty States (Lines 3515-3567)

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
   - "Due diligence requests you send will appear here immediately..."

5. **All Offers Submitted** (all pitches have offers)
   - "You've submitted offers for all available startups..."
   - Includes button to go to Dashboard

6. **No Active Fundraising** (default)
   - "No startups are currently fundraising..."
   - Suggests checking back later

---

### 8. Loading States

#### Pitch Loading (Lines 3477-3487)
- **Spinner:** Animated blue spinner
- **Message:** "Loading Pitches..."
- **Subtext:** "Fetching active fundraising startups"

#### Co-Investment Loading (Lines 2886-2894)
- **Spinner:** Animated orange spinner
- **Message:** "Loading Co-Investment Opportunities..."
- **Subtext:** "Fetching approved co-investment opportunities"

#### Recommendations Loading (Lines 3086-3094)
- **Spinner:** Animated purple spinner
- **Message:** "Loading Recommended Startups..."
- **Subtext:** "Fetching recommendations from your advisor"

---

## Data Flow

### 1. Initial Data Fetching

```typescript
// On component mount or tab switch
useEffect(() => {
    if (activeTab === 'reels') {
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
    if (activeTab === 'reels' && activeFundraisingStartups.length > 0) {
        // Separate verified/unverified
        // Shuffle each group
        // Interleave with 2:1 ratio
        setShuffledPitches(result);
    }
}, [activeFundraisingStartups, activeTab]);
```

### 3. Filtering Process

```typescript
// On every render with current filters
let filteredPitches = shuffledPitches; // or activeFundraisingStartups

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

### 4. Sub-Tab Specific Fetching

```typescript
// Recommendations
useEffect(() => {
    if (activeTab === 'reels' && discoverySubTab === 'recommended') {
        fetchRecommendations();
    }
}, [activeTab, discoverySubTab]);

// Co-Investment
useEffect(() => {
    if (activeTab === 'reels' && discoverySubTab === 'co-investment') {
        fetchCoInvestmentOpportunities();
    }
}, [activeTab, discoverySubTab]);
```

---

## User Interactions

### 1. Favorite Toggle
- **Action:** Click heart icon
- **Function:** `handleFavoriteToggle(startupId)`
- **Updates:** `favoritedPitches` Set
- **Persistence:** Saved to `investor_favorites` table

### 2. Due Diligence Request
- **Action:** Click "Due Diligence" button
- **Function:** `handleDueDiligenceClick(startup)`
- **Process:**
  1. Check if payment required
  2. Create pending request if needed
  3. Update `dueDiligenceStartups` Set
- **Persistence:** Saved to `due_diligence_requests` table

### 3. Make Offer
- **Action:** Click "Make Offer" button
- **Function:** `handleMakeOfferClick(startup, isCoInvestment?, coInvestmentOpportunityId?)`
- **Process:**
  1. Set selected opportunity
  2. Open offer modal
  3. Pre-fill startup details
  4. Allow amount/equity input
- **Modal:** `InvestmentOfferModal` component

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
  - YouTube embeds or direct video

### 6. Search
- **Action:** Type in search bar
- **Function:** Updates `searchTerm` state
- **Behavior:**
  - Real-time filtering
  - Case-insensitive
  - Searches name and sector

---

## Integration Points

### 1. Services Used

**investorService** (`lib/investorService.ts`):
- `getActiveFundraisingStartups()`: Fetches active pitches
- `formatCurrency()`: Formats currency display
- `getYoutubeEmbedUrl()`: Converts YouTube URLs

**investmentService** (`lib/database.ts`):
- `getUserInvestmentOffers()`: Gets investor's offers
- Used to check if offer already submitted

**paymentService** (`lib/paymentService.ts`):
- `hasApprovedDueDiligence()`: Checks due diligence access
- `createPendingDueDiligenceIfNeeded()`: Creates request

**Supabase Client** (`lib/supabase.ts`):
- Direct queries to:
  - `investor_favorites`
  - `due_diligence_requests`
  - `co_investment_opportunities`
  - `collaborator_recommendations`

### 2. Component Dependencies

- **Card:** UI card component
- **Button:** UI button component
- **Modal:** Offer modal component
- **ContactDetailsModal:** Contact details display
- **Icons:** lucide-react icon library

### 3. URL State Management

- **Tab State:** Synced with `?tab=reels`
- **Pitch ID:** Synced with `?pitchId=123`
- **Navigation:** Uses `getQueryParam` and `setQueryParam`

---

## Responsive Design

### Breakpoints Used
- **xs:** Extra small (hidden text)
- **sm:** Small (≥640px)
- **md:** Medium (≥768px)
- **lg:** Large (≥1024px)

### Responsive Features
- **Text Sizing:** Responsive font sizes (text-xs to text-3xl)
- **Button Labels:** Shortened on mobile (e.g., "Fav" vs "Favorites")
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
- Could be optimized with stable seed

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

### 4. Video Autoplay
- Auto-plays when clicked
- Could be bandwidth-intensive

### 5. Empty State Detection
- Checks if all pitches have offers
- Logic could be more robust

---

## Recommendations for Improvement

### 1. Performance
- **Add Pagination:** Load 20 pitches at a time
- **Debounce Search:** Wait 300ms before filtering
- **Memoize Filters:** Use `useMemo` for filtered results
- **Virtual Scrolling:** For large lists

### 2. User Experience
- **Save Scroll Position:** Persist scroll on tab switch
- **Stable Shuffling:** Use seed-based shuffle
- **Loading Skeletons:** Show skeleton cards while loading
- **Infinite Scroll:** Load more as user scrolls

### 3. Features
- **Advanced Filters:** Filter by sector, stage, amount
- **Sorting Options:** Sort by date, amount, equity
- **Save Searches:** Allow saving filter combinations
- **Export Results:** Export filtered list to CSV

### 4. Analytics
- **Track Interactions:** Log favorite clicks, video plays
- **A/B Testing:** Test different shuffle ratios
- **Conversion Tracking:** Track offer submissions

### 5. Code Quality
- **Extract Components:** Break pitch card into separate component
- **Custom Hooks:** Extract filtering logic to hook
- **Type Safety:** Improve TypeScript types
- **Error Boundaries:** Add error handling

---

## Code Statistics

- **Total Lines:** ~975 lines
- **State Variables:** 15+
- **useEffect Hooks:** 5+
- **Event Handlers:** 10+
- **Sub-components:** 3 (Co-Investment, Recommended, Regular)

---

## Conclusion

The Discover Pitch section is a well-designed, feature-rich component that provides investors with:

✅ **Comprehensive Discovery:** Multiple filtering options  
✅ **Smart Prioritization:** 2:1 verified ratio  
✅ **Rich Media:** Video and document support  
✅ **User Actions:** Favorite, due diligence, offers  
✅ **Special Features:** Co-investment and recommendations  
✅ **Responsive Design:** Works on all devices  

**Areas for Enhancement:**
- Performance optimization (pagination, memoization)
- Better state management
- More granular filtering options
- Analytics integration

Overall, it's a solid implementation that serves as the primary discovery interface for investors.



