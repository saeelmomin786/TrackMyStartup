# Investment Advisor "Make Offer" Feature Implementation

**Status:** Phase 1 Implementation Complete - Phase 2 In Progress
**Date Created:** January 27, 2026  
**Last Updated:** January 27, 2026
**Target File:** `components/InvestmentAdvisorView.tsx`

---

## 📌 Overview

Enable Investment Advisors to create investment offers directly (as the investor). This feature allows advisors to invest in startups via offers while maintaining the approval workflow.

**Key Difference from Investor Offers:**
- Investor makes own offers (direct investment)
- Investment Advisor makes own offers (direct investment as advisor)

---

## 🎯 Core Features to Implement

### 1. **Make Offer Button**
- Location: Discovery tab pitch cards (same as investor view)
- Visibility: Only on active fundraising startup cards
- Action: Opens "Create Offer" modal

### 2. **Make Offer Modal**
**Form Fields:**
- `Offer Amount *` (required) - Text input
  - Currency will be selected separately
  - Numeric validation (positive number)
  
- `Equity Percentage *` (required) - Text input
  - Range: 0-100
  - Can be decimal (e.g., 2.5%)
  
- `Currency *` (required) - Dropdown
  - Load from `general_data` table (category: 'currency')
  - Default: Advisor's home currency or investor's preferred currency
  
- `Upfront Fee` (optional) - Text input
  - Numeric value (can be decimal)
  - Represents upfront/initial fee amount
  - In same currency as offer amount
  - Tooltip: "One-time fee charged upfront"
  
- `Success Fee` (optional) - Text input
  - Numeric value (can be decimal or percentage)
  - Represents success/commission fee
  - In same currency as offer amount OR percentage
  - Tooltip: "Fee charged upon successful investment completion"
  
- `Notes` (optional) - Text area
  - Additional context about the offer
  - Max 500 characters

**NOT INCLUDED:**
- ❌ Co-investment checkbox
- ❌ Co-investment opportunity creation

### 3. **Offer Data Structure**

When advisor creates offer, it should include:
```typescript
{
  investor_email: string              // Advisor's email
  investor_name: string               // Advisor's name
  startup_name: string                // Target startup name
  startup_id: number                  // Target startup ID
  offer_amount: number                // Investment amount
  equity_percentage: number           // Equity stake
  currency: string                    // USD, INR, EUR, etc.
  upfront_fee: number | null          // Optional upfront fee amount
  success_fee: number | null          // Optional success/commission fee
  notes?: string                      // Optional notes
  created_by: string                  // Advisor's auth user ID
  investment_advisor_code: string     // Advisor's code
  investment_advisor_approval_status: 'approved'  // Auto-approved by advisor
  investment_advisor_approval_at: timestamp       // Set to now
  status: 'pending'                   // Waiting for startup advisor approval
  stage: 1                            // Initial stage
}
```

### 4. **Offers Display Section**

Create new "Offers Made" tab/section in Investment Advisor dashboard showing:

**Table Columns:**
- Advisor Name (you)
- Startup Name
- Offer Amount + Currency
- Equity %
- Date Created
- Status (pending/approved/rejected)
- Stage (1-4)
- Advisor Approval (auto-approved ✓)
- Startup Advisor Approval (pending/approved/rejected)
- Actions (View Details, Edit, Withdraw)

**Filters:**
- By Investor
- By Startup
- By Status
- By Stage

---

## 🗄️ Database Integration

### New Fields in `investment_offers` table:
```sql
-- These fields should already exist, but verify:
- investor_email (VARCHAR)
- startup_name (VARCHAR)
- startup_id (INTEGER - foreign key to startups)
- offer_amount (DECIMAL)
- equity_percentage (DECIMAL)
- currency (VARCHAR)
- upfront_fee (DECIMAL, nullable) -- NEW
- success_fee (DECIMAL, nullable) -- NEW
- status (VARCHAR: 'pending', 'accepted', 'rejected')
- stage (INTEGER: 1-4)
- created_by (UUID - foreign key to auth.users)
- investment_advisor_code (VARCHAR) -- new field if not exists
- investor_advisor_approval_status (VARCHAR)
- investor_advisor_approval_at (TIMESTAMP)
- startup_advisor_approval_status (VARCHAR)
- startup_advisor_approval_at (TIMESTAMP)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**RLS Policy Required:**
```sql
-- Allow Investment Advisor to see offers they created
SELECT: created_by = auth.uid()
UPDATE: created_by = auth.uid() AND status = 'pending'
DELETE: created_by = auth.uid() AND status = 'pending'
```

---

## 🛠️ Implementation Steps

### Step 1: Add State Variables (InvestmentAdvisorView.tsx)
```typescript
const [showMakeOfferModal, setShowMakeOfferModal] = useState(false);
const [selectedPitchForOffer, setSelectedPitchForOffer] = useState<ActiveFundraisingStartup | null>(null);
const [offerFormData, setOfferFormData] = useState({
  offer_amount: '',
  equity_percentage: '',
  currency: 'USD',
  upfront_fee: '',
  success_fee: '',
  notes: ''
});
const [offersCreated, setOffersCreated] = useState<any[]>([]); // Track created offers
const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
const [offerCurrencies, setOfferCurrencies] = useState<Array<{code: string, name: string}>>([]); // Load from general_data
```

### Step 2: Load Currencies on Mount
```typescript
useEffect(() => {
  const loadCurrencies = async () => {
    try {
      const data = await generalDataService.getItemsByCategory('currency');
      setOfferCurrencies(data.map(item => ({
        code: item.code || item.name,
        name: item.name
      })));
    } catch (error) {
      console.error('Error loading currencies:', error);
      setOfferCurrencies([
        { code: 'USD', name: 'US Dollar' },
        { code: 'INR', name: 'Indian Rupee' },
        { code: 'EUR', name: 'Euro' }
      ]);
    }
  };
  loadCurrencies();
}, []);
```

### Step 3: Add "Make Offer" Button to Discovery Tab
Location: On each pitch/startup card in discovery tab
```typescript
<button
  onClick={() => {
    setSelectedPitchForOffer(startup);
    setShowMakeOfferModal(true);
  }}
  className="... styles ..."
>
  Make Offer
</button>
```

### Step 4: Create Make Offer Modal Component

**Modal Content:**
- Title: "Create Investment Offer"
- Form with fields mentioned in Step 1
- Submit & Cancel buttons

**Validation:**
- Offer amount > 0
- Equity percentage 0-100
- Currency selected

### Step 5: Handle Offer Submission

```typescript
const handleMakeOfferSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedPitchForOffer) {
    alert('Please select a startup');
    return;
  }
  
  if (!offerFormData.offer_amount || parseFloat(offerFormData.offer_amount) <= 0) {
    alert('Please enter a valid offer amount');
    return;
  }
  
  if (!offerFormData.equity_percentage || 
      parseFloat(offerFormData.equity_percentage) < 0 || 
      parseFloat(offerFormData.equity_percentage) > 100) {
    alert('Please enter equity percentage between 0-100');
    return;
  }
  
  // Validate fees (optional but if provided must be positive)
  if (offerFormData.upfront_fee && parseFloat(offerFormData.upfront_fee) < 0) {
    alert('Upfront fee cannot be negative');
    return;
  }
  
  if (offerFormData.success_fee && parseFloat(offerFormData.success_fee) < 0) {
    alert('Success fee cannot be negative');
    return;
  }
  
  setIsSubmittingOffer(true);
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    const offerPayload = {
      investor_email: currentUser?.email,
      investor_name: currentUser?.name,
      startup_name: selectedPitchForOffer.name,
      startup_id: selectedPitchForOffer.id,
      offer_amount: parseFloat(offerFormData.offer_amount),
      equity_percentage: parseFloat(offerFormData.equity_percentage),
      currency: offerFormData.currency,
      upfront_fee: offerFormData.upfront_fee ? parseFloat(offerFormData.upfront_fee) : null,
      success_fee: offerFormData.success_fee ? parseFloat(offerFormData.success_fee) : null,
      notes: offerFormData.notes || null,
      created_by: authUser?.id,
      investment_advisor_code: currentUser?.investment_advisor_code,
      investment_advisor_approval_status: 'approved',
      investment_advisor_approval_at: new Date().toISOString(),
      status: 'pending',
      stage: 1
    };
    
    // Call investmentService.createInvestmentOffer(offerPayload)
    const result = await investmentService.createInvestmentOffer(offerPayload);
    
    if (result && result.id) {
      // Success
      setOffersCreated(prev => [...prev, result]);
      
      // Close modal
      setShowMakeOfferModal(false);
      setSelectedPitchForOffer(null);
      setOfferFormData({
        offer_amount: '',
        equity_percentage: '',
        currency: 'USD',
        upfront_fee: '',
        success_fee: '',
        notes: ''
      });
      
      // Show success notification
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `Offer created for ${selectedPitchForOffer.name}`,
        type: 'success',
        timestamp: new Date()
      }]);
      
      // Switch to offers tab to show new offer
      setActiveTab('offers'); // or create new tab
    } else {
      throw new Error('Failed to create offer');
    }
  } catch (error) {
    console.error('Error creating offer:', error);
    setNotifications(prev => [...prev, {
      id: Date.now().toString(),
      message: `Failed to create offer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'error',
      timestamp: new Date()
    }]);
  } finally {
    setIsSubmittingOffer(false);
  }
};
```

### Step 6: Display Offers Made Section

Create new section/tab to show all offers made by advisor:

**Features:**
- List all offers created by current advisor
- Show investor, startup, amount, equity, status
- Show approval statuses (auto-approved by advisor)
- Allow editing offer before startup advisor approves
- Allow withdrawing offer (change status to 'withdrawn')
- Sort by date created (newest first)
- Filter by status/investor

### Step 7: Load Offers on Relevant Tabs

```typescript
useEffect(() => {
  const loadOffersCreated = async () => {
    if (!currentUser?.id || !['offers', 'dashboard'].includes(activeTab)) {
      return;
    }
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id) return;
      
      const { data: offers, error } = await supabase
        .from('investment_offers')
        .select('*')
        .eq('created_by', authUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setOffersCreated(offers || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      setOffersCreated([]);
    }
  };
  
  loadOffersCreated();
}, [currentUser?.id, activeTab]);
```

---

## 📊 Approval Workflow

### Investor Advisor Perspective (Creating Offer):
1. Advisor fills offer details for themselves
2. **Advisor's approval = AUTO-APPROVED** ✓
3. Status: `investor_advisor_approval_status: 'approved'` with timestamp
4. Offer sent to startup advisor for approval

### Startup Advisor Perspective (Approving Offer):
1. Sees pending offers in their dashboard
2. **Stage progression:**
   - Stage 1: Initial (pending startup advisor)
   - Stage 2: After startup advisor approves (pending startup owner)
   - Stage 3: After startup owner approves (pending investor)
   - Stage 4: After investor approves (ACTIVE INVESTMENT)

---

## 🧪 Testing Checklist

- [ ] Load currencies from general_data on component mount
- [ ] "Make Offer" button appears on discovery tab pitches
- [ ] Modal opens with correct startup pre-selected
- [ ] Form validation works (amount, equity %)
- [ ] Offer submission creates record in database
- [ ] Advisor approval auto-populated with approval timestamp
- [ ] Offers list displays created offers
- [ ] Filters work on offers list
- [ ] Edit offer modal works (only for pending offers)
- [ ] Withdraw offer changes status
- [ ] Notifications show on success/failure
- [ ] RLS policies prevent unauthorized access
- [ ] Offer appears in recipient investor's offers list

---

## 🔗 Related Components

- **investmentService.createInvestmentOffer()** - Already exists, may need updates for advisor context
- **generalDataService.getItemsByCategory()** - For currencies
- **InvestmentAdvisorView.tsx** - Main component
- **investment_offers table** - Database
- **User notifications system** - For success/error messages

---

## 📝 Notes

1. **No Co-Investment:** This feature does NOT include co-investment opportunity creation
2. **Auto-Approval:** Advisor's approval is automatic when they create the offer
3. **Investor Selection:** Advisor is the investor making the offer (not on behalf of others)
4. **Currency Support:** Pull from general_data table for consistency
5. **Audit Trail:** Track created_by, approval timestamps for compliance
6. **RLS Security:** Ensure advisors can only see their own created offers

---

## 🚀 Phase Breakdown

**Phase 1:** UI & Form (Button, Modal, Fields)  
**Phase 2:** Submission Logic & Database Integration  
**Phase 3:** Display & Management (Offers list, Filters, Edit/Withdraw)  
**Phase 4:** Testing & Refinement  

---

## 📋 Files to Modify

1. **components/InvestmentAdvisorView.tsx** - Main implementation
2. **lib/investmentService.ts** - Update createInvestmentOffer if needed
3. Database migration - Add new fields if they don't exist
4. **lib/supabase.ts** - If RLS policies need updates
