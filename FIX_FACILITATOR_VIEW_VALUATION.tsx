// FIX_FACILITATOR_VIEW_VALUATION.tsx
// Fix critical valuation logic issues in FacilitatorView
// This ensures consistent valuation display between startup and facilitation views

// =====================================================
// CRITICAL FIX: FacilitatorView.tsx Line 2241
// =====================================================

// ❌ WRONG - Current code in FacilitatorView.tsx:
/*
currentValuation: startup.totalFunding || 0,  // This is FUNDAMENTALLY WRONG!
*/

// ✅ CORRECT - Fixed code:
/*
currentValuation: startup.current_valuation || startup.currentValuation || 0,
*/

// =====================================================
// COMPLETE FIX FOR FacilitatorView.tsx
// =====================================================

// Replace the buildStartupForView function in FacilitatorView.tsx with this corrected version:

const buildStartupForView = async (
  base: Partial<Startup> & { id: number | string; name: string; sector: string }
): Promise<Startup> => {
  const numericId = typeof base.id === 'string' ? parseInt(base.id, 10) : base.id;
  let profile: any = null;
  
  try {
    if (!isNaN(Number(numericId))) {
      profile = await profileService.getStartupProfile(Number(numericId));
    }
  } catch (e) {
    // ignore profile fetch failures; we'll fall back safely
  }

  const derivedCurrency = (() => {
    if (base.currency) return base.currency as string;
    if (profile?.currency) return profile.currency as string;
    if (profile?.country) return resolveCurrency(profile.country as string);
    if ((base as any).profile?.currency) return (base as any).profile.currency as string;
    if ((base as any).profile?.country) return resolveCurrency((base as any).profile.country as string);
    if (currentUser?.country) return resolveCurrency(currentUser.country);
    return 'USD';
  })();

  // ✅ CRITICAL FIX: Use correct valuation source
  const getCorrectValuation = (startup: any): number => {
    // Priority: database current_valuation > frontend currentValuation > 0
    return startup.current_valuation || startup.currentValuation || 0;
  };

  return {
    id: (numericId as unknown) as any,
    name: base.name,
    sector: base.sector,
    investmentType: (base as any).investmentType || ('equity' as any),
    investmentValue: (base as any).investmentValue || 0,
    equityAllocation: (base as any).equityAllocation || 0,
    // ✅ FIXED: Use correct valuation instead of totalFunding
    currentValuation: getCorrectValuation(base),
    totalFunding: (base as any).totalFunding || 0,
    totalRevenue: (base as any).totalRevenue || 0,
    registrationDate: (base as any).registrationDate || new Date().toISOString().split('T')[0],
    currency: derivedCurrency,
    complianceStatus: (base as any).complianceStatus || ComplianceStatus.Pending,
    founders: (base as any).founders || [],
    profile: profile || (base as any).profile || undefined,
  } as Startup;
};

// =====================================================
// ADDITIONAL FIX: Share Function Valuation Calculation
// =====================================================

// Fix the handleShare function in FacilitatorView.tsx (around line 475):

const handleShare = async (startup: ActiveFundraisingStartup) => {
  console.log('Share button clicked for startup:', startup.name);
  console.log('Startup object:', startup);
  const videoUrl = startup.pitchVideoUrl || 'Video not available';
  
  // ✅ FIXED: Use correct valuation calculation
  const getCorrectValuation = (startup: any): number => {
    // If we have a direct valuation, use it
    if (startup.current_valuation || startup.currentValuation) {
      return startup.current_valuation || startup.currentValuation;
    }
    
    // If we have investment data, calculate from that
    if (startup.equityAllocation > 0 && startup.investmentValue > 0) {
      return (startup.investmentValue / (startup.equityAllocation / 100));
    }
    
    // Fallback to total funding (but this should be avoided)
    return startup.totalFunding || 0;
  };
  
  const valuation = getCorrectValuation(startup);
  
  const inferredCurrency =
    startup.currency ||
    (startup as any).profile?.currency ||
    ((startup as any).profile?.country ? resolveCurrency((startup as any).profile?.country) : undefined) ||
    (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
  const symbol = getCurrencySymbol(inferredCurrency);
  
  const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: ${symbol}${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\nValuation: ${symbol}${valuation.toLocaleString()}\n\nPitch Video: ${videoUrl}`;
  
  console.log('Share details:', details);
  
  try {
    if (navigator.share) {
      await navigator.share({
        title: `Investment Opportunity: ${startup.name}`,
        text: details,
        url: window.location.href
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      await navigator.clipboard.writeText(details);
      alert('Investment details copied to clipboard!');
    }
  } catch (error) {
    console.error('Error sharing:', error);
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(details);
      alert('Investment details copied to clipboard!');
    } catch (clipboardError) {
      console.error('Clipboard error:', clipboardError);
      alert('Unable to share. Please copy the details manually.');
    }
  }
};

// =====================================================
// UTILITY FUNCTION: Consistent Valuation Access
// =====================================================

// Add this utility function to ensure consistent valuation access across all components:

export const getStartupValuation = (startup: any): number => {
  // Priority order for getting correct valuation:
  // 1. Database current_valuation (snake_case)
  // 2. Frontend currentValuation (camelCase)  
  // 3. Calculated from investment data
  // 4. Fallback to 0
  
  if (startup.current_valuation && startup.current_valuation > 0) {
    return startup.current_valuation;
  }
  
  if (startup.currentValuation && startup.currentValuation > 0) {
    return startup.currentValuation;
  }
  
  // Calculate from investment data if available
  if (startup.equityAllocation > 0 && startup.investmentValue > 0) {
    return (startup.investmentValue / (startup.equityAllocation / 100));
  }
  
  return 0;
};

// =====================================================
// VALIDATION FUNCTION: Check Valuation Consistency
// =====================================================

export const validateValuationConsistency = (startup: any): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if valuation equals total funding (common mistake)
  if (startup.current_valuation === startup.total_funding && startup.total_funding > 0) {
    issues.push('Valuation equals total funding (likely incorrect)');
    recommendations.push('Valuation should typically be higher than total funding');
  }
  
  // Check if valuation is 0 but there's investment data
  if ((!startup.current_valuation || startup.current_valuation === 0) && 
      startup.total_funding > 0) {
    issues.push('Valuation is 0 but startup has funding');
    recommendations.push('Set valuation based on latest investment round');
  }
  
  // Check if valuation is unreasonably high compared to funding
  if (startup.current_valuation > startup.total_funding * 10 && startup.total_funding > 0) {
    issues.push('Valuation is more than 10x total funding (unusual)');
    recommendations.push('Verify valuation calculation is correct');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
};

// =====================================================
// IMPLEMENTATION NOTES
// =====================================================

/*
CRITICAL CHANGES NEEDED IN FacilitatorView.tsx:

1. Line 152: Change from:
   currentValuation: (base as any).currentValuation || 0,
   To:
   currentValuation: getStartupValuation(base),

2. Line 2241: Change from:
   currentValuation: startup.totalFunding || 0,
   To:
   currentValuation: getStartupValuation(startup),

3. Line 475: Update handleShare function to use getCorrectValuation

4. Add validation calls where appropriate:
   const validation = validateValuationConsistency(startup);
   if (!validation.isValid) {
     console.warn('Valuation consistency issues:', validation.issues);
   }
*/

export default {
  buildStartupForView,
  handleShare,
  getStartupValuation,
  validateValuationConsistency
};
