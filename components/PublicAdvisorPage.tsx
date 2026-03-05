import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import InvestmentAdvisorCard from './investment-advisor/InvestmentAdvisorCard';
import { getQueryParam } from '../lib/urlState';
import Card from './ui/Card';
import Button from './ui/Button';
import { advisorConnectionRequestService } from '../lib/advisorConnectionRequestService';
import { parseProfileUrl } from '../lib/slugUtils';
import { resolveSlug } from '../lib/slugResolver';
import SEOHead from './SEOHead';

interface InvestmentAdvisorProfile {
  id?: string;
  user_id: string;
  advisor_name?: string;
  firm_name?: string;
  global_hq?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  service_types?: string[];
  investment_stages?: string[];
  domain?: string[];
  minimum_investment?: number;
  maximum_investment?: number;
  currency?: string;
  service_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  startups_under_management?: number;
  investors_under_management?: number;
  successful_fundraises_startups?: number;
  verified_startups_under_management?: number;
  verified_investors_under_management?: number;
  verified_successful_fundraises_startups?: number;
}

const PublicAdvisorPage: React.FC = () => {
  const [advisor, setAdvisor] = useState<InvestmentAdvisorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'checking'>('checking');

  // Check for path-based URL first (e.g., /advisor/advisor-name)
  const pathProfile = parseProfileUrl(window.location.pathname);
  const queryUserId = getQueryParam('userId');
  const queryAdvisorId = getQueryParam('advisorId');
  
  // Resolve IDs from slug if path-based URL is used
  const [userId, setUserId] = useState<string | null>(null);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  
  useEffect(() => {
    const resolveAdvisorId = async () => {
      // If explicit ID is present in query, always prefer it (prevents slug collision mismatches)
      if (queryUserId || queryAdvisorId) {
        setUserId(queryUserId || null);
        setAdvisorId(queryAdvisorId || null);
        return;
      }

      if (pathProfile && pathProfile.view === 'advisor') {
        // Path-based URL: resolve slug to user_id
        const resolvedId = await resolveSlug('advisor', pathProfile.slug);
        if (resolvedId) {
          setUserId(String(resolvedId));
        } else {
          setError('Advisor not found');
          setLoading(false);
        }
      } else {
        setError('Advisor identifier is missing.');
        setLoading(false);
        return;
      }
    };
    
    resolveAdvisorId();
  }, [pathProfile, queryUserId, queryAdvisorId]);

  useEffect(() => {
    if (!userId && !advisorId) {
      // Don't set error here - it's already handled in resolveAdvisorId
      return;
    }

    const loadAdvisor = async () => {
      setLoading(true);
      try {
        // Use public table for better security and performance
        // Try public table first, fallback to main table if needed
        let query = supabase
          .from('advisors_public_table')
          .select('*')
          .limit(1);

        // Public table uses user_id as primary key
        const lookupId = userId || advisorId;
        if (lookupId) {
          query = query.eq('user_id', lookupId);
        }

        let { data, error } = await query.single();

        // Fallback to main table if public table doesn't exist or query fails
        if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
          console.warn('[PublicAdvisorPage] Public table not available, falling back to main table');
          query = supabase
            .from('investment_advisor_profiles')
            .select('*')
            .limit(1);

          if (advisorId) {
            // advisorId might be the old 'id' field (UUID) or user_id
            query = query.or(`id.eq.${advisorId},user_id.eq.${advisorId}`);
          } else {
            query = query.eq('user_id', userId);
          }

          const fallbackResult = await query.single();
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
        if (error) {
          throw error;
        }

        const sourceData = (data || {}) as any;
        const resolvedUserId = String(sourceData.user_id || userId || advisorId || '');

        // Try to get canonical advisor profile fields (especially metrics) from main table
        // This handles cases where advisors_public_table is missing some newer columns.
        let canonicalProfile: any = null;
        if (resolvedUserId) {
          const { data: canonicalData } = await supabase
            .from('investment_advisor_profiles')
            .select(`
              user_id,
              startups_under_management,
              investors_under_management,
              successful_fundraises_startups,
              verified_startups_under_management,
              verified_investors_under_management,
              verified_successful_fundraises_startups,
              logo_url,
              video_url,
              media_type
            `)
            .eq('user_id', resolvedUserId)
            .maybeSingle();

          canonicalProfile = canonicalData;
        }

        const pickNumber = (...values: any[]): number | undefined => {
          for (const value of values) {
            if (value === null || value === undefined || value === '') continue;
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
          }
          return undefined;
        };

        // Resolve user-facing profile fields from user_profiles first.
        // Some deployments don't expose a public `users` table and return 404 for that endpoint.
        const userIdToFetch = resolvedUserId;
        let userProfileData: any = null;
        if (userIdToFetch) {
          const userProfilesResult = await supabase
            .from('user_profiles')
            .select('firm_name, name, logo_url, updated_at, id, auth_user_id')
            .or(`auth_user_id.eq.${userIdToFetch},id.eq.${userIdToFetch}`)
            .order('updated_at', { ascending: false })
            .limit(10);

          const profileRows = (userProfilesResult.data || []) as Array<any>;
          if (profileRows.length > 0) {
            const hasUsableLogo = (row: any): boolean => {
              const logo = row?.logo_url;
              return !!(logo && typeof logo === 'string' && logo.trim() && logo.trim() !== '#');
            };

            // Prefer row with usable logo, fallback to most recently updated row
            userProfileData = profileRows.find(hasUsableLogo) || profileRows[0];
          }
        }

        const normalizeLogoUrl = (value: any): string | undefined => {
          if (!value || typeof value !== 'string') return undefined;
          const trimmed = value.trim();
          if (!trimmed || trimmed === '#') return undefined;
          return trimmed;
        };

        const resolvedLogoUrl =
          normalizeLogoUrl(canonicalProfile?.logo_url) ||
          normalizeLogoUrl(sourceData?.logo_url) ||
          normalizeLogoUrl(userProfileData?.logo_url);

        const resolvedVideoUrl = (sourceData?.video_url || canonicalProfile?.video_url) as string | undefined;
        const resolvedMediaType = resolvedVideoUrl ? 'video' : (resolvedLogoUrl ? 'logo' : sourceData?.media_type);

        // Merge firm_name from users table into advisor profile
        const advisorWithFirmName = {
          ...sourceData,
          ...canonicalProfile,
          startups_under_management: pickNumber(
            canonicalProfile?.startups_under_management,
            sourceData?.startups_under_management,
            sourceData?.startupsUnderManagement,
            sourceData?.total_startups_under_management
          ) ?? 0,
          investors_under_management: pickNumber(
            canonicalProfile?.investors_under_management,
            sourceData?.investors_under_management,
            sourceData?.investorsUnderManagement,
            sourceData?.total_investors_under_management
          ) ?? 0,
          successful_fundraises_startups: pickNumber(
            canonicalProfile?.successful_fundraises_startups,
            sourceData?.successful_fundraises_startups,
            sourceData?.successful_fundraises,
            sourceData?.successfulFundraisesStartups
          ) ?? 0,
          verified_startups_under_management: pickNumber(
            canonicalProfile?.verified_startups_under_management,
            sourceData?.verified_startups_under_management,
            sourceData?.verified_startups,
            sourceData?.verifiedStartupsUnderManagement
          ) ?? 0,
          verified_investors_under_management: pickNumber(
            canonicalProfile?.verified_investors_under_management,
            sourceData?.verified_investors_under_management,
            sourceData?.verified_investors,
            sourceData?.verifiedInvestorsUnderManagement
          ) ?? 0,
          verified_successful_fundraises_startups: pickNumber(
            canonicalProfile?.verified_successful_fundraises_startups,
            sourceData?.verified_successful_fundraises_startups,
            sourceData?.verified_successful_fundraises,
            sourceData?.verified_fundraises,
            sourceData?.verifiedSuccessfulFundraisesStartups
          ) ?? 0,
          logo_url: resolvedLogoUrl,
          media_type: resolvedMediaType,
          // Use firm_name from users table (registration) as primary, fallback to profile firm_name
          firm_name: userProfileData?.firm_name || canonicalProfile?.firm_name || sourceData?.firm_name,
          advisor_name: sourceData?.advisor_name || userProfileData?.name,
          user: userProfileData
            ? { name: userProfileData?.name, email: '' }
            : undefined
        } as InvestmentAdvisorProfile;

        setAdvisor(advisorWithFirmName);
      } catch (err: any) {
        console.error('Error loading advisor profile', err);
        setError('Unable to load advisor profile.');
      } finally {
        setLoading(false);
      }
    };

    loadAdvisor();
  }, [userId, advisorId]);

  // Check connection status when advisor is loaded
  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!advisor?.user_id) {
        setConnectionStatus('none');
        return;
      }

      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        
        if (!user) {
          setConnectionStatus('none');
          return;
        }

        const existingCheck = await advisorConnectionRequestService.checkExistingRequest(advisor.user_id, user.id);
        
        if (existingCheck.exists) {
          setConnectionStatus(existingCheck.status === 'accepted' ? 'accepted' : 'pending');
        } else {
          setConnectionStatus('none');
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
        setConnectionStatus('none');
      }
    };

    if (advisor) {
      checkConnectionStatus();
    }
  }, [advisor]);

  // Clean up ?page=landing from URL if present (for SEO) - MUST be before any early returns
  useEffect(() => {
    if (getQueryParam('page') === 'landing' && pathProfile) {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  }, [pathProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="p-6 shadow">
          <div className="text-sm text-slate-600">Loading advisor profile...</div>
        </Card>
      </div>
    );
  }

  if (error || !advisor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="p-6 shadow max-w-lg w-full text-center">
          <div className="text-lg font-semibold text-slate-900 mb-2">Error</div>
          <div className="text-sm text-slate-600 mb-4">{error || 'Advisor not found.'}</div>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </Card>
      </div>
    );
  }

  // Helper function for currency formatting
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(value);
  };

  // SEO data - Clean URL (remove query parameters for SEO)
  const advisorName = advisor?.firm_name || advisor?.advisor_name || 'Investment Advisor';
  const advisorDescription = `${advisorName}${advisor?.global_hq ? ` - Investment advisory firm based in ${advisor.global_hq}` : ' - Investment advisory firm'}. ${advisor?.service_types && advisor.service_types.length > 0 ? `Services: ${advisor.service_types.join(', ')}. ` : ''}${advisor?.investment_stages && advisor.investment_stages.length > 0 ? `Investment stages: ${advisor.investment_stages.join(', ')}. ` : ''}${advisor?.minimum_investment && advisor?.maximum_investment ? `Investment range: ${formatCurrency(advisor.minimum_investment, advisor.currency || 'USD')} - ${formatCurrency(advisor.maximum_investment, advisor.currency || 'USD')}. ` : ''}${advisor?.service_description ? advisor.service_description : ''}`;
  const cleanPath = window.location.pathname; // Already clean from slug-based URL
  const canonicalUrl = `${window.location.origin}${cleanPath}`;
  const ogImage = advisor?.logo_url && advisor.logo_url !== '#' ? advisor.logo_url : undefined;
  const ticketSize = advisor?.minimum_investment && advisor?.maximum_investment
    ? `${formatCurrency(advisor.minimum_investment, advisor.currency || 'USD')} - ${formatCurrency(advisor.maximum_investment, advisor.currency || 'USD')}`
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      {/* SEO Head Component */}
      {advisor && (
        <SEOHead
          title={`${advisorName} - Investment Advisor Profile | TrackMyStartup`}
          description={advisorDescription}
          canonicalUrl={canonicalUrl}
          ogImage={ogImage}
          ogType="profile"
          profileType="advisor"
          name={advisorName}
          website={advisor.website && advisor.website !== '#' ? advisor.website : undefined}
          linkedin={advisor.linkedin_link && advisor.linkedin_link !== '#' ? advisor.linkedin_link : undefined}
          email={advisor.email}
          location={advisor.global_hq}
          firmType="Investment Advisory"
          ticketSize={ticketSize}
        />
      )}
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Investment Advisor Profile</h1>
          <p className="text-sm text-slate-600">Shareable public view.</p>
        </div>
        <InvestmentAdvisorCard
          advisor={advisor}
          isPublicPage={true}
          isAuthenticated={false}
          currentUser={null}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          {connectionStatus === 'accepted' ? (
            <Button
              variant="outline"
              disabled
              className="bg-green-50 text-green-700 border-green-200"
            >
              ✓ Already Connected
            </Button>
          ) : connectionStatus === 'pending' ? (
            <Button
              variant="outline"
              disabled
              className="bg-yellow-50 text-yellow-700 border-yellow-200"
            >
              ⏳ Request Pending
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={async () => {
              const { data: authData } = await supabase.auth.getUser();
              const user = authData?.user;
              const role = (user?.user_metadata as any)?.role;
              const redirectToLogin = () => {
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                // Redirect to clean login page
                const url = new URL(window.location.origin);
                url.searchParams.set('page', 'login');
                window.location.href = url.toString();
              };

              if (!user) {
                return redirectToLogin();
              }

              // Allowed roles for Connect: Investor, Investment Advisor, CA, CS, Mentor, Incubation
              const allowedRoles = ['Investor', 'Investment Advisor', 'CA', 'CS', 'Mentor', 'Incubation', 'Incubation Center'];
              if (!allowedRoles.includes(role)) {
                alert('Connect is available for Investor, Investment Advisor, CA, CS, Mentor, or Incubation roles.');
                return;
              }

              try {
                // Check if request already exists before creating
                const existingCheck = await advisorConnectionRequestService.checkExistingRequest(advisor.user_id, user.id);
                
                if (existingCheck.exists) {
                  if (existingCheck.status === 'accepted') {
                    alert('You are already connected with this advisor!');
                    return;
                  } else if (existingCheck.status === 'pending') {
                    alert('You already have a pending connection request with this advisor. Please wait for their response.');
                    return;
                  }
                }

                // Create collaboration request in advisor_connection_requests
                const collaboratorProfileUrl = window.location.origin + window.location.pathname + `?view=advisor&userId=${advisor.user_id}`;
                
                const requestData = {
                  advisor_id: advisor.user_id,
                  requester_id: user.id,
                  requester_type: role as 'Investor' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubation' | 'Incubation Center' | 'Incubator',
                  collaborator_profile_url: collaboratorProfileUrl
                };
                
                console.log('Creating collaboration request with data:', requestData);
                console.log('Current user ID:', user.id);
                console.log('User role:', role);
                
                await advisorConnectionRequestService.createRequest(requestData);

                // Update connection status
                setConnectionStatus('pending');
                alert('Connection request sent successfully! The advisor will review your request.');
              } catch (err: any) {
                console.error('Error creating collaboration request', err);
                console.error('Error details:', {
                  code: err.code,
                  message: err.message,
                  details: err.details,
                  hint: err.hint
                });
                
                // Show user-friendly error messages
                if (err.message && err.message.includes('already connected')) {
                  alert('You are already connected with this advisor!');
                } else if (err.message && err.message.includes('pending')) {
                  alert('You already have a pending connection request with this advisor. Please wait for their response.');
                } else {
                  alert(`Could not send connection request: ${err.message || 'Please check console for details'}`);
                }
              }
            }}
          >
            Connect
          </Button>
          )}
          <Button
            variant="secondary"
            onClick={async () => {
              const { data: authData } = await supabase.auth.getUser();
              const user = authData?.user;
              const role = (user?.user_metadata as any)?.role;
              const redirectToLogin = () => {
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                // Redirect to clean login page
                const url = new URL(window.location.origin);
                url.searchParams.set('page', 'login');
                window.location.href = url.toString();
              };

              if (!user) {
                return redirectToLogin();
              }

              if (role !== 'Startup') {
                alert('Pitch is available when logged in as Startup.');
                return;
              }

              try {
                // Fetch advisor code from users table
                const { data: advisorUser, error: advisorError } = await supabase
                  .from('users')
                  .select('investment_advisor_code')
                  .eq('id', advisor.user_id)
                  .maybeSingle();

                if (advisorError || !advisorUser?.investment_advisor_code) {
                  console.error('Advisor code not found', advisorError);
                  alert('Advisor code not available. Please try again later.');
                  return;
                }

                const advisorCode = advisorUser.investment_advisor_code as string;

                // Set startup user to request this advisor (for Service Requests tab)
                const { error: updateError } = await supabase
                  .from('users')
                  .update({
                    investment_advisor_code_entered: advisorCode,
                    advisor_accepted: false
                  })
                  .eq('id', user.id);

                if (updateError) {
                  console.error('Error creating pitch request', updateError);
                  alert('Could not submit pitch request. Please try again.');
                  return;
                }

                // Also create request in advisor_connection_requests for tracking
                try {
                  // Get startup ID and name
                  const { data: startupData } = await supabase
                    .from('startups')
                    .select('id, name')
                    .eq('user_id', user.id)
                    .maybeSingle();

                  // Generate SEO-friendly URL
                  const { createSlug, createProfileUrl } = await import('../lib/slugUtils');
                  const startupName = startupData?.name || 'Startup';
                  const slug = createSlug(startupName);
                  const baseUrl = window.location.origin;
                  const startupProfileUrl = createProfileUrl(baseUrl, 'startup', slug, String(startupData?.id || ''));
                  
                  await advisorConnectionRequestService.createRequest({
                    advisor_id: advisor.user_id,
                    requester_id: user.id,
                    requester_type: 'Startup',
                    startup_id: startupData?.id,
                    startup_profile_url: startupProfileUrl
                  });
                } catch (connErr) {
                  console.error('Error creating connection request record', connErr);
                  // Don't fail the whole flow if this fails
                }

                alert('Pitch request sent to the advisor. You will see updates in your dashboard.');
              } catch (err) {
                console.error('Error during pitch request', err);
                alert('Could not submit pitch request. Please try again.');
              }
            }}
          >
            Pitch
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicAdvisorPage;

