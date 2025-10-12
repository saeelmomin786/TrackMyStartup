# Remove Status Column from Added Startups Table

## Changes Made

### **Removed Status Column Header**
```html
<!-- Before -->
<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>

<!-- After -->
<!-- Status column header completely removed -->
```

### **Removed Status Cell from Table Rows**
```html
<!-- Before -->
<td className="px-6 py-4 whitespace-nowrap">
  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
    startup.status === 'pending' 
      ? 'bg-yellow-100 text-yellow-800'
      : startup.status === 'sent'
      ? 'bg-blue-100 text-blue-800'
      : startup.status === 'accepted'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }`}>
    {startup.status.charAt(0).toUpperCase() + startup.status.slice(1)}
  </span>
</td>

<!-- After -->
<!-- Status cell completely removed -->
```

## Table Structure

### **Before (5 Columns)**
1. Startup Name
2. Contact Person  
3. Email
4. **Status** ← Removed
5. Actions

### **After (4 Columns)**
1. Startup Name
2. Contact Person
3. Email
4. Actions

## Benefits

- ✅ **Cleaner Table**: Removed unnecessary status information
- ✅ **More Space**: More room for other columns
- ✅ **Simplified View**: Focus on essential information
- ✅ **Better Layout**: Improved table proportions

## Files Updated

- `components/FacilitatorView.tsx` - Removed Status column from Added Startups table

The "Added Startups" table now has a cleaner layout without the Status column! 🎯
