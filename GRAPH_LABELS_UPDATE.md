# Graph Labels Update - Employees Tab

## Changes Made

Updated the graph labels in the Employees tab to be more descriptive and accurate:

### 1. Chart Titles Updated

**Before:**
- "Salary Expense" 
- "ESOP Expenses"

**After:**
- "Monthly Salary Expense"
- "Cumulative ESOP Expenses"

### 2. Legend Labels Updated

**Before:**
- Legend showed "salary" and "esop" (dataKey values)

**After:**
- Legend shows "Monthly Salary" and "Cumulative ESOP"

## Files Modified

- `components/startup-health/EmployeesTab.tsx`

## Specific Changes

### Chart Title Updates:
```tsx
// Line 941: Salary chart title
<h3 className="text-lg font-semibold mb-4 text-slate-700">Monthly Salary Expense</h3>

// Line 959: ESOP chart title  
<h3 className="text-lg font-semibold mb-4 text-slate-700">Cumulative ESOP Expenses</h3>
```

### Legend Label Updates:
```tsx
// Line 953: Salary chart legend
<Line type="monotone" dataKey="salary" stroke="#16a34a" name="Monthly Salary" />

// Line 971: ESOP chart legend
<Line type="monotone" dataKey="esop" stroke="#3b82f6" name="Cumulative ESOP" />
```

## Result

The graphs now have more descriptive and accurate labels:
- ✅ **Monthly Salary Expense** chart shows monthly salary costs
- ✅ **Cumulative ESOP Expenses** chart shows cumulative ESOP allocations over time
- ✅ **Legend labels** are more user-friendly and descriptive
- ✅ **Chart titles** clearly indicate what data is being displayed

This makes the dashboard more intuitive for users to understand what each graph represents.
