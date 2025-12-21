import React, { useState, useEffect, useMemo } from 'react';
import { User, Startup, InvestmentType, ComplianceStatus } from '../types';
import { Eye, Users, TrendingUp, DollarSign, Building2, Film, Search, Heart, CheckCircle, Star, Shield, LayoutGrid, FileText, Clock, CheckCircle2, X, Mail, UserPlus, Plus, Send, Copy, Briefcase, Share2, Video, Linkedin, Globe, ExternalLink, HelpCircle, Bell, CheckSquare, XCircle, Trash2, Calendar } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { AuthUser } from '../lib/auth';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { mentorService, MentorMetrics, MentorRequest, MentorAssignment } from '../lib/mentorService';
import { supabase } from '../lib/supabase';
import { getVideoEmbedUrl } from '../lib/videoUtils';
import { investorConnectionRequestService, InvestorConnectionRequest } from '../lib/investorConnectionRequestService';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ProfilePage from './ProfilePage';
import StartupHealthView from './StartupHealthView';
import MentorDataForm from './MentorDataForm';
import MentorProfileForm from './mentor/MentorProfileForm';
import MentorCard from './mentor/MentorCard';
import { AddProfileModal } from './AddProfileModal';
import MentorPendingRequestsSection from './mentor/MentorPendingRequestsSection';
import SchedulingModal from './mentor/SchedulingModal';
import ScheduledSessionsSection from './mentor/ScheduledSessionsSection';
import ManageAvailabilityModal from './mentor/ManageAvailabilityModal';
import PastSessionsSection from './mentor/PastSessionsSection';

interface MentorViewProps {
  currentUser: AuthUser | null;
  users: User[];
  startups: Startup[];
  onViewStartup: (id: number, targetTab?: string) => void;
}

const MentorView: React.FC<MentorViewProps> = ({
  currentUser,
  users,
  startups,
  onViewStartup
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discover' | 'portfolio' | 'collaboration' | 'schedule'>(() => {
    const fromUrl = (getQueryParam('tab') as any) || 'dashboard';
    const valid = ['dashboard', 'discover', 'portfolio', 'collaboration', 'schedule'];
    return valid.includes(fromUrl) ? fromUrl : 'dashboard';
  });

  useEffect(() => {
    setQueryParam('tab', activeTab, true);
  }, [activeTab]);

  const [showProfilePage, setShowProfilePage] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [discoverySubTab, setDiscoverySubTab] = useState<'all' | 'verified' | 'favorites' | 'due-diligence'>('all');
  const [showOnlyDueDiligence, setShowOnlyDueDiligence] = useState(false);
  const [dueDiligenceStartups, setDueDiligenceStartups] = useState<Set<number>>(new Set());
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);

  // Collaboration state
  const [collaborationSubTab, setCollaborationSubTab] = useState<'explore-collaborators' | 'my-collaborators' | 'requests'>('explore-collaborators');
  const [collaboratorRequests, setCollaboratorRequests] = useState<InvestorConnectionRequest[]>([]);
  const [collaborators, setCollaborators] = useState<InvestorConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Mentor metrics state
  const [mentorMetrics, setMentorMetrics] = useState<MentorMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSection, setFormSection] = useState<'active' | 'completed' | 'founded' | null>(null);
  
  // Mentor profile state
  const [previewProfile, setPreviewProfile] = useState<any>(null);
  
  // Tab state for mentor startups section
  const [mentorStartupsTab, setMentorStartupsTab] = useState<'active' | 'completed' | 'founded'>('active');
  
  // State for Add Profile Modal
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  
  // State for Scheduling Modal
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [selectedAssignmentForScheduling, setSelectedAssignmentForScheduling] = useState<any>(null);
  
  // State for Manage Availability Modal
  const [manageAvailabilityModalOpen, setManageAvailabilityModalOpen] = useState(false);
  
  // State for Schedule Tab Sub-tabs
  const [scheduleSubTab, setScheduleSubTab] = useState<'availability' | 'upcoming' | 'past'>('upcoming');
  
  // Handle navigation from profile form to dashboard
  const handleNavigateToDashboard = (section?: 'active' | 'completed' | 'founded') => {
    setActiveTab('dashboard');
    if (section) {
      setFormSection(section);
      setShowAddForm(true);
      // Set the appropriate tab in the startups section
      if (section === 'active') {
        setMentorStartupsTab('active');
      } else if (section === 'completed') {
        setMentorStartupsTab('completed');
      } else if (section === 'founded') {
        setMentorStartupsTab('founded');
      }
    }
  };
  
  // Reset form section when form is closed
  useEffect(() => {
    if (!showAddForm) {
      setFormSection(null);
    }
  }, [showAddForm]);
  
  // Set initial tab based on available data
  useEffect(() => {
    if (mentorMetrics) {
      if (mentorMetrics.activeAssignments.length > 0) {
        setMentorStartupsTab('active');
      } else if (mentorMetrics.completedAssignments.length > 0) {
        setMentorStartupsTab('completed');
      } else if (mentorMetrics.foundedStartups.length > 0) {
        setMentorStartupsTab('founded');
      }
    }
  }, [mentorMetrics]);

  // Fetch mentor metrics
  const fetchMetrics = async () => {
    if (!currentUser?.id) return;
    
    setIsLoadingMetrics(true);
    try {
      const metrics = await mentorService.getMentorMetrics(currentUser.id);
      setMentorMetrics(metrics);
    } catch (error) {
      console.error('Error fetching mentor metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'portfolio') {
      fetchMetrics();
    }
  }, [currentUser?.id, activeTab]);

  // Fetch active fundraising startups for discover section
  useEffect(() => {
    if (activeTab === 'discover') {
      const fetchPitches = async () => {
        setIsLoadingPitches(true);
        try {
          const pitches = await investorService.getActiveFundraisingStartups();
          setActiveFundraisingStartups(pitches);
        } catch (error) {
          console.error('Error fetching pitches:', error);
        } finally {
          setIsLoadingPitches(false);
        }
      };
      fetchPitches();
    }
  }, [activeTab]);

  // Load collaborator requests
  useEffect(() => {
    if (currentUser?.id && activeTab === 'collaboration') {
      const loadConnectionRequests = async () => {
        setLoadingRequests(true);
        try {
          // Load from investor_connection_requests (for requests TO the mentor)
          // This includes requests from ALL profile types: Investor, Investment Advisor, Mentor, CA, CS, Incubator, etc.
          const investorRequests = await investorConnectionRequestService.getRequestsForInvestor(currentUser.id!);
          // Filter out only Startup requests (startups go to Service Requests, not Collaboration)
          // All other profiles (Investor, Advisor, Mentor, CA, CS, Incubator, etc.) are collaborators
          const collaboratorSide = (investorRequests || []).filter(
            r => r.requester_type !== 'Startup'
          );

          // Also load requests FROM the mentor to other profiles (where mentor is the requester)
          // This ensures both parties see each other in "My Collaborators"
          // Supports collaboration with ALL profile types
          // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const authUserId = authUser?.id || currentUser.id;
          
          const { data: requestsFromMentor, error: requesterError } = await supabase
            .from('investor_connection_requests')
            .select('*')
            .eq('requester_id', authUserId) // Use auth.uid() instead of profile ID
            .neq('requester_type', 'Startup') // Exclude startup requests (those are handled separately)
            .order('created_at', { ascending: false });

          if (requesterError) {
            console.error('Error loading requests from mentor:', requesterError);
          }

          // Merge both sides - requests TO mentor and FROM mentor
          const allCollaboratorRequests = [...collaboratorSide, ...(requestsFromMentor || [])];
          
          setCollaboratorRequests(collaboratorSide); // Only show incoming requests in "Collaborator Requests" tab
          
          // Set accepted requests as collaborators from BOTH sides
          // This ensures both parties see each other after acceptance
          const acceptedToMentor = collaboratorSide.filter(r => r.status === 'accepted');
          const acceptedFromMentor = (requestsFromMentor || []).filter(r => r.status === 'accepted');
          setCollaborators([...acceptedToMentor, ...acceptedFromMentor]);
        } catch (error) {
          console.error('Error loading connection requests:', error);
        } finally {
          setLoadingRequests(false);
        }
      };
      loadConnectionRequests();
    }
  }, [currentUser?.id, activeTab]);

  // Filter pitches based on search and sub-tabs
  const filteredPitches = useMemo(() => {
    let filtered = [...activeFundraisingStartups];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(pitch =>
        pitch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sub-tab filters
    if (showOnlyFavorites) {
      filtered = filtered.filter(pitch => favoritedPitches.has(pitch.id));
    }

    if (showOnlyValidated) {
      filtered = filtered.filter(pitch => pitch.isStartupNationValidated);
    }

    if (showOnlyDueDiligence) {
      filtered = filtered.filter(pitch => dueDiligenceStartups.has(pitch.id));
    }

    return filtered;
  }, [activeFundraisingStartups, searchTerm, showOnlyFavorites, showOnlyValidated, showOnlyDueDiligence, favoritedPitches, dueDiligenceStartups]);

  const handleViewStartup = (startup: Startup | ActiveFundraisingStartup) => {
    if ('id' in startup && typeof startup.id === 'number') {
      const fullStartup = startups.find(s => s.id === startup.id);
      if (fullStartup) {
        setSelectedStartup(fullStartup);
      } else {
        // If startup not in our list, try to view it via onViewStartup
        onViewStartup(startup.id);
      }
    }
  };

  const openStartupPublicPage = (startupId: number) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'startup');
    url.searchParams.set('startupId', String(startupId));
    window.open(url.toString(), '_blank');
  };

  const handleBack = () => {
    setSelectedStartup(null);
  };

  const toggleFavorite = (pitchId: number) => {
    setFavoritedPitches(prev => {
      const next = new Set(prev);
      if (next.has(pitchId)) {
        next.delete(pitchId);
      } else {
        next.add(pitchId);
      }
      return next;
    });
  };

  const handleFavoriteToggle = toggleFavorite;

  const handleShare = (pitch: ActiveFundraisingStartup) => {
    const url = window.location.href.split('?')[0] + `?startup=${pitch.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Check out ${pitch.name}`,
        text: `${pitch.name} - ${pitch.sector}`,
        url: url
      }).catch(() => {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleDueDiligenceClick = (pitch: ActiveFundraisingStartup) => {
    if (dueDiligenceStartups.has(pitch.id)) {
      setDueDiligenceStartups(prev => {
        const next = new Set(prev);
        next.delete(pitch.id);
        return next;
      });
    } else {
      setDueDiligenceStartups(prev => {
        const next = new Set(prev);
        next.add(pitch.id);
        return next;
      });
    }
  };

  const handleConnect = async (pitch: ActiveFundraisingStartup) => {
    if (!currentUser?.id) {
      alert('Please log in to connect with startups.');
      return;
    }

    // Find the startup in the startups array to get the user_id
    const startup = startups.find(s => s.id === pitch.id);
    if (!startup) {
      alert('Startup information not found.');
      return;
    }

    try {
      // CRITICAL FIX: requester_id in investor_connection_requests references auth.users(id), not profile_id
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id;
      if (!authUserId) {
        alert('Unable to get user information. Please try again.');
        return;
      }
      
      // Check if a request already exists (pending or accepted)
      const existingCheck = await investorConnectionRequestService.checkExistingRequest(
        startup.user_id, // investor_id (the startup owner) - this is auth_user_id
        authUserId    // requester_id (the mentor) - must be auth_user_id
      );

      if (existingCheck.exists) {
        if (existingCheck.status === 'accepted') {
          alert('You are already connected with this startup!');
          return;
        } else if (existingCheck.status === 'pending') {
          alert('You already have a pending connection request with this startup. Please wait for their response.');
          return;
        }
      }

      // Create a connection request using investor_connection_requests table
      // This allows mentors to connect with startups and other users
      await investorConnectionRequestService.createRequest({
        investor_id: startup.user_id,  // auth_user_id
        requester_id: authUserId,  // Use auth_user_id, not profile_id
        requester_type: 'Mentor',
        startup_id: startup.id,
        startup_profile_url: window.location.origin + window.location.pathname + `?view=startup&startupId=${startup.id}`,
        message: `${currentUser.name || 'A mentor'} wants to connect with your startup.`
      });

      alert(`Connection request sent to ${pitch.name}!`);
    } catch (error: any) {
      console.error('Error in handleConnect:', error);
      if (error.message && error.message.includes('already connected')) {
        alert(error.message);
      } else {
        alert('Failed to send connection request. Please try again.');
      }
    }
  };

  const handleInviteToTMS = (startupName: string, emailId?: string) => {
    const mentorName = currentUser?.name || 'Mentor';
    const invitationSubject = `Invitation to Join TrackMyStartup - ${startupName}`;
    const invitationBody = `Hello,

I'm ${mentorName}, and I'd like to invite ${startupName} to join TrackMyStartup - a comprehensive platform for startup growth and management.

With TrackMyStartup, you'll get access to:
• Complete startup health tracking
• Financial modeling and projections
• Compliance management
• Investor relations
• Team management
• Fundraising tools
• And much more!

Join us on TrackMyStartup to take your startup to the next level.

Best regards,
${mentorName}`;

    const mailtoLink = `mailto:${emailId || ''}?subject=${encodeURIComponent(invitationSubject)}&body=${encodeURIComponent(invitationBody)}`;
    window.open(mailtoLink, '_blank');
  };

  if (selectedStartup) {
    return (
      <StartupHealthView
        startup={selectedStartup}
        userRole="Mentor"
        user={currentUser}
        onBack={handleBack}
        onActivateFundraising={() => {}}
        onInvestorAdded={() => {}}
        onUpdateFounders={() => {}}
        isViewOnly={true}
        investmentOffers={[]}
        onProcessOffer={() => {}}
      />
    );
  }

  if (showProfilePage) {
    return (
      <ProfilePage
        user={currentUser}
        onBack={() => setShowProfilePage(false)}
        onProfileUpdate={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mentor Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Welcome back, {currentUser?.name || 'Mentor'}</p>
              {currentUser?.mentor_code && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Your Mentor Code:</span>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                    <span className="text-sm font-mono font-semibold text-blue-700">
                      {currentUser.mentor_code}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(currentUser.mentor_code || '');
                          alert('Mentor code copied to clipboard!');
                        } catch (error) {
                          console.error('Failed to copy code:', error);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Copy mentor code"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowProfilePage(true)}
              className="w-full sm:w-auto"
            >
              Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto space-x-4 sm:space-x-8 -mb-px">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LayoutGrid className="h-5 w-5 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'discover'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Film className="h-5 w-5 mr-2" />
              Discover Pitches
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'portfolio'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="h-5 w-5 mr-2" />
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center relative whitespace-nowrap ${
                activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              Collaboration
              {collaboratorRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-amber-500 rounded-full">
                  {collaboratorRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {isLoadingMetrics ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Dashboard...</h3>
                  <p className="text-slate-500">Fetching your mentor metrics</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Requests Received</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.requestsReceived || 0}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Startups Mentoring</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.startupsMentoring || 0}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Mentored Previously</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.startupsMentoredPreviously || 0}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Startup Experience</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.startupsFounded || 0}</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-full">
                        <Star className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total Earnings (Fees)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {mentorService.formatCurrency(mentorMetrics?.totalEarningsFees || 0, 'USD')}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-full">
                        <DollarSign className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total Earnings (ESOP)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {mentorService.formatCurrency(mentorMetrics?.totalEarningsESOP || 0, 'USD')}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-100 rounded-full">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Add/Edit Data Form */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">Manage Your Mentoring Data</h3>
                    <Button
                      variant={showAddForm ? "outline" : "primary"}
                      onClick={() => setShowAddForm(!showAddForm)}
                    >
                      {showAddForm ? (
                        <>
                          <X className="h-4 w-4 mr-2" /> Hide Form
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" /> Add/Edit Data
                        </>
                      )}
                    </Button>
                  </div>
                  {showAddForm && currentUser?.id && (
                    <MentorDataForm
                      mentorId={currentUser.id}
                      startups={startups}
                      onUpdate={fetchMetrics}
                      mentorMetrics={mentorMetrics}
                      initialSection={formSection || undefined}
                    />
                  )}
                </Card>

                {/* Pending Requests */}
                {mentorMetrics && (
                  <MentorPendingRequestsSection
                    requests={mentorMetrics.pendingRequests}
                    onRequestAction={async () => {
                                            // Reload mentor metrics
                                            if (currentUser?.id) {
                                              const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                              setMentorMetrics(metrics);
                      }
                    }}
                  />
                )}

                {/* Combined Mentor Startups Section */}
                {mentorMetrics && (
                  (mentorMetrics.activeAssignments.length > 0 || 
                   mentorMetrics.completedAssignments.length > 0 || 
                   mentorMetrics.foundedStartups.length > 0) && (
                  <Card>
                    <div className="mb-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-4 text-slate-700">My Startups</h3>
                      {/* Tabs */}
                      <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                          <button
                            onClick={() => setMentorStartupsTab('active')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                              mentorStartupsTab === 'active'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Currently Mentoring ({mentorMetrics.activeAssignments.length})
                            </div>
                          </button>
                          <button
                            onClick={() => setMentorStartupsTab('completed')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                              mentorStartupsTab === 'completed'
                                ? 'border-purple-500 text-purple-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Previously Mentored ({mentorMetrics.completedAssignments.length})
                            </div>
                          </button>
                          <button
                            onClick={() => setMentorStartupsTab('founded')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                              mentorStartupsTab === 'founded'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              Startup Experience ({mentorMetrics.foundedStartups.length})
                            </div>
                          </button>
                        </nav>
                      </div>
                    </div>

                    {/* Currently Mentoring Tab Content */}
                    {mentorStartupsTab === 'active' && mentorMetrics.activeAssignments.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From Date</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ESOP</th>
                            <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {mentorMetrics.activeAssignments.map(assignment => {
                            // Parse notes to get startup_name, email_id, website, and sector
                            let startupName = assignment.startup?.name || `Startup #${assignment.startup_id || 'N/A'}`;
                            let emailId = '';
                            let website = '';
                            let sector = '';
                            let fromDate = '';
                            
                            if (assignment.notes) {
                              try {
                                const notesData = JSON.parse(assignment.notes);
                                startupName = notesData.startup_name || startupName;
                                emailId = notesData.email_id || '';
                                website = notesData.website || '';
                                sector = notesData.sector || '';
                                fromDate = notesData.from_date || '';
                              } catch (e) {
                                // Notes is not JSON, use startup data
                                website = assignment.startup?.domain || '';
                                sector = assignment.startup?.sector || '';
                              }
                            } else if (assignment.startup) {
                              website = assignment.startup.domain || '';
                              sector = assignment.startup.sector || '';
                            }
                            
                            // If from_date not in notes, use assigned_at
                            if (!fromDate && assignment.assigned_at) {
                              fromDate = assignment.assigned_at.split('T')[0];
                            }

                            return (
                              <tr key={assignment.id}>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs sm:text-sm font-medium text-slate-900">
                                    {startupName}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {website ? (
                                    <a 
                                      href={website.startsWith('http') ? website : `https://${website}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline"
                                    >
                                      {website}
                                    </a>
                                  ) : 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {sector || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {fromDate || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {mentorService.formatCurrency(assignment.fee_amount || 0, assignment.fee_currency || 'USD')}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {assignment.esop_percentage > 0 ? `${assignment.esop_percentage}%` : 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Schedule button - only for TMS startups */}
                                    {assignment.startup && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 border-green-300 hover:bg-green-50"
                                        onClick={() => {
                                          setSelectedAssignmentForScheduling(assignment);
                                          setSchedulingModalOpen(true);
                                        }}
                                      >
                                        <Video className="mr-1 h-3 w-3" /> Schedule
                                      </Button>
                                    )}
                                    {/* Only show Invite to TMS if assignment didn't come from a request */}
                                    {!(assignment as any).fromRequest && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleInviteToTMS(startupName, emailId)}
                                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                      >
                                        <Send className="mr-1 h-3 w-3" /> Invite to TMS
                                      </Button>
                                    )}
                                    {assignment.startup && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewStartup(assignment.startup!)}
                                      >
                                        <Eye className="mr-2 h-4 w-4" /> View
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                      onClick={async () => {
                                        if (confirm(`Mark ${startupName} as completed? This will move it to Previously Mentored section.`)) {
                                          const success = await mentorService.completeMentoringAssignment(assignment.id);
                                          if (success) {
                                            // Reload mentor metrics
                                            if (currentUser?.id) {
                                              const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                              setMentorMetrics(metrics);
                                              // Switch to Previously Mentored tab to show the moved startup
                                              if (metrics.completedAssignments.length > 0) {
                                                setMentorStartupsTab('completed');
                                              }
                                            }
                                          } else {
                                            alert('Failed to mark mentoring as completed. Please try again.');
                                          }
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="mr-1 h-3 w-3" /> Update
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-300 hover:bg-red-50"
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete ${startupName}? This action cannot be undone.`)) {
                                          const success = await mentorService.deleteMentoringAssignment(assignment.id);
                                          if (success) {
                                            // Reload mentor metrics
                                            if (currentUser?.id) {
                                              const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                              setMentorMetrics(metrics);
                                            }
                                          } else {
                                            alert('Failed to delete mentoring assignment. Please try again.');
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}

                    {/* Previously Mentored Tab Content */}
                    {mentorStartupsTab === 'completed' && mentorMetrics.completedAssignments.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From Date</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">To Date</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Earned</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ESOP Value</th>
                            <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {mentorMetrics.completedAssignments.map(assignment => {
                            // Parse notes to get startup_name, email_id, website, and sector
                            let startupName = assignment.startup?.name || `Startup #${assignment.startup_id || 'N/A'}`;
                            let emailId = '';
                            let website = '';
                            let sector = '';
                            let fromDate = '';
                            let toDate = '';
                            
                            if (assignment.notes) {
                              try {
                                const notesData = JSON.parse(assignment.notes);
                                startupName = notesData.startup_name || startupName;
                                emailId = notesData.email_id || '';
                                website = notesData.website || '';
                                sector = notesData.sector || '';
                                fromDate = notesData.from_date || '';
                                toDate = notesData.to_date || '';
                              } catch (e) {
                                // Notes is not JSON, use startup data
                                website = assignment.startup?.domain || '';
                                sector = assignment.startup?.sector || '';
                              }
                            } else if (assignment.startup) {
                              website = assignment.startup.domain || '';
                              sector = assignment.startup.sector || '';
                            }
                            
                            // If from_date not in notes, use assigned_at
                            if (!fromDate && assignment.assigned_at) {
                              fromDate = assignment.assigned_at.split('T')[0];
                            }
                            
                            // If to_date not in notes but completed_at exists, use completed_at
                            if (!toDate && assignment.completed_at) {
                              toDate = assignment.completed_at.split('T')[0];
                            }

                            return (
                              <tr key={assignment.id}>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs sm:text-sm font-medium text-slate-900">
                                    {startupName}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {website ? (
                                    <a 
                                      href={website.startsWith('http') ? website : `https://${website}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline"
                                    >
                                      {website}
                                    </a>
                                  ) : 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {sector || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {fromDate || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {toDate || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {mentorService.formatCurrency(assignment.fee_amount || 0, assignment.fee_currency || 'USD')}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {mentorService.formatCurrency(assignment.esop_value || 0, 'USD')}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleInviteToTMS(startupName, emailId)}
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    >
                                      <Send className="mr-1 h-3 w-3" /> Invite to TMS
                                    </Button>
                                    {assignment.startup && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewStartup(assignment.startup!)}
                                      >
                                        <Eye className="mr-2 h-4 w-4" /> View
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-300 hover:bg-red-50"
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete ${startupName}? This action cannot be undone.`)) {
                                          const success = await mentorService.deleteMentoringAssignment(assignment.id);
                                          if (success) {
                                            // Reload mentor metrics
                                            if (currentUser?.id) {
                                              const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                              setMentorMetrics(metrics);
                                            }
                                          } else {
                                            alert('Failed to delete mentoring assignment. Please try again.');
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}

                    {/* Startup Experience Tab Content */}
                    {mentorStartupsTab === 'founded' && mentorMetrics.foundedStartups.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Valuation</th>
                            <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {mentorMetrics.foundedStartups.map(startup => {
                            // Get email_id, website, and sector from the startup object
                            const emailId = (startup as any).email_id || '';
                            const website = (startup as any).website || startup.domain || '';
                            const sector = (startup as any).sector || startup.sector || '';
                            
                            // Check if startup is on TMS (has user_id or is a valid TMS startup)
                            // If startup was created from notes (manually entered), it won't have user_id
                            const isOnTMS = startup.user_id || (startup.id && typeof startup.id === 'number' && startup.id > 0 && !startup.notes);

                            return (
                              <tr key={startup.id || `manual-${startup.name}`}>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs sm:text-sm font-medium text-slate-900">{startup.name}</div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {website ? (
                                    <a 
                                      href={website.startsWith('http') ? website : `https://${website}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline"
                                    >
                                      {website}
                                    </a>
                                  ) : 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {sector || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {formatCurrency(startup.currentValuation || 0, startup.currency || 'USD')}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    {isOnTMS ? (
                                      // Startup is already on TMS - show View button
                                  <Button
                                    size="sm"
                                    variant="outline"
                                        onClick={() => handleViewStartup(startup as Startup)}
                                      >
                                        <Eye className="mr-2 h-4 w-4" /> View
                                      </Button>
                                    ) : (
                                      // Startup not on TMS yet - show Add to TMS button
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowAddProfileModal(true)}
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                  >
                                        <UserPlus className="mr-1 h-3 w-3" /> Add to TMS
                                  </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}

                    {/* Empty state messages */}
                    {mentorStartupsTab === 'active' && mentorMetrics.activeAssignments.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No active mentoring assignments.</p>
                      </div>
                    )}
                    {mentorStartupsTab === 'completed' && mentorMetrics.completedAssignments.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No previously mentored startups.</p>
                      </div>
                    )}
                    {mentorStartupsTab === 'founded' && mentorMetrics.foundedStartups.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Star className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No startup experience.</p>
                      </div>
                    )}
                  </Card>
                  )
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="animate-fade-in max-w-6xl mx-auto w-full">
            {/* Enhanced Header */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
                <p className="text-sm text-slate-600">Watch startup videos and explore opportunities</p>
              </div>
              
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search startups by name or sector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              
              {/* Discovery Sub-Tabs */}
              <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto pb-2" aria-label="Discovery Tabs">
                  <button
                    onClick={() => {
                      setDiscoverySubTab('all');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'all'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Film className="h-3 w-3 sm:h-4 sm:w-4" />
                    All
                  </button>
                  
                  <button
                    onClick={() => {
                      setDiscoverySubTab('verified');
                      setShowOnlyValidated(true);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'verified'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Verified</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setDiscoverySubTab('favorites');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(true);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'favorites'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${discoverySubTab === 'favorites' ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Favorites</span>
                    <span className="sm:hidden">Fav</span>
                  </button>
                
                  <button
                    onClick={() => {
                      setDiscoverySubTab('due-diligence');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(true);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'due-diligence'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden md:inline">Due Diligence</span>
                    <span className="md:hidden">DD</span>
                  </button>
                </nav>
              </div>
                
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-xl border border-blue-100 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    {discoverySubTab === 'due-diligence'
                      ? `${dueDiligenceStartups.size} due diligence requests`
                      : `${activeFundraisingStartups.length} active pitches`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-500">
                  <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm">Pitch Reels</span>
                </div>
              </div>
            </div>
                
            <div className="space-y-6 sm:space-y-8">
              {isLoadingPitches ? (
                <Card className="text-center py-20">
                  <div className="max-w-sm mx-auto">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                    <p className="text-slate-500">Fetching active fundraising startups</p>
                  </div>
                </Card>
              ) : filteredPitches.length === 0 ? (
                <Card className="text-center py-20">
                  <div className="max-w-sm mx-auto">
                    <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      {searchTerm.trim()
                        ? 'No Matching Startups'
                        : showOnlyValidated 
                          ? 'No Verified Startups' 
                          : showOnlyFavorites 
                            ? 'No Favorited Pitches'
                            : showOnlyDueDiligence
                              ? 'No Due Diligence Access Yet'
                              : 'No Active Fundraising'
                      }
                    </h3>
                    <p className="text-slate-500">
                      {searchTerm.trim()
                        ? 'No startups found matching your search. Try adjusting your search terms or filters.'
                        : showOnlyValidated
                          ? 'No Startup Nation verified startups are currently fundraising. Try removing the verification filter or check back later.'
                          : showOnlyFavorites 
                            ? 'Start favoriting pitches to see them here.'
                            : showOnlyDueDiligence
                              ? 'Due diligence requests you send will appear here immediately, even before startups approve them.'
                              : 'No startups are currently fundraising. Check back later for new opportunities.'
                      }
                    </p>
                  </div>
                </Card>
              ) : (
                filteredPitches.map(inv => {
                  const videoEmbedInfo = inv.pitchVideoUrl ? getVideoEmbedUrl(inv.pitchVideoUrl, false) : null;
                  const embedUrl = videoEmbedInfo?.embedUrl || investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
                  const videoSource = videoEmbedInfo?.source || null;
                  const isFavorited = favoritedPitches.has(inv.id);
                  const hasDueDiligence = dueDiligenceStartups.has(inv.id);

                  return (
                    <Card key={inv.id} className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Video/Logo Section */}
                        <div className="md:w-1/3">
                          {embedUrl ? (
                            playingVideoId === inv.id ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                                {videoSource === 'direct' ? (
                                  <video
                                    src={embedUrl}
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <iframe
                                    src={embedUrl}
                                    title={`Pitch video for ${inv.name}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                )}
                              </div>
                            ) : (
                              <div
                                className="relative w-full aspect-video rounded-lg overflow-hidden bg-black cursor-pointer group"
                                onClick={() => { setPlayingVideoId(inv.id); setSelectedPitchId(inv.id); }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : inv.logoUrl && inv.logoUrl !== '#' ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center">
                              <img
                                src={inv.logoUrl}
                                alt={`${inv.name} logo`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                              <Video className="h-12 w-12 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="md:w-2/3 flex flex-col relative">
                          {/* Header Section */}
                          <div className="mb-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="text-xl font-bold text-slate-800 flex-1">{inv.name}</h3>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShare(inv)}
                                className="flex-shrink-0"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge status={inv.complianceStatus} />
                              {inv.isStartupNationValidated && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Verified
                                </span>
                              )}
                              <span className="text-sm text-slate-600">{inv.sector}</span>
                            </div>
                          </div>

                          {/* Investment Details */}
                          <div className="mb-4">
                            {/* Investment Ask and Equity in one line */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Investment Ask:</span>
                                <span className="text-xs font-medium text-slate-600">
                                  {investorService.formatCurrency(inv.investmentValue, inv.currency || 'USD')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Equity:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.equityAllocation}%</span>
                              </div>
                            </div>
                            {/* Round Type, Currency, Stage, Domain in one line */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              {inv.fundraisingType && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Round Type:</span>
                                  <span className="text-xs font-medium text-slate-600">{inv.fundraisingType}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Currency:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.currency || 'USD'}</span>
                              </div>
                              {inv.stage && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Stage:</span>
                                  <span className="text-xs font-medium text-slate-600">{inv.stage}</span>
                                </div>
                              )}
                              {inv.domain && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Domain:</span>
                                  <span className="text-xs font-medium text-slate-600">{inv.domain}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Links & Documents Section */}
                          <div className="mb-4 pb-3 border-b border-slate-200">
                            <div className="text-xs font-medium text-slate-500 mb-2">Links & Documents</div>
                            <div className="flex flex-wrap gap-2">
                              {inv.websiteUrl && inv.websiteUrl !== '#' && (
                                <a
                                  href={inv.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                  Website
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.linkedInUrl && inv.linkedInUrl !== '#' && (
                                <a
                                  href={inv.linkedInUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <Linkedin className="h-3.5 w-3.5" />
                                  LinkedIn
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                                <a
                                  href={inv.pitchDeckUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Pitch Deck
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.onePagerUrl && inv.onePagerUrl !== '#' && (
                                <a
                                  href={inv.onePagerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  One-Pager
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.businessPlanUrl && inv.businessPlanUrl !== '#' && (
                                <a
                                  href={inv.businessPlanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Business Plan
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {(!inv.websiteUrl || inv.websiteUrl === '#') && 
                               (!inv.linkedInUrl || inv.linkedInUrl === '#') && 
                               (!inv.pitchDeckUrl || inv.pitchDeckUrl === '#') && 
                               (!inv.onePagerUrl || inv.onePagerUrl === '#') && 
                               (!inv.businessPlanUrl || inv.businessPlanUrl === '#') && (
                                <span className="text-xs text-slate-400 italic">No links available</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFavoriteToggle(inv.id)}
                            >
                              <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                              {isFavorited ? 'Favorited' : 'Favorite'}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDueDiligenceClick(inv)}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {hasDueDiligence ? 'Due Diligence Requested' : 'Due Diligence'}
                            </Button>

                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleConnect(inv)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Connect
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6 animate-fade-in">
            {/* Two-column layout: Form on left, Preview on right */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 items-stretch">
              {/* Left: Mentor Profile Form */}
              {currentUser && (
                <Card className="p-4 sm:p-6 h-full">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Mentor Profile</h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Fill out your mentor profile details. Changes will be reflected in the preview.
                    </p>
                  </div>
                  <MentorProfileForm
                    currentUser={currentUser}
                    mentorMetrics={mentorMetrics}
                    onSave={(profile) => {
                      console.log('Profile saved:', profile);
                    }}
                    onProfileChange={(profile) => {
                      setPreviewProfile(profile);
                    }}
                    isViewOnly={false}
                    onNavigateToDashboard={handleNavigateToDashboard}
                    startups={startups}
                    onMetricsUpdate={fetchMetrics}
                  />
                </Card>
              )}

              {/* Right: Mentor Profile Card Preview */}
              <div className="flex flex-col h-full max-w-xl w-full mx-auto xl:mx-0">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">Your Mentor Card</h3>
                  <p className="text-xs text-slate-500">
                    This is how your profile will appear to startups on the Discover page
                  </p>
                </div>
                {previewProfile && currentUser ? (
                  <MentorCard
                    mentor={{
                      ...previewProfile,
                      startupsMentoring: mentorMetrics?.startupsMentoring ?? 0,
                      startupsMentoredPreviously: mentorMetrics?.startupsMentoredPreviously ?? 0,
                      verifiedStartupsMentored: mentorMetrics?.verifiedStartupsMentored ?? 0,
                      user: {
                        name: currentUser.name || currentUser.email?.split('@')[0],
                        email: currentUser.email
                      }
                    }}
                    onView={undefined}
                  />
                ) : (
                  <Card className="flex-1 !p-0 overflow-hidden shadow-lg border-0 bg-white">
                    <div className="w-full aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <div className="text-center text-slate-400">
                        <Briefcase className="h-16 w-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Fill out the form to see preview</p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="h-32 bg-slate-50 rounded"></div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in">
            {/* Schedule Tab Header */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Schedule Management</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Manage your availability slots and view all scheduled sessions
                  </p>
                </div>
                <Button
                  onClick={() => setManageAvailabilityModalOpen(true)}
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Availability
                </Button>
              </div>

              {/* Sub-tabs for Schedule */}
              <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-4" aria-label="Schedule Tabs">
                  <button
                    onClick={() => setScheduleSubTab('availability')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      scheduleSubTab === 'availability'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Clock className="h-4 w-4 inline mr-2" />
                    Availability
                  </button>
                  <button
                    onClick={() => setScheduleSubTab('upcoming')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      scheduleSubTab === 'upcoming'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Upcoming Sessions
                  </button>
                  <button
                    onClick={() => setScheduleSubTab('past')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      scheduleSubTab === 'past'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Past Sessions
                  </button>
                </nav>
              </div>

              {/* Availability Sub-tab */}
              {scheduleSubTab === 'availability' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">How Availability Works:</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Create recurring slots (e.g., Every Monday 2-4 PM) or one-time slots</li>
                      <li>• Startups can book sessions from your available slots</li>
                      <li>• Booked slots are automatically removed from availability</li>
                      <li>• You can activate/deactivate slots without deleting them</li>
                    </ul>
                  </div>
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">Click "Manage Availability" above to create your availability slots.</p>
                  </div>
                </div>
              )}

              {/* Upcoming Sessions Sub-tab */}
              {scheduleSubTab === 'upcoming' && currentUser?.id && (
                <div>
                  <ScheduledSessionsSection
                    mentorId={currentUser.id}
                    userType="Mentor"
                  />
                </div>
              )}

              {/* Past Sessions Sub-tab */}
              {scheduleSubTab === 'past' && currentUser?.id && (
                <div>
                  <PastSessionsSection
                    mentorId={currentUser.id}
                  />
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Collaboration</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Manage collaboration with all profiles: Investors, Investment Advisors, Mentors, CA, CS, Incubators, and more
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  size="sm"
                  variant={collaborationSubTab === 'explore-collaborators' ? 'primary' : 'outline'}
                  onClick={() => setCollaborationSubTab('explore-collaborators')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Explore Collaborators
                </Button>
                <Button
                  size="sm"
                  variant={collaborationSubTab === 'my-collaborators' ? 'primary' : 'outline'}
                  onClick={() => setCollaborationSubTab('my-collaborators')}
                >
                  My Collaborators
                </Button>
                <Button
                  size="sm"
                  variant={collaborationSubTab === 'requests' ? 'primary' : 'outline'}
                  onClick={() => setCollaborationSubTab('requests')}
                >
                  Collaborator Requests
                  {collaboratorRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-amber-500 rounded-full">
                      {collaboratorRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </Button>
              </div>

              {loadingRequests && collaborationSubTab !== 'explore-collaborators' ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading collaboration data...</p>
                </div>
              ) : collaborationSubTab === 'explore-collaborators' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Explore by Profile Type</h3>
                    <p className="text-sm text-slate-600 mb-6">Browse and connect with different types of collaborators</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                      { role: 'Investor', icon: DollarSign, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', description: 'Connect with investors' },
                      { role: 'Investment Advisor', icon: Briefcase, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', description: 'Connect with investment advisors' },
                      { role: 'Mentor', icon: Users, color: 'bg-green-100 text-green-700 hover:bg-green-200', description: 'Connect with mentors' },
                      { role: 'CA', icon: FileText, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200', description: 'Connect with Chartered Accountants' },
                      { role: 'CS', icon: Shield, color: 'bg-pink-100 text-pink-700 hover:bg-pink-200', description: 'Connect with Company Secretaries' },
                      { role: 'Incubation', icon: Building2, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', description: 'Connect with incubation centers' },
                    ].map((profileType) => {
                      const IconComponent = profileType.icon;
                      return (
                        <Card
                          key={profileType.role}
                          className="p-6 hover:shadow-lg transition-all duration-200 border border-slate-200 text-center"
                        >
                          <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full ${profileType.color} flex items-center justify-center mb-4 transition-colors`}>
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                              {profileType.role}
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">
                              {profileType.description}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navigate to explore users of this role type in same tab
                                const baseUrl = window.location.origin + window.location.pathname;
                                const url = new URL(baseUrl);
                                url.search = '';

                                if (profileType.role === 'Investor') {
                                  url.searchParams.set('view', 'explore');
                                  url.searchParams.set('role', 'Investor');
                                } else if (profileType.role === 'Investment Advisor') {
                                  url.searchParams.set('view', 'explore');
                                  url.searchParams.set('role', 'Investment Advisor');
                                } else if (profileType.role === 'Incubation') {
                                  url.searchParams.set('view', 'explore');
                                  url.searchParams.set('role', 'Startup Facilitation Center');
                                } else {
                                  url.searchParams.set('view', 'explore');
                                  url.searchParams.set('role', profileType.role);
                                }

                                window.location.href = url.toString();
                              }}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              Explore
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : collaborationSubTab === 'my-collaborators' ? (
                collaborators.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No collaborators yet</p>
                    <p className="text-sm text-slate-500 mt-1">Accepted collaboration requests from all profiles will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {collaborators.map((request) => (
                      <Card key={request.id} className="p-0 overflow-hidden border border-slate-200">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Media / Avatar */}
                          <div className="md:w-1/4 bg-slate-50 flex items-center justify-center p-6">
                            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold">
                              {request.requester_type?.[0] || 'C'}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="md:w-3/4 p-4 sm:p-6 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="success">Accepted</Badge>
                                  <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 capitalize">
                                  {request.requester_type || 'Collaborator'}
                                </h3>
                                <p className="text-sm text-slate-600">Requester ID: {request.requester_id}</p>
                              </div>
                              {request.advisor_profile_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(request.advisor_profile_url!, '_blank')}
                                  className="flex-shrink-0"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </Button>
                              )}
                            </div>

                            {request.message && request.message.trim() && (
                              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                                {request.message}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              ) : collaboratorRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No collaborator requests yet</p>
                  <p className="text-sm text-slate-500 mt-1">Connection requests from all profiles (Investors, Advisors, Mentors, CA, CS, Incubators, etc.) will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {collaboratorRequests.map((request) => (
                    <Card key={request.id} className="p-0 overflow-hidden border border-slate-200">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Media / Avatar */}
                        <div className="md:w-1/4 bg-slate-50 flex items-center justify-center p-6">
                          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-semibold">
                            {request.requester_type?.[0] || 'C'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="md:w-3/4 p-4 sm:p-6 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}>
                                  {request.status}
                                </Badge>
                                <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 capitalize">
                                {request.requester_type || 'Collaborator'} Request
                              </h3>
                              <p className="text-sm text-slate-600">Requester ID: {request.requester_id}</p>
                            </div>
                            {request.advisor_profile_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(request.advisor_profile_url!, '_blank')}
                                className="flex-shrink-0"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                            )}
                          </div>

                          {request.message && request.message.trim() && (
                            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                              {request.message}
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                  if (!currentUser?.id) return;
                                  try {
                                    await investorConnectionRequestService.updateRequestStatus(request.id, 'accepted', currentUser.id);
                                    // Reload requests
                                    const investorRequests = await investorConnectionRequestService.getRequestsForInvestor(currentUser.id!);
                                    const collaboratorSide = (investorRequests || []).filter(
                                      r => r.requester_type !== 'Startup'
                                    );
                                    setCollaboratorRequests(collaboratorSide);
                                    const accepted = collaboratorSide.filter(r => r.status === 'accepted');
                                    setCollaborators(accepted);
                                  } catch (error) {
                                    console.error('Error accepting request:', error);
                                    alert('Failed to accept request. Please try again.');
                                  }
                                }}
                              >
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (!currentUser?.id) return;
                                  try {
                                    await investorConnectionRequestService.updateRequestStatus(request.id, 'rejected', currentUser.id);
                                    // Reload requests
                                    const investorRequests = await investorConnectionRequestService.getRequestsForInvestor(currentUser.id!);
                                    const collaboratorSide = (investorRequests || []).filter(
                                      r => r.requester_type !== 'Startup'
                                    );
                                    setCollaboratorRequests(collaboratorSide);
                                    const accepted = collaboratorSide.filter(r => r.status === 'accepted');
                                    setCollaborators(accepted);
                                  } catch (error) {
                                    console.error('Error rejecting request:', error);
                                    alert('Failed to reject request. Please try again.');
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
      
      {/* Add Profile Modal */}
      <AddProfileModal
        isOpen={showAddProfileModal}
        onClose={() => setShowAddProfileModal(false)}
        onProfileCreated={() => {
          setShowAddProfileModal(false);
          // Optionally reload metrics or refresh data
          if (currentUser?.id) {
            mentorService.getMentorMetrics(currentUser.id).then(setMentorMetrics);
          }
        }}
      />

      {/* Scheduling Modal */}
      {schedulingModalOpen && selectedAssignmentForScheduling && (
        <SchedulingModal
          isOpen={schedulingModalOpen}
          onClose={() => {
            setSchedulingModalOpen(false);
            setSelectedAssignmentForScheduling(null);
          }}
          mentorId={currentUser?.id!}
          startupId={selectedAssignmentForScheduling.startup_id}
          assignmentId={selectedAssignmentForScheduling.id}
          onSessionBooked={async () => {
            // Reload metrics
            if (currentUser?.id) {
              const metrics = await mentorService.getMentorMetrics(currentUser.id);
              setMentorMetrics(metrics);
            }
          }}
        />
      )}

      {/* Manage Availability Modal */}
      {currentUser?.id && (
        <ManageAvailabilityModal
          isOpen={manageAvailabilityModalOpen}
          onClose={() => setManageAvailabilityModalOpen(false)}
          mentorId={currentUser.id}
        />
      )}
    </div>
  );
};

export default MentorView;

