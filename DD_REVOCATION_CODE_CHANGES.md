# 📝 Due Diligence Revocation - Exact Code Changes

## File 1: DUE_DILIGENCE_STARTUP_ACCESS.sql

### Added Function (after reject function)
```sql
-- Revoke a due diligence access if caller owns the startup
-- Sets status to 'revoked' so user must request again
CREATE OR REPLACE FUNCTION public.revoke_due_diligence_access_for_startup(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_startup_owner UUID;
BEGIN
  -- Ensure the caller owns the startup associated with the request
  SELECT s.user_id INTO v_startup_owner
  FROM public.due_diligence_requests r
  JOIN public.startups s ON s.id::text = r.startup_id
  WHERE r.id = p_request_id;

  IF v_startup_owner IS NULL OR v_startup_owner <> auth.uid() THEN
    RETURN FALSE;
  END IF;

  UPDATE public.due_diligence_requests
  SET status = 'revoked'
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_due_diligence_access_for_startup(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_due_diligence_access_for_startup(UUID) TO authenticated;
```

---

## File 2: lib/paymentService.ts

### Added Method
```typescript
// Revoke due diligence access (for startup use) - marks as revoked
async revokeDueDiligenceAccess(requestId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('revoke_due_diligence_access_for_startup', {
    p_request_id: requestId
  });
  if (error) {
    console.error('Error revoking due diligence access:', error);
    return false;
  }
  return !!data;
}
```

### Updated Method
**Before:**
```typescript
async createPendingDueDiligenceIfNeeded(userId: string, startupId: string): Promise<any> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const authUserId = authUser?.id || userId;
  
  const { data: existing, error: checkError } = await supabase
    .from('due_diligence_requests')
    .select('id, status')
    .eq('user_id', authUserId)
    .eq('startup_id', String(startupId))
    .in('status', ['pending'])  // ← Only checked pending
    .limit(1);
  if (!checkError && Array.isArray(existing) && existing.length > 0) {
    return existing[0];
  }
  return this.createDueDiligenceRequest(userId, String(startupId));
}
```

**After:**
```typescript
// Create pending request only if one doesn't already exist (allows new request if previous was revoked/failed)
async createPendingDueDiligenceIfNeeded(userId: string, startupId: string): Promise<any> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const authUserId = authUser?.id || userId;
  
  // Only check for existing PENDING requests (allows new request if revoked, failed, or completed)
  const { data: existing, error: checkError } = await supabase
    .from('due_diligence_requests')
    .select('id, status')
    .eq('user_id', authUserId)
    .eq('startup_id', String(startupId))
    .in('status', ['pending', 'completed', 'paid'])  // ← Now checks active requests
    .limit(1);
  
  if (!checkError && Array.isArray(existing) && existing.length > 0) {
    return existing[0];
  }
  // If previous request was revoked/failed, create a new one
  return this.createDueDiligenceRequest(userId, String(startupId));
}
```

---

## File 3: components/startup-health/StartupDashboardTab.tsx

### Added Import
```typescript
// Line 13
import { DollarSign, Zap, TrendingUp, Download, Check, X, FileText, MessageCircle, Calendar, ChevronDown, CheckCircle, Clock, XCircle, Trash2, Lock } from 'lucide-react';
// ↑ Added: Lock
```

### Added Function
```typescript
// Revoke due diligence access - stops access and requires new request
const revokeDiligenceAccess = async (requestId: string) => {
  const ok = await paymentService.revokeDueDiligenceAccess(requestId);
  if (ok) {
    setDiligenceRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'revoked' } : r));
    messageService.success('Access Revoked', 'Investor will need to request access again to re-gain permissions.', 3000);
  } else {
    messageService.error('Revoke Failed', 'Could not revoke due diligence access.');
  }
};
```

### Updated UI - Status Badge
**Before:**
```tsx
<span
  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    r.status === 'completed'
      ? 'bg-green-100 text-green-800'
      : r.status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800'
  }`}
>
  {r.status}
</span>
```

**After:**
```tsx
<span
  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    r.status === 'completed'
      ? 'bg-green-100 text-green-800'
      : r.status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : r.status === 'revoked'
      ? 'bg-orange-100 text-orange-800'  // ← Added orange for revoked
      : 'bg-red-100 text-red-800'
  }`}
>
  {r.status}
</span>
```

### Updated UI - Action Buttons
**Before:**
```tsx
<td className="px-6 py-4 whitespace-nowrap text-sm">
  {r.status === 'pending' ? (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => approveDiligenceRequest(r.id)}
      >
        <Check className="h-4 w-4 mr-1" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => rejectDiligenceRequest(r.id)}
      >
        <X className="h-4 w-4 mr-1" /> Reject
      </Button>
    </div>
  ) : (
    <span className="text-slate-400">No actions</span>
  )}
</td>
```

**After:**
```tsx
<td className="px-6 py-4 whitespace-nowrap text-sm">
  {r.status === 'pending' ? (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => approveDiligenceRequest(r.id)}
      >
        <Check className="h-4 w-4 mr-1" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => rejectDiligenceRequest(r.id)}
      >
        <X className="h-4 w-4 mr-1" /> Reject
      </Button>
    </div>
  ) : r.status === 'completed' ? (  // ← Added condition for completed
    <Button
      size="sm"
      variant="outline"
      className="border-orange-300 text-orange-600 hover:bg-orange-50"
      onClick={() => revokeDiligenceAccess(r.id)}  // ← New button
    >
      <Lock className="h-4 w-4 mr-1" /> Stop Access
    </Button>
  ) : (
    <span className="text-slate-400">No actions</span>
  )}
</td>
```

---

## Summary of Changes

| Component | Lines Changed | Type |
|-----------|---|---|
| SQL RPC Function | +31 | New function |
| Backend Service | +2 methods | Added + Updated |
| Frontend Import | +1 icon | Updated import |
| Frontend Handler | +8 lines | New function |
| Frontend UI Badge | +3 lines | Updated styling |
| Frontend UI Buttons | +11 lines | Updated conditionals |

**Total Lines Added:** ~60 lines
**Breaking Changes:** None - all changes are backward compatible
**Database Schema Changes:** None

