import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Startup, InvestmentType, ComplianceStatus } from '../types';
import { Eye, Users, TrendingUp, DollarSign, Building2, Film, Search, Heart, CheckCircle, Star, Shield, LayoutGrid, FileText, Clock, CheckCircle2, X, Mail, UserPlus, Plus, Send, Copy, Briefcase, Share2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { mentorService, MentorMetrics, MentorRequest, MentorAssignment } from '../lib/mentorService';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ProfilePage from './ProfilePage';
import StartupHealthView from './StartupHealthView';
import MentorDataForm from './MentorDataForm';
import MentorProfileForm from './mentor/MentorProfileForm';
import MentorCard from './mentor/MentorCard';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discover' | 'portfolio'>(() => {
    const fromUrl = (getQueryParam('tab') as any) || 'dashboard';
    const valid = ['dashboard', 'discover', 'portfolio'];
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

  // Mentor metrics state
  const [mentorMetrics, setMentorMetrics] = useState<MentorMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSection, setFormSection] = useState<'active' | 'completed' | 'founded' | null>(null);
  
  // Mentor profile state
  const [previewProfile, setPreviewProfile] = useState<any>(null);
  
  // Tab state for mentor startups section
  const [mentorStartupsTab, setMentorStartupsTab] = useState<'active' | 'completed' | 'founded'>('active');
  
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mentor Dashboard</h1>
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
            >
              Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LayoutGrid className="h-5 w-5 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'portfolio'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="h-5 w-5 mr-2" />
              Portfolio
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
                        <p className="text-sm font-medium text-slate-500">Startups Founded</p>
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
                  <Card>
                    <h3 className="text-base sm:text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      Pending Requests ({mentorMetrics.pendingRequests.length})
                    </h3>
                    {mentorMetrics.pendingRequests.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No pending requests at this time.</p>
                        <p className="text-xs mt-1">Requests from startups will appear here when they add you as a mentor.</p>
                      </div>
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested</th>
                            <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {mentorMetrics.pendingRequests.map(request => {
                            // Find startup from request
                            const requestStartup = request.startup_id ? startups.find(s => s.id === request.startup_id) : null;
                            
                            return (
                              <tr key={request.id}>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-900 font-medium">
                                  {request.startup_name || requestStartup?.name || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {request.startup_website ? (
                                    <a 
                                      href={request.startup_website.startsWith('http') ? request.startup_website : `https://${request.startup_website}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      {request.startup_website}
                                    </a>
                                  ) : (
                                    'N/A'
                                  )}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {request.startup_sector || requestStartup?.sector || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {request.fee_type ? (
                                    <div>
                                      <div className="font-medium">{request.fee_type}</div>
                                      {request.fee_amount !== null && request.fee_amount !== undefined && (
                                        <div className="text-xs text-slate-400">
                                          {formatCurrency(request.fee_amount, 'USD')}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    'N/A'
                                  )}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {new Date(request.requested_at).toLocaleDateString()}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    {requestStartup && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                        onClick={() => handleViewStartup(requestStartup)}
                                      >
                                        <Eye className="mr-1 h-3 w-3" /> View Startup
                                      </Button>
                                    )}
                                    {request.startup_id && !requestStartup && onViewStartup && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                        onClick={() => onViewStartup(request.startup_id!)}
                                      >
                                        <Eye className="mr-1 h-3 w-3" /> View Startup
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="primary" 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={async () => {
                                        if (confirm('Are you sure you want to accept this mentor request? This will add the startup to your Currently Mentoring section.')) {
                                          const success = await mentorService.acceptMentorRequest(request.id);
                                          if (success) {
                                            // Reload mentor metrics
                                            if (currentUser?.id) {
                                              const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                              setMentorMetrics(metrics);
                                              // Switch to Currently Mentoring tab to show the newly accepted startup
                                              if (metrics.activeAssignments.length > 0) {
                                                setMentorStartupsTab('active');
                                              }
                                            }
                                          } else {
                                            alert('Failed to accept mentor request. Please try again.');
                                          }
                                        }
                                      }}
                                    >
                                      <CheckCircle className="mr-1 h-3 w-3" /> Accept
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="border-red-300 text-red-600 hover:bg-red-50"
                                      onClick={async () => {
                                        if (confirm('Are you sure you want to reject this mentor request?')) {
                                          const success = await mentorService.rejectMentorRequest(request.id);
                                          if (success) {
                                            // Reload mentor metrics
                                            if (currentUser?.id) {
                                              const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                              setMentorMetrics(metrics);
                                            }
                                          } else {
                                            alert('Failed to reject mentor request. Please try again.');
                                          }
                                        }
                                      }}
                                    >
                                      <X className="mr-1 h-3 w-3" /> Reject
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
                  </Card>
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
                              Startups Founded ({mentorMetrics.foundedStartups.length})
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
                            
                            if (assignment.notes) {
                              try {
                                const notesData = JSON.parse(assignment.notes);
                                startupName = notesData.startup_name || startupName;
                                emailId = notesData.email_id || '';
                                website = notesData.website || '';
                                sector = notesData.sector || '';
                              } catch (e) {
                                // Notes is not JSON, use startup data
                                website = assignment.startup?.domain || '';
                                sector = assignment.startup?.sector || '';
                              }
                            } else if (assignment.startup) {
                              website = assignment.startup.domain || '';
                              sector = assignment.startup.sector || '';
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
                                  {mentorService.formatCurrency(assignment.fee_amount || 0, assignment.fee_currency || 'USD')}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                  {assignment.esop_percentage > 0 ? `${assignment.esop_percentage}%` : 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
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
                            
                            if (assignment.notes) {
                              try {
                                const notesData = JSON.parse(assignment.notes);
                                startupName = notesData.startup_name || startupName;
                                emailId = notesData.email_id || '';
                                website = notesData.website || '';
                                sector = notesData.sector || '';
                              } catch (e) {
                                // Notes is not JSON, use startup data
                                website = assignment.startup?.domain || '';
                                sector = assignment.startup?.sector || '';
                              }
                            } else if (assignment.startup) {
                              website = assignment.startup.domain || '';
                              sector = assignment.startup.sector || '';
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
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}

                    {/* Founded Startups Tab Content */}
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

                            return (
                              <tr key={startup.id}>
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleInviteToTMS(startup.name, (startup as any).email_id)}
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                  >
                                    <Send className="mr-1 h-3 w-3" /> Invite to TMS
                                  </Button>
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
                        <p className="text-sm">No founded startups.</p>
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
          <div className="animate-fade-in max-w-3xl mx-auto w-full px-4">
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
            
            {/* Pitches Reels */}
            <div className="space-y-4">
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
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No Pitches Found</h3>
                    <p className="text-slate-500">
                      {searchTerm ? 'No startups match your search criteria.' : 'No active fundraising pitches available at this time.'}
                    </p>
                  </div>
                </Card>
              ) : (
                filteredPitches.map(pitch => {
                  const embedUrl = investorService.getYoutubeEmbedUrl(pitch.pitchVideoUrl);
                  return (
                    <Card key={pitch.id} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white relative max-w-4xl mx-auto">

                      {/* Video Section - Reels Style */}
                      <div className="relative w-full aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        {embedUrl ? (
                          playingVideoId === pitch.id ? (
                            <div className="relative w-full h-full">
                              <iframe
                                src={embedUrl}
                                title={`Pitch video for ${pitch.name}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute top-0 left-0 w-full h-full"
                              ></iframe>
                              <button
                                onClick={() => setPlayingVideoId(null)}
                                className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 hover:bg-black/90 transition-all duration-200 backdrop-blur-sm"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div
                              className="relative w-full h-full group cursor-pointer"
                              onClick={() => { setPlayingVideoId(pitch.id); setSelectedPitchId(pitch.id); }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300 group-hover:shadow-red-500/50">
                                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <p className="text-sm font-medium">Click to play</p>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Film className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-sm">No video available</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content Section - Compact Reels Style */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 break-words">{pitch.name}</h3>
                            <p className="text-sm text-slate-600 font-medium">{pitch.sector}</p>
                          </div>
                          {pitch.isStartupNationValidated && (
                            <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ml-2">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </div>
                          )}
                        </div>
                                            
                        {/* Action Buttons - Compact */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            className={`!rounded-full !p-2 transition-all duration-200 ${
                              favoritedPitches.has(pitch.id)
                                ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-200'
                                : 'hover:bg-red-50 hover:text-red-600 border border-slate-200'
                            }`}
                            onClick={() => toggleFavorite(pitch.id)}
                          >
                            <Heart className={`h-4 w-4 ${favoritedPitches.has(pitch.id) ? 'fill-current' : ''}`} />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShare(pitch)}
                            className="!rounded-full !p-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>

                          {pitch.pitchDeckUrl && pitch.pitchDeckUrl !== '#' && (
                            <a href={pitch.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px]">
                              <Button size="sm" variant="secondary" className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 text-xs">
                                <FileText className="h-3 w-3 mr-1.5" /> Deck
                              </Button>
                            </a>
                          )}

                          <button
                            onClick={() => handleDueDiligenceClick(pitch)}
                            className={`flex-1 min-w-[120px] transition-all duration-200 border px-2.5 py-2 rounded-lg text-xs font-medium ${
                              dueDiligenceStartups.has(pitch.id)
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                                : 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 border-slate-200 bg-white'
                            }`}
                          >
                            <svg className="h-3 w-3 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Due Diligence
                          </button>

                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleViewStartup(pitch)}
                            className="flex-1 min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1.5" /> View Details
                          </Button>
                        </div>
                      </div>

                      {/* Investment Details Footer - Compact */}
                      <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-t border-slate-200">
                        <div className="text-sm">
                          <span className="font-semibold text-slate-800">Ask:</span> {investorService.formatCurrency(pitch.investmentValue || 0)} for <span className="font-semibold text-purple-600">{pitch.equityAllocation || 0}%</span> equity
                        </div>
                        {pitch.isStartupNationValidated && (
                          <div className="flex items-center gap-1 text-green-600" title="This startup has been verified by Startup Nation">
                            <CheckCircle className="h-3 w-3" />
                            <span className="text-xs font-semibold">Verified</span>
                          </div>
                        )}
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
      </div>
    </div>
  );
};

export default MentorView;

