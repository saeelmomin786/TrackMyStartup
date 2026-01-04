import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';
import { getQueryParam } from '../lib/urlState';
import MentorCard from './mentor/MentorCard';
import { authService, AuthUser } from '../lib/auth';
import { messageService } from '../lib/messageService';
import { investorConnectionRequestService } from '../lib/investorConnectionRequestService';
import { parseProfileUrl } from '../lib/slugUtils';
import { resolveSlug } from '../lib/slugResolver';
import SEOHead from './SEOHead';

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
  // Metrics
  startupsMentoring?: number;
  startupsMentoredPreviously?: number;
  verifiedStartupsMentored?: number;
}

const PublicMentorPage: React.FC = () => {
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<'idle' | 'requested' | 'already'>('idle');
  const [professionalExperiences, setProfessionalExperiences] = useState<any[]>([]);
  const [startupAssignments, setStartupAssignments] = useState<any[]>([]);
  const [foundedStartups, setFoundedStartups] = useState<any[]>([]);

  // Check for path-based URL first (e.g., /mentor/mentor-name)
  const pathProfile = parseProfileUrl(window.location.pathname);
  const queryMentorId = getQueryParam('mentorId');
  const queryUserId = getQueryParam('userId');
  
  // Resolve IDs from slug if path-based URL is used
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const resolveMentorId = async () => {
      if (pathProfile && pathProfile.view === 'mentor') {
        // Path-based URL: resolve slug to user_id
        const resolvedId = await resolveSlug('mentor', pathProfile.slug);
        if (resolvedId) {
          setUserId(String(resolvedId));
          // Clean up any query parameters for SEO (keep URL clean)
          if (window.history && (queryUserId || queryMentorId)) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('userId');
            newUrl.searchParams.delete('mentorId');
            window.history.replaceState({}, '', newUrl.toString());
          }
        } else {
          setError('Mentor not found');
          setLoading(false);
        }
      } else if (queryMentorId || queryUserId) {
        // Query param URL (backward compatibility)
        setMentorId(queryMentorId || null);
        setUserId(queryUserId || null);
      } else {
        setError('Mentor identifier is missing.');
        setLoading(false);
      }
    };
    
    resolveMentorId();
  }, [pathProfile, queryMentorId, queryUserId]);

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
      // Don't set error here - it's already handled in resolveMentorId
      return;
    }

    const loadMentor = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use public table for better security and performance
        // Try public table first, fallback to main table if needed
        let query = supabase.from('mentors_public_table').select('*').limit(1);
        let usePublicTable = true;

        // Public table uses user_id as primary key
        const lookupId = userId || mentorId;
        if (lookupId) {
          query = query.eq('user_id', lookupId);
        }

        let { data, error } = await query.single();

        // Fallback to main table if public table doesn't exist or query fails
        if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
          console.warn('[PublicMentorPage] Public table not available, falling back to main table');
          usePublicTable = false;
          query = supabase.from('mentor_profiles').select('*').limit(1);
          
          if (mentorId) {
            // mentorId might be the old 'id' field (UUID) or user_id
            query = query.or(`id.eq.${mentorId},user_id.eq.${mentorId}`);
          } else if (userId) {
            query = query.eq('user_id', userId);
          }
          
          const fallbackResult = await query.single();
          data = fallbackResult.data;
          error = fallbackResult.error;
        }

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

          // Load metrics for public display
          try {
            // Query active assignments
            const { data: activeAssignments, error: activeError } = await supabase
              .from('mentor_startup_assignments')
              .select(`
                id,
                startup_id,
                status,
                startups (
                  id,
                  user_id
                )
              `)
              .eq('mentor_id', mentorData.user_id)
              .eq('status', 'active');

            // Query completed assignments
            const { data: completedAssignments, error: completedError } = await supabase
              .from('mentor_startup_assignments')
              .select(`
                id,
                startup_id,
                status,
                startups (
                  id,
                  user_id
                )
              `)
              .eq('mentor_id', mentorData.user_id)
              .eq('status', 'completed');

            if (activeError) {
              console.error('Error loading active assignments:', activeError);
            }
            if (completedError) {
              console.error('Error loading completed assignments:', completedError);
            }

            if (!activeError && !completedError) {
              // Calculate metrics
              const activeCount = activeAssignments?.length || 0;
              const completedCount = completedAssignments?.length || 0;
              
              // Calculate verified startups (only those with user_id - registered users on TMS)
              const verifiedActive = (activeAssignments || []).filter((a: any) => 
                a.startup_id && a.startups && a.startups.user_id
              ).length;
              const verifiedCompleted = (completedAssignments || []).filter((a: any) => 
                a.startup_id && a.startups && a.startups.user_id
              ).length;
              const verifiedCount = verifiedActive + verifiedCompleted;

              mentorData.startupsMentoring = activeCount;
              mentorData.startupsMentoredPreviously = completedCount;
              mentorData.verifiedStartupsMentored = verifiedCount;
              
              console.log('✅ Loaded mentor metrics:', {
                startupsMentoring: activeCount,
                startupsMentoredPreviously: completedCount,
                verifiedStartupsMentored: verifiedCount
              });
            } else {
              // Set defaults if query fails (likely due to RLS)
              console.warn('⚠️ Could not load metrics - RLS may be blocking. Setting defaults to 0.');
              mentorData.startupsMentoring = 0;
              mentorData.startupsMentoredPreviously = 0;
              mentorData.verifiedStartupsMentored = 0;
            }
          } catch (metricsError) {
            console.error('❌ Error loading mentor metrics for public view:', metricsError);
            // Set defaults if metrics loading fails
            mentorData.startupsMentoring = 0;
            mentorData.startupsMentoredPreviously = 0;
            mentorData.verifiedStartupsMentored = 0;
          }
        }

        setMentor(mentorData);

        // Load professional experiences for SEO
        if (mentorData.user_id) {
          try {
            const { data: expData } = await supabase
              .from('mentor_professional_experience')
              .select('company, position')
              .eq('mentor_id', mentorData.user_id)
              .order('from_date', { ascending: false })
              .limit(5);
            if (expData) setProfessionalExperiences(expData);
          } catch (err) {
            console.warn('Could not load professional experiences for SEO:', err);
          }

          // Load startup assignments for SEO
          try {
            const { data: assignmentsData } = await supabase
              .from('mentor_startup_assignments')
              .select(`
                startups (
                  name
                )
              `)
              .eq('mentor_id', mentorData.user_id)
              .in('status', ['active', 'completed'])
              .limit(5);
            if (assignmentsData) {
              const startupNames = assignmentsData
                .map((a: any) => a.startups?.name)
                .filter(Boolean);
              setStartupAssignments(startupNames);
            }
          } catch (err) {
            console.warn('Could not load startup assignments for SEO:', err);
          }

          // Load founded startups for SEO
          try {
            const { data: foundedData } = await supabase
              .from('mentor_founded_startups')
              .select(`
                startups (
                  name
                )
              `)
              .eq('mentor_id', mentorData.user_id)
              .limit(5);
            if (foundedData) {
              const startupNames = foundedData
                .map((f: any) => f.startups?.name)
                .filter(Boolean);
              setFoundedStartups(startupNames);
            }
          } catch (err) {
            console.warn('Could not load founded startups for SEO:', err);
          }
        }
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

  // Clean up ?page=landing from URL if present (for SEO) - MUST be before any early returns
  useEffect(() => {
    if (getQueryParam('page') === 'landing' && pathProfile) {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  }, [pathProfile]);

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

      // Redirect to clean login page
      const url = new URL(window.location.origin);
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

  // SEO data - Clean URL (remove query parameters for SEO)
  const mentorName = mentor?.mentor_name || mentor?.user?.name || 'Mentor';
  
  // Build rich SEO description with all available data
  const descriptionParts: string[] = [];
  descriptionParts.push(`${mentorName}${mentor?.mentor_type ? ` is a ${mentor.mentor_type}` : ' is a mentor'}`);
  if (mentor?.location) descriptionParts.push(`based in ${mentor.location}`);
  if (mentor?.expertise_areas && mentor.expertise_areas.length > 0) {
    descriptionParts.push(`Expertise: ${mentor.expertise_areas.join(', ')}`);
  }
  if (mentor?.sectors && mentor.sectors.length > 0) {
    descriptionParts.push(`Sectors: ${mentor.sectors.join(', ')}`);
  }
  if (mentor?.years_of_experience) {
    descriptionParts.push(`${mentor.years_of_experience} years of experience`);
  }
  if (mentor?.companies_mentored) {
    descriptionParts.push(`Mentored ${mentor.companies_mentored} companies`);
  }
  
  // Add professional experiences (company names)
  if (professionalExperiences.length > 0) {
    const companies = professionalExperiences
      .map(exp => exp.company)
      .filter(Boolean)
      .slice(0, 3);
    if (companies.length > 0) {
      descriptionParts.push(`Experience at: ${companies.join(', ')}`);
    }
  }
  
  // Add startup assignments (startup names mentored)
  if (startupAssignments.length > 0) {
    const startupNames = startupAssignments.slice(0, 3);
    descriptionParts.push(`Mentoring: ${startupNames.join(', ')}`);
  }
  
  // Add founded startups
  if (foundedStartups.length > 0) {
    const foundedNames = foundedStartups.slice(0, 3);
    descriptionParts.push(`Founded: ${foundedNames.join(', ')}`);
  }
  
  const mentorDescription = descriptionParts.join('. ') + '.';
  const cleanPath = window.location.pathname; // Already clean from slug-based URL
  const canonicalUrl = `${window.location.origin}${cleanPath}`;
  const ogImage = mentor?.logo_url && mentor.logo_url !== '#' ? mentor.logo_url : undefined;

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 sm:px-4">
      {/* SEO Head Component */}
      {mentor && (
        <SEOHead
          title={`${mentorName} - Mentor Profile | TrackMyStartup`}
          description={mentorDescription}
          canonicalUrl={canonicalUrl}
          ogImage={ogImage}
          ogType="profile"
          profileType="mentor"
          name={mentorName}
          website={mentor.website && mentor.website !== '#' ? mentor.website : undefined}
          linkedin={mentor.linkedin_link && mentor.linkedin_link !== '#' ? mentor.linkedin_link : undefined}
          email={mentor.email}
          location={mentor.location}
        />
      )}
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
          isPublicView={true}
          currentUserId={authUserId}
        />
      </div>
    </div>
  );
};

export default PublicMentorPage;


