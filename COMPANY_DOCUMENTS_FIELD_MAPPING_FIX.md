# Company Documents - Field Mapping Fix

## Problem Identified
The console logs showed:
```
Opening document URL: undefined
No URL provided or URL is empty
```

This was caused by a **field mapping mismatch** between the database and TypeScript interface:

- **Database fields**: `document_url`, `document_name`, `startup_id` (snake_case)
- **TypeScript interface**: `documentUrl`, `documentName`, `startupId` (camelCase)

## Root Cause
The service layer was returning raw database data without mapping the field names, causing:
- `document.documentUrl` to be `undefined`
- View button to fail because no URL was available
- All document data to be inaccessible

## Solution Applied

### **Field Mapping in Service Layer**
Added proper field mapping in all service methods:

```typescript
// Map database fields to TypeScript interface
const mappedData = (data || []).map((doc: any) => ({
  id: doc.id,
  startupId: doc.startup_id,           // snake_case → camelCase
  documentName: doc.document_name,     // snake_case → camelCase
  description: doc.description,
  documentUrl: doc.document_url,        // snake_case → camelCase
  documentType: doc.document_type,      // snake_case → camelCase
  createdBy: doc.created_by,            // snake_case → camelCase
  createdAt: doc.created_at,            // snake_case → camelCase
  updatedAt: doc.updated_at             // snake_case → camelCase
}));
```

### **Methods Updated**
1. **`getCompanyDocuments()`** - Maps array of documents
2. **`getCompanyDocument()`** - Maps single document
3. **`createCompanyDocument()`** - Maps created document
4. **`updateCompanyDocument()`** - Maps updated document

### **Database Schema (Unchanged)**
```sql
company_documents:
├── id (UUID)
├── startup_id (INTEGER)
├── document_name (VARCHAR)
├── description (TEXT)
├── document_url (TEXT) ← This was the missing field
├── document_type (VARCHAR)
├── created_by (UUID)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Expected Results

### **Before Fix**
```javascript
// Console output
Document data: {
  id: "123",
  startup_id: 1,
  document_name: "Resume",
  document_url: "https://docs.google.com/...",  // ← Available in DB
  // ... other fields
}

// Frontend trying to access
document.documentUrl  // ← undefined (wrong field name)
```

### **After Fix**
```javascript
// Console output
Document data: {
  id: "123",
  startupId: 1,
  documentName: "Resume",
  documentUrl: "https://docs.google.com/...",  // ← Now properly mapped
  // ... other fields
}

// Frontend accessing
document.documentUrl  // ← "https://docs.google.com/..." (works!)
```

## Testing Steps

1. **Check Console**: Should see "Mapped company documents" with proper field names
2. **View Button**: Should now show actual URLs instead of "undefined"
3. **Document Opening**: View button should open documents correctly
4. **Field Access**: All document properties should be accessible

## Files Updated

- `lib/companyDocumentsService.ts` - Added field mapping to all methods

The Company Documents section should now work correctly with proper field mapping! 🎯
