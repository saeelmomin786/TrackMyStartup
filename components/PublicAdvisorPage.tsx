import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import InvestmentAdvisorCard from './investment-advisor/InvestmentAdvisorCard';
import { getQueryParam } from '../lib/urlState';
import Card from './ui/Card';
import Button from './ui/Button';
import { advisorConnectionRequestService } from '../lib/advisorConnectionRequestService';

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

  useEffect(() => {
    const userId = getQueryParam('userId');
    const advisorId = getQueryParam('advisorId');
    if (!userId && !advisorId) {
      setError('Advisor identifier is missing.');
      setLoading(false);
      return;
    }

    const loadAdvisor = async () => {
      setLoading(true);
      try {
        const query = supabase
          .from('investment_advisor_profiles')
          .select('*')
          .limit(1);

        if (advisorId) {
          query.eq('id', advisorId);
        } else {
          query.eq('user_id', userId);
        }

        const { data, error } = await query.single();
        if (error) {
          throw error;
        }

        // Load firm_name from users table (from registration)
        const userIdToFetch = advisorId ? data.user_id : userId;
        const { data: userData } = await supabase
          .from('users')
          .select('firm_name, name')
          .eq('id', userIdToFetch)
          .maybeSingle();

        // Merge firm_name from users table into advisor profile
        const advisorWithFirmName = {
          ...data,
          // Use firm_name from users table (registration) as primary, fallback to profile firm_name
          firm_name: userData?.firm_name || data.firm_name,
          user: userData ? { name: userData.name, email: '' } : undefined
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
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
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
                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.set('page', 'login');
                url.searchParams.delete('view');
                url.searchParams.delete('advisorId');
                url.searchParams.delete('userId');
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
                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.set('page', 'login');
                url.searchParams.delete('view');
                url.searchParams.delete('advisorId');
                url.searchParams.delete('userId');
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
                  // Get startup ID
                  const { data: startupData } = await supabase
                    .from('startups')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                  const startupProfileUrl = window.location.origin + window.location.pathname + `?view=startup&startupId=${startupData?.id || ''}`;
                  
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

