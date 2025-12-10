# Investor Dashboard - Comprehensive Analysis

## Overview
The Investor Dashboard (`components/InvestorView.tsx`) is a comprehensive interface for investors to manage their portfolio, discover investment opportunities, make offers, and track their investments. This document provides a detailed analysis of its structure, functionality, and implementation.

---

## Component Architecture

### Main Component
**File:** `components/InvestorView.tsx`  
**Lines:** 1-3629  
**Type:** React Functional Component with TypeScript

### Props Interface
```typescript
interface InvestorViewProps {
  startups: Startup[];                    // Portfolio startups
  newInvestments: NewInvestment[];        // Investment opportunities
  startupAdditionRequests: StartupAdditionRequest[];  // Pending requests
  investmentOffers: InvestmentOffer[];    // Investor's offers
  currentUser?: {                         // Current investor user
    id: string;
    email: string;
    investorCode?: string;
    investor_code?: string;
  };
  onViewStartup: (startup: Startup) => void;
  onAcceptRequest: (id: number) => void;
  onMakeOffer: (opportunity, amount, equity, currency?, wantsCoInvestment?, coInvestmentOpportunityId?) => void;
  onUpdateOffer?: (offerId, amount, equity) => void;
  onCancelOffer?: (offerId: number) => void;
  isViewOnly?: boolean;                   // Read-only mode
  initialTab?: 'dashboard' | 'reels' | 'offers' | 'portfolio';
}
```

---

## Tab Structure

The dashboard has **4 main tabs**:

### 1. Dashboard Tab (`activeTab === 'dashboard'`)

**Location:** Lines 1640-1752

#### Features:
- **Summary Cards** (4 metrics):
  - Total Funding: Sum of all portfolio startup funding
  - Total Revenue: Sum of all portfolio startup revenue
  - Compliance Rate: Percentage of compliant startups
  - My Startups: Count of portfolio startups

- **Approve Startup Requests Section:**
  - Table showing pending startup addition requests
  - Filters by investor code matching
  - "Approve" button for each request
  - Only shows pending requests matching investor's code

- **My Startups Table:**
  - Lists all portfolio startups
  - Columns: Startup Name, Current Valuation, Compliance Status, Actions
  - "View" button opens startup dashboard in read-only mode
  - Displays sector as subtitle under startup name

- **Portfolio Distribution Chart:**
  - Visual representation of portfolio by sector/domain
  - Uses `PortfolioDistributionChart` component

#### Data Sources:
- `startups` prop (portfolio startups)
- `startupAdditionRequests` prop (filtered by investor code)

---

### 2. Discover Pitches Tab (`activeTab === 'reels'`)

**Location:** Lines 1754-2710

#### Features:

**Header Section:**
- Title: "Discover Pitches"
- Search bar for filtering startups by name or sector
- Sub-tabs for filtering:
  - **All**: Shows all active fundraising startups
  - **Verified**: Only Startup Nation validated startups
  - **Favorites**: Investor's favorited startups
  - **Due Diligence**: Startups with due diligence access
  - **Recommended**: AI/ML recommended opportunities
  - **Co-Investment**: Co-investment opportunities

**Pitch Display:**
- Video pitch reels interface
- Shuffled display (2:1 ratio of verified to unverified)
- Each pitch card shows:
  - Startup name and sector
  - Investment ask (amount and equity %)
  - Compliance status badge
  - Validation badge (if Startup Nation validated)
  - Favorite button (heart icon)
  - Due diligence button
  - Make offer button
  - Share button
  - View pitch deck/one-pager links
  - Embedded YouTube video player

**Co-Investment Opportunities:**
- Lists active co-investment opportunities (stage 4, approved)
- Shows lead investor commitment and remaining amount
- "Make Offer" button for co-investment
- Displays startup details and investment terms

**Recommended Opportunities:**
- AI/ML-based recommendations
- Fetched from recommendation service
- Personalized based on investor profile

#### Data Sources:
- `activeFundraisingStartups` (from `investorService.getActiveFundraisingStartups()`)
- `recommendedOpportunities` (from recommendation API)
- `coInvestmentOpportunities` (from `co_investment_opportunities` table)
- `favoritedPitches` (from `investor_favorites` table)
- `dueDiligenceStartups` (from `due_diligence_requests` table)

#### Key Functions:
- `handleFavoriteToggle()`: Add/remove favorites
- `handleDueDiligenceClick()`: Request due diligence access
- `handleMakeOfferClick()`: Open offer modal
- `handleShare()`: Share startup pitch

---

### 3. Offers Tab (`activeTab === 'offers'`)

**Location:** Lines 2711-3221

#### Features:

**Your Offers Section:**
- Lists all investment offers made by investor
- Shows both regular and co-investment offers
- Each offer displays:
  - Startup name
  - Offer amount and equity percentage
  - Currency
  - Submission date
  - Status badge (pending, approved, accepted, etc.)
  - Stage indicator (for multi-stage approval)
  - Edit/Cancel buttons (only at stage 1)
  - View Contact Details button (when approved)
  - Next Steps button (when accepted)
  - Pitch deck/one-pager/video links

**Co-Investment Offers Section:**
- Shows co-investment offers received by lead investor
- Two categories:
  - **Pending**: Awaiting lead investor approval
  - **Approved**: Sent to startup for review
- Lead investor can approve/reject co-investment offers
- Shows investor details, offer amount, equity requested

**Co-Investment You Created:**
- Lists co-investment opportunities created by investor
- Shows approval stages:
  - Stage 1: Lead investor advisor approval
  - Stage 2: Startup advisor approval
  - Stage 3: Startup review
  - Stage 4: Accepted by startup
- Displays:
  - Total investment ask
  - Lead investor commitment
  - Remaining amount for co-investment
  - Equity percentages
  - Approval status for each stage

#### Data Sources:
- `investmentOffers` prop (from `investmentService.getUserInvestmentOffers()`)
- `pendingCoInvestmentOffers` (from `co_investment_offers` table)
- `myCoInvestmentOpps` (from `co_investment_opportunities` table)

#### Key Functions:
- `handleEditOffer()`: Edit offer amount/equity
- `handleCancelOffer()`: Cancel an offer
- `handleLeadInvestorApproval()`: Approve/reject co-investment offers
- `handleViewCoInvestmentDetails()`: View co-investment details

---

### 4. Portfolio Tab (`activeTab === 'portfolio'`)

**Location:** Lines 3223-3284

#### Features:
- **Two-column layout:**
  - **Left**: Investor Profile Form (`InvestorProfileForm`)
  - **Right**: Investor Card Preview (`InvestorCard`)

**Investor Profile Form:**
- Edit investor profile details
- Real-time preview updates
- Fields include:
  - Company name
  - Logo
  - Description
  - Investment focus
  - Portfolio companies
  - Contact details
  - Social links

**Investor Card Preview:**
- Live preview of how profile appears to startups
- Shows on Discover page
- Updates as form is filled

#### Data Sources:
- `currentUser` prop
- `investor_profiles` table (via `InvestorProfileForm`)

---

## State Management

### Key State Variables:

```typescript
// Tab management
const [activeTab, setActiveTab] = useState<'dashboard' | 'reels' | 'offers' | 'portfolio'>('dashboard');
const [discoverySubTab, setDiscoverySubTab] = useState<'all' | 'verified' | 'favorites' | 'due-diligence' | 'recommended' | 'co-investment'>('all');

// Data
const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
const [recommendedOpportunities, setRecommendedOpportunities] = useState<any[]>([]);
const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
const [coInvestmentOpportunities, setCoInvestmentOpportunities] = useState<any[]>([]);
const [myCoInvestmentOpps, setMyCoInvestmentOpps] = useState<any[]>([]);
const [pendingCoInvestmentOffers, setPendingCoInvestmentOffers] = useState<any[]>([]);

// UI state
const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
const [selectedOpportunity, setSelectedOpportunity] = useState<ActiveFundraisingStartup | null>(null);
const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
const [showOnlyValidated, setShowOnlyValidated] = useState(false);
const [showOnlyDueDiligence, setShowOnlyDueDiligence] = useState(false);
```

### URL State Management:
- Tab state synced with URL query params (`?tab=dashboard`)
- Pitch ID synced when viewing specific pitch (`?pitchId=123`)
- Uses `getQueryParam` and `setQueryParam` from `lib/urlState`

---

## Data Fetching & Services

### Services Used:

1. **`investorService`** (`lib/investorService.ts`):
   - `getActiveFundraisingStartups()`: Fetches active fundraising startups
   - `getStartupDetails()`: Gets specific startup details
   - `getYoutubeEmbedUrl()`: Converts YouTube URLs to embed format
   - `formatCurrency()`: Formats currency for display

2. **`investmentService`** (`lib/database.ts`):
   - `getUserInvestmentOffers()`: Gets investor's offers
   - `createInvestmentOffer()`: Creates new offer
   - `updateInvestmentOffer()`: Updates existing offer
   - `cancelInvestmentOffer()`: Cancels an offer

3. **`paymentService`** (`lib/paymentService.ts`):
   - `hasApprovedDueDiligence()`: Checks due diligence access
   - `createPendingDueDiligenceIfNeeded()`: Creates due diligence request

4. **Supabase Client** (`lib/supabase.ts`):
   - Direct database queries for:
     - `investor_favorites` table
     - `due_diligence_requests` table
     - `co_investment_opportunities` table
     - `co_investment_offers` table
     - `investor_profiles` table

### Data Fetching Flow:

1. **On Component Mount:**
   - Fetches active fundraising startups
   - Loads favorited pitches
   - Loads due diligence access
   - Loads investor profile

2. **On Tab Switch:**
   - Dashboard: Uses props data (no additional fetch)
   - Reels: Fetches active fundraising startups
   - Offers: Fetches offers and co-investment data
   - Portfolio: Loads investor profile

3. **On Sub-tab Switch (Reels):**
   - All: Shows all active fundraising startups
   - Verified: Filters by validation status
   - Favorites: Filters by favorited startups
   - Due Diligence: Filters by due diligence access
   - Recommended: Fetches recommendations
   - Co-Investment: Fetches co-investment opportunities

---

## Key Features & Functionality

### 1. Portfolio Management
- View portfolio startups
- Track total funding and revenue
- Monitor compliance rate
- View portfolio distribution by sector

### 2. Startup Discovery
- Browse active fundraising startups
- Watch pitch videos
- View pitch decks and one-pagers
- Search and filter startups
- Favorite startups for later
- Request due diligence access

### 3. Investment Offers
- Make investment offers
- Edit/cancel offers (before approval)
- Track offer status through approval stages
- View contact details (after approval)
- Support for multiple currencies

### 4. Co-Investment
- Create co-investment opportunities
- Make co-investment offers
- Approve/reject co-investment offers (as lead investor)
- Track co-investment approval stages

### 5. Due Diligence
- Request due diligence access
- View startups with approved due diligence
- Access full startup dashboard (read-only)

### 6. Recommendations
- AI/ML-based startup recommendations
- Personalized opportunity suggestions

### 7. Investor Profile
- Edit investor profile
- Preview investor card
- Manage public-facing information

---

## Integration Points

### 1. Startup Dashboard Integration
- Investors can view startup dashboards in read-only mode
- Entry points:
  - "View" button in portfolio startups table
  - Due diligence approved startups
  - Co-investment opportunities
- Uses `onViewStartup` prop callback
- Navigates to `StartupHealthView` component

### 2. Investment Advisor View
- Investment advisors can view investor dashboards
- Modal overlay with read-only mode
- Shows investor's portfolio, offers, and requests
- `isViewOnly={true}` prevents actions

### 3. Admin View
- Admins can view investor dashboards
- Similar to Investment Advisor View
- Full access to investor data

---

## UI/UX Features

### Responsive Design:
- Mobile-friendly layout
- Responsive grid systems
- Collapsible sections
- Touch-friendly buttons

### Visual Elements:
- Summary cards with icons
- Status badges with colors
- Progress indicators
- Charts and graphs
- Video embeds
- Modal dialogs

### User Experience:
- Loading states
- Error handling
- Empty states
- Search functionality
- Filtering options
- Sorting capabilities

---

## Approval Workflows

### 1. Investment Offer Approval:
- **Stage 1**: Investor submits offer (can edit/cancel)
- **Stage 2**: Investor advisor approval (if assigned)
- **Stage 3**: Startup advisor approval (if assigned)
- **Stage 4**: Startup review and approval
- **Completed**: Offer accepted, contact details revealed

### 2. Co-Investment Approval:
- **Stage 1**: Lead investor advisor approval
- **Stage 2**: Startup advisor approval
- **Stage 3**: Startup review
- **Stage 4**: Accepted by startup

### 3. Due Diligence Approval:
- Investor requests due diligence
- Startup approves/rejects request
- Approved: Full dashboard access (read-only)

---

## Security & Permissions

### View-Only Mode:
- `isViewOnly` prop controls read-only access
- Prevents:
  - Making offers
  - Editing offers
  - Favoriting startups
  - Editing profile
  - Accepting requests

### Investor Code Matching:
- Startup addition requests filtered by investor code
- Only shows requests matching investor's code
- Prevents unauthorized access

### Due Diligence Access:
- Requires startup approval
- Tracks access in `due_diligence_requests` table
- Read-only dashboard access

---

## Performance Considerations

### Data Loading:
- Lazy loading for pitch videos
- Pagination for large lists
- Caching of frequently accessed data
- Background data updates

### Optimization:
- Memoization of computed values
- Debounced search
- Virtual scrolling for long lists
- Image lazy loading

---

## Known Issues & Limitations

1. **Investment Advisor View:**
   - `onViewStartup` handler is empty in modal
   - Cannot navigate to startup dashboards from modal

2. **Data Freshness:**
   - No automatic refresh mechanism
   - Manual refresh required for updates

3. **Navigation:**
   - No breadcrumbs for deep navigation
   - Limited back button support

4. **Permissions:**
   - Granular permissions not fully implemented
   - All investors see same data structure

---

## Recommendations

### 1. Enhance Navigation:
- Add breadcrumbs
- Implement back button
- Better deep linking

### 2. Improve Data Freshness:
- Add refresh button
- Implement auto-refresh
- Real-time updates via WebSocket

### 3. Fix Investment Advisor View:
- Implement proper `onViewStartup` handler
- Allow navigation to startup dashboards

### 4. Enhanced Permissions:
- Granular view permissions
- Role-based data access
- Customizable visibility

### 5. Performance:
- Implement pagination
- Add virtual scrolling
- Optimize data fetching

### 6. Analytics:
- Track investor engagement
- Monitor offer conversion rates
- Analyze portfolio performance

---

## Code Quality

### Strengths:
- Well-structured component
- TypeScript type safety
- Comprehensive error handling
- Good separation of concerns
- Reusable UI components

### Areas for Improvement:
- Large component (3629 lines) - consider splitting
- Some duplicate logic
- Complex state management
- Could benefit from state management library (Redux/Zustand)

---

## Testing Recommendations

1. **Unit Tests:**
   - Test individual functions
   - Test state management
   - Test data transformations

2. **Integration Tests:**
   - Test API integrations
   - Test navigation flows
   - Test approval workflows

3. **E2E Tests:**
   - Test complete user journeys
   - Test offer submission flow
   - Test co-investment flow

---

## Conclusion

The Investor Dashboard is a comprehensive, feature-rich interface that enables investors to:
- Manage their portfolio
- Discover investment opportunities
- Make and track offers
- Participate in co-investments
- Request due diligence access
- Manage their public profile

The component is well-structured but could benefit from:
- Code splitting for maintainability
- Enhanced navigation
- Better data freshness
- Performance optimizations

Overall, it provides a solid foundation for investor engagement and portfolio management.


