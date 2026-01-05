# Financial Calculations Documentation

## Overview
This document explains how the financial metrics are calculated in the startup dashboard's financials section.

## Year Filter Bug Fix

### Issue
When the year filter was set to "All Years", the system was incorrectly converting it to the current year, causing only current year data to be displayed instead of all years.

### Fix Applied
- Modified `loadFinancialData()` in `FinancialsTab.tsx` to properly handle 'all' year selection
- When 'all' is selected, the year filter is removed from the query, allowing all records to be returned
- Monthly and vertical charts now aggregate data across all years when 'all' is selected
- Summary cards always show all-time totals regardless of year filter (this was already correct)

## Financial Summary Calculations

The financial summary cards display the following metrics:

### 1. Total Funding Received

**Location:** `FinancialsTab.tsx` lines 598-603

**Calculation:**
```typescript
const totalFundingFromRecords = investmentRecordsState.reduce((sum, rec) => sum + (rec?.amount || 0), 0);
const fallback = startup.totalFunding || 0;
const value = totalFundingFromRecords > 0 ? totalFundingFromRecords : fallback;
```

**Explanation:**
- Primary source: Sum of all investment records from `investment_records` table (via `capTableService.getInvestmentRecords()`)
- Fallback: `startup.totalFunding` from the `startups` table
- Uses investment records if available, otherwise falls back to the startup's total_funding field
- **Not affected by year filter** - always shows all-time total funding

**Data Sources:**
- `investment_records` table: `amount` field
- `startups` table: `total_funding` field

---

### 2. Total Revenue Till Date

**Location:** `FinancialsTab.tsx` line 607

**Calculation:**
```typescript
formatCurrency(summary?.total_revenue || 0, startupCurrency)
```

**Explanation:**
- Source: `summary.total_revenue` from `financialsService.getFinancialSummary()`
- Calculated by summing all revenue records from `financial_records` table where `record_type = 'revenue'`
- **Not affected by year filter** - always shows all-time total revenue

**Backend Calculation:**
- Database function: `get_startup_financial_summary(p_startup_id)`
- SQL: `SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE startup_id = ? AND record_type = 'revenue'`
- Fallback: Manual calculation in `calculateFinancialSummaryFallback()` which sums all revenue records

**Data Source:**
- `financial_records` table: `amount` field where `record_type = 'revenue'`

---

### 3. Total Expenditure Till Date

**Location:** `FinancialsTab.tsx` line 611

**Calculation:**
```typescript
formatCurrency(summary?.total_expenses || 0, startupCurrency)
```

**Explanation:**
- Source: `summary.total_expenses` from `financialsService.getFinancialSummary()`
- Calculated by summing all expense records from `financial_records` table where `record_type = 'expense'`
- **Not affected by year filter** - always shows all-time total expenses

**Backend Calculation:**
- Database function: `get_startup_financial_summary(p_startup_id)`
- SQL: `SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE startup_id = ? AND record_type = 'expense'`
- Fallback: Manual calculation in `calculateFinancialSummaryFallback()` which sums all expense records

**Data Source:**
- `financial_records` table: `amount` field where `record_type = 'expense'`

---

### 4. Total Available Fund

**Location:** `FinancialsTab.tsx` lines 614-620

**Calculation:**
```typescript
const fallback = startup.totalFunding || 0;
const tf = totalFundingFromRecords > 0 ? totalFundingFromRecords : fallback;
const totalRevenue = summary?.total_revenue || 0;
const totalExpenses = summary?.total_expenses || 0;
return formatCurrency(tf + totalRevenue - totalExpenses, startupCurrency);
```

**Formula:** `Total Funding + Total Revenue - Total Expenditure`

**Explanation:**
- Total Funding: Same calculation as "Total Funding Received" (investment records or startup.totalFunding)
- Total Revenue: Same as "Total Revenue Till Date" (sum of all revenue records)
- Total Expenditure: Same as "Total Expenditure Till Date" (sum of all expenses)
- Result: Available funds = Total Funding + Total Revenue - Total Expenditure
- **Not affected by year filter** - always shows all-time calculation

**Note:** This represents the total available funds including both funding received and revenue generated, minus all expenses. The calculation is:
- Available Funds = Total Funding Received + Total Revenue Till Date - Total Expenditure Till Date

---

## Summary

### Key Points:
1. **All summary cards show all-time totals** - they are NOT affected by the year filter
2. **Total Funding** comes from investment records (primary) or startups.total_funding (fallback)
3. **Total Revenue** is the sum of all revenue records
4. **Total Expenditure** is the sum of all expense records
5. **Total Available Fund** = Total Funding - Total Expenditure

### Year Filter Behavior:
- **Summary Cards:** Always show all-time totals (not filtered by year)
- **Charts (Monthly/Vertical):** Filtered by selected year, or show all years aggregated when "All Years" is selected
- **Tables (Expenses/Revenues):** Filtered by selected year and entity filter

### Data Flow:
1. `loadFinancialData()` loads all data based on filters
2. `getFinancialSummary()` always returns all-time totals (no year filter applied)
3. Charts and tables respect the year filter
4. Summary cards always display all-time values

---

## Files Modified

1. **components/startup-health/FinancialsTab.tsx**
   - Fixed year filter handling when 'all' is selected
   - Updated `loadFinancialData()` to properly handle 'all' years
   - Updated `calculateChartDataManually()` to handle 'all' years
   - Added manual calculation of vertical data when 'all' is selected

## Testing Recommendations

1. Test with "All Years" selected - verify all records are shown
2. Test with specific year selected - verify only that year's data is shown
3. Verify summary cards show same values regardless of year filter
4. Verify charts aggregate correctly when "All Years" is selected
5. Verify tables filter correctly by year

