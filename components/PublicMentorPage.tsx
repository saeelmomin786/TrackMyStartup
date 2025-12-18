import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';
import { getQueryParam } from '../lib/urlState';
import MentorCard from './mentor/MentorCard';
import { authService, AuthUser } from '../lib/auth';
import { messageService } from '../lib/messageService';
import { investorConnectionRequestService } from '../lib/investorConnectionRequestService';

interface MentorProfile {
  id?: string;
  user_id: string;
  mentor_name?: string;
  mentor_type?: string;
  location?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  expertise_areas?: string[];
  sectors?: string[];
  mentoring_stages?: string[];
  years_of_experience?: number;
  companies_mentored?: number;
  companies_founded?: number;
  current_role?: string;
  previous_companies?: string[];
  mentoring_approach?: string;
  availability?: string;
  preferred_engagement?: string;
  fee_type?: string;
  fee_amount_min?: number;
  fee_amount_max?: number;
  fee_currency?: string;
  equity_amount_min?: number;
  equity_amount_max?: number;
  fee_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
}

const PublicMentorPage: React.FC = () => {
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<'idle' | 'requested' | 'already'>('idle');

  const mentorId = getQueryParam('mentorId');
  const userId = getQueryParam('userId');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
          try {
            const { data: { user: supaUser } } = await supabase.auth.getUser();
            setAuthUserId(supaUser?.id || null);
          } catch (authErr) {
            console.error('Error getting auth user on PublicMentorPage:', authErr);
            setAuthUserId(null);
          }
        } else {
          setCurrentUser(null);
          setAuthUserId(null);
        }
      } catch (err) {
        console.error('Error checking auth on PublicMentorPage:', err);
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthUserId(null);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!mentorId && !userId) {
      setError('Mentor identifier is missing.');
      setLoading(false);
      return;
    }

    const loadMentor = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase.from('mentor_profiles').select('*').limit(1);

        if (mentorId) {
          query = query.eq('id', mentorId);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query.single();

        if (error) {
          throw error;
        }

        const mentorData = data as MentorProfile;

        // Load user name/email for display if available
        if (mentorData.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', mentorData.user_id)
            .maybeSingle();

          if (userData) {
            (mentorData as any).user = {
              name: userData.name,
              email: userData.email,
            };
          }
        }

        setMentor(mentorData);
      } catch (err: any) {
        console.error('Error loading mentor profile', err);
        setError('Unable to load mentor profile.');
      } finally {
        setLoading(false);
      }
    };

    loadMentor();
  }, [mentorId, userId]);

  const isOwnMentorProfile = !!mentor && !!authUserId && mentor.user_id === authUserId;

  // Check on load if this startup has already requested this mentor
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!mentor || !authUserId || !currentUser || currentUser.role !== 'Startup') return;

      try {
        const { data, error } = await supabase
          .from('mentor_requests')
          .select('status')
          .eq('mentor_id', mentor.user_id)
          .eq('requester_id', authUserId)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing mentor request on load:', error);
          return;
        }

        if (data) {
          setConnectStatus('already');
        }
      } catch (err) {
        console.error('Error checking existing mentor request on load:', err);
      }
    };

    checkExistingRequest();
  }, [mentor, authUserId, currentUser]);

  const handleConnect = async () => {
    if (!mentor) return;

    console.log('🔹 PublicMentorPage: Connect clicked', {
      isAuthenticated,
      currentUser,
      mentorIdFromUrl: mentorId,
      mentorUserId: mentor.user_id,
    });

    // If already requested, just show info
    if (connectStatus === 'already') {
      messageService.info('Already Requested', 'You already have a mentor request for this profile. Please check your dashboard.', 4000);
      alert('You already requested this mentor. Please check your dashboard.');
      return;
    }

    // Require login
    if (!isAuthenticated || !currentUser) {
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);

      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('mentorId');
      url.searchParams.delete('userId');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    try {
      // Prevent self-connect (by auth user id)
      if (authUserId && mentor.user_id === authUserId) {
        console.log('🔹 PublicMentorPage: Preventing self-connect', {
          authUserId,
          mentorUserId: mentor.user_id,
        });
        messageService.info('Not Allowed', 'You cannot connect to your own mentor profile.', 3000);
        return;
      }

      // If requester is a Startup → create mentor_requests entry (shows in Pending Requests)
      if (currentUser.role === 'Startup') {
        // Use auth.uid() for requester_id to satisfy RLS
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const authUserId = authUser?.id || currentUser.id;

        console.log('🔹 PublicMentorPage: Startup connect flow', {
          authUserId,
          currentUserId: currentUser.id,
        });

        // Find the startup for this user
        const { data: userStartups, error: startupError } = await supabase
          .from('startups')
          .select('id, name')
          .eq('user_id', authUserId)
          .limit(1);

        if (startupError) {
          console.error('Error loading startup for mentor request:', startupError);
          messageService.error('Error', 'Failed to load your startup. Please try again.', 3000);
          return;
        }

        if (!userStartups || userStartups.length === 0) {
          messageService.error('No Startup Found', 'Please create a startup profile first.', 3000);
          return;
        }

        const startup = userStartups[0];

        console.log('🔹 PublicMentorPage: Found startup for connect', startup);

        // Check if a request already exists
        const { data: existing, error: existingError } = await supabase
          .from('mentor_requests')
          .select('*')
          .eq('mentor_id', mentor.user_id)
          .eq('requester_id', authUserId)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Error checking existing mentor request:', existingError);
        }

        if (existing) {
          console.log('🔹 PublicMentorPage: Existing mentor request found', existing);
          setConnectStatus('already');
          if (existing.status === 'accepted') {
            messageService.info('Already Connected', 'You are already connected with this mentor.', 3000);
          } else {
            messageService.info('Already Requested', 'You already have a mentor request for this profile. Please check your dashboard.', 4000);
          }
          alert('You already requested this mentor. Please check your dashboard.');
          return;
        }

        const { error: insertError } = await supabase
          .from('mentor_requests')
          .insert({
            mentor_id: mentor.user_id,
            requester_id: authUserId,
            requester_type: 'Startup',
            startup_id: startup.id,
            message: `${startup.name} is requesting mentorship.`,
          });

        if (insertError) {
          console.error('❌ PublicMentorPage: Error creating mentor request:', insertError);
          messageService.error('Error', insertError.message || 'Failed to send mentor request. Please try again.', 4000);
          alert('Failed to send mentor request. Please check console for details.');
          return;
        }

        console.log('✅ PublicMentorPage: Mentor request created successfully');
        setConnectStatus('requested');
        messageService.success('Connection Requested', 'Your mentor request has been submitted. Please check your dashboard for updates.', 4000);
        alert('Connection request submitted. Please check your dashboard.');
        return;
      }

      // Any other role → create collaborator request via investor_connection_requests
      const targetUserId = mentor.user_id;
      const requesterId = currentUser.id;
      const requesterRole = currentUser.role;

      // Check if collaborator request already exists
      const existingCheck = await investorConnectionRequestService.checkExistingRequest(targetUserId, requesterId);
      if (existingCheck.exists) {
        console.log('🔹 PublicMentorPage: Existing collaborator request found', existingCheck);
        if (existingCheck.status === 'accepted') {
          messageService.info('Already Connected', 'You are already connected with this mentor.', 3000);
          return;
        } else if (existingCheck.status === 'pending') {
          messageService.info('Pending Request', 'You already have a pending collaboration request.', 3000);
          return;
        }
      }

      await investorConnectionRequestService.createRequest({
        investor_id: targetUserId,
        requester_id: requesterId,
        requester_type: requesterRole as any,
      });

      console.log('✅ PublicMentorPage: Collaborator request created successfully');
      messageService.success('Request Sent', 'Collaboration request sent successfully!', 3000);
      alert('Collaboration request sent successfully!');
    } catch (err: any) {
      console.error('Error in mentor connect:', err);
      const msg = err?.message || 'Failed to send connection request. Please try again.';
      messageService.error('Error', msg, 4000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="p-6 shadow">
          <div className="text-sm text-slate-600">Loading mentor profile...</div>
        </Card>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="p-6 shadow max-w-lg w-full text-center">
          <div className="text-lg font-semibold text-slate-900 mb-2">Error</div>
          <div className="text-sm text-slate-600 mb-4">{error || 'Mentor not found.'}</div>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Mentor Profile</h1>
          <p className="text-sm text-slate-600">Shareable public view.</p>
        </div>
        <MentorCard
          mentor={mentor}
          onConnect={isOwnMentorProfile ? undefined : handleConnect}
          connectLabel={
            isOwnMentorProfile
              ? undefined
              : connectStatus === 'requested'
              ? 'Connection request submitted'
              : connectStatus === 'already'
              ? 'Already requested – check your dashboard'
              : undefined
          }
          connectDisabled={isOwnMentorProfile || connectStatus !== 'idle'}
        />
      </div>
    </div>
  );
};

export default PublicMentorPage;


