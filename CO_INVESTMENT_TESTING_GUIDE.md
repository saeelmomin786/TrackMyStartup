# Co-Investment Flow Testing Guide

## Overview
This guide tests the complete co-investment flow where investors can indicate they want co-investment partners when making offers.

## Prerequisites
1. ✅ Run `TEST_CO_INVESTMENT_FLOW.sql` in Supabase to verify database setup
2. ✅ Ensure you have at least one startup and one investor user
3. ✅ Startup should be in fundraising mode

## Test Flow Step by Step

### Step 1: Investor Makes Offer with Co-Investment Request

**Action**: Login as Investor → Go to Discover/Reels → Find a startup → Click "Make Offer"

**Expected**:
- [ ] Offer modal opens
- [ ] See "Looking for Co-Investment Partners" checkbox
- [ ] Checkbox has description: "Check this if you want to find other investors to complete the funding round"
- [ ] Can enter offer amount and equity percentage
- [ ] Can check/uncheck co-investment checkbox

**Test Case 1: With Co-Investment**
1. Enter offer amount (e.g., 100,000)
2. Enter equity percentage (e.g., 5%)
3. ✅ **Check the co-investment checkbox**
4. Click "Submit Offer"

**Expected Result**:
- [ ] Success message: "Your offer for [Startup] has been submitted successfully! A co-investment opportunity has been created for the remaining USD 400,000."
- [ ] Offer appears in investor's offers list
- [ ] Co-investment opportunity is created in database

**Test Case 2: Without Co-Investment**
1. Enter offer amount (e.g., 100,000)
2. Enter equity percentage (e.g., 5%)
3. ❌ **Leave co-investment checkbox unchecked**
4. Click "Submit Offer"

**Expected Result**:
- [ ] Success message: "Your offer for [Startup] has been submitted successfully! The startup will now review your offer."
- [ ] No co-investment opportunity created

### Step 2: Startup Views Offers with Co-Investment Information

**Action**: Login as Startup → Go to Dashboard → Offers Received

**Expected**:
- [ ] See the investment offer from Step 1
- [ ] Offer details show: "$100,000 for 5% equity (Seeking co-investors for remaining $400,000)"
- [ ] If co-investment opportunity was created, see separate entry: "Co-investment opportunity: $50,000 - $400,000 available"

**Console Check**: Look for these logs:
```
🎯 Co-investment opportunities: [array with items]
🎯 Investment offers: [array with items showing isSeekingCoInvestment: true]
```

### Step 3: Verify Database Records

**Run in Supabase SQL Editor**:
```sql
-- Check investment offers
SELECT 
    id,
    investor_email,
    startup_name,
    offer_amount,
    equity_percentage,
    wants_co_investment,
    created_at
FROM investment_offers 
WHERE startup_name = 'YOUR_STARTUP_NAME'
ORDER BY created_at DESC;

-- Check co-investment opportunities
SELECT 
    id,
    startup_id,
    listed_by_user_id,
    investment_amount,
    minimum_co_investment,
    maximum_co_investment,
    description,
    status,
    created_at
FROM co_investment_opportunities 
WHERE startup_id = (SELECT id FROM startups WHERE name = 'YOUR_STARTUP_NAME')
ORDER BY created_at DESC;
```

**Expected**:
- [ ] Investment offer shows `wants_co_investment: true` (if checkbox was checked)
- [ ] Co-investment opportunity exists with correct amounts
- [ ] Description includes lead investor details

### Step 4: Test Co-Investment Opportunity Display

**Action**: In Startup Dashboard → Offers Received

**Expected**:
- [ ] Co-investment opportunities appear as separate entries
- [ ] Show range: "Co-investment opportunity: $50,000 - $400,000 available"
- [ ] From field shows lead investor name
- [ ] Status shows as "pending"

## Debug Console Logs

### Investor Side (Making Offer):
```
Creating co-investment opportunity: {startup_id: X, listed_by_user_id: Y, ...}
Co-investment opportunity created successfully: {id: Z, ...}
```

### Startup Side (Viewing Offers):
```
🎯 Co-investment opportunities loaded: [array]
🎯 Co-investment opportunities: [array with items]
```

## Common Issues & Solutions

### Issue 1: Co-investment checkbox not showing
**Check**: 
- [ ] InvestorView component has `wantsCoInvestment` state
- [ ] Checkbox is rendered in the offer modal
- [ ] Form submission includes co-investment parameter

### Issue 2: Co-investment opportunity not created
**Check**:
- [ ] `createCoInvestmentOpportunity` function exists in `investmentService`
- [ ] Database tables exist (`co_investment_opportunities`)
- [ ] Console shows creation success/error messages

### Issue 3: Startup dashboard not showing co-investment info
**Check**:
- [ ] `loadOffersReceived` function calls `getCoInvestmentOpportunities`
- [ ] Offer formatting includes co-investment fields
- [ ] `OfferReceived` interface includes co-investment properties

### Issue 4: Database errors
**Run**: `TEST_CO_INVESTMENT_FLOW.sql` to verify:
- [ ] All tables exist
- [ ] RPC functions exist
- [ ] Test data creation works

## Success Criteria

✅ **Complete Flow Works When**:
1. Investor can check co-investment checkbox
2. Offer submission creates co-investment opportunity
3. Startup dashboard shows co-investment information
4. Database records are created correctly
5. No console errors during the flow

## Next Steps (Future Enhancements)

1. **Co-investor Interest**: Allow other investors to express interest in co-investment opportunities
2. **Lead Investor Approval**: Allow lead investor to approve/reject co-investors
3. **Co-investment Dashboard**: Dedicated page for managing co-investment opportunities
4. **Notifications**: Notify startups when co-investors express interest
5. **Integration**: Connect co-investment with actual investment completion flow

