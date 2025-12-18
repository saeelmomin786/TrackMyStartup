import React, { useState, useEffect } from 'react';
import { Startup, ComplianceStatus, FinancialRecord } from '../types';
import { caService, CAStartup, CAStats, CAAssignmentRequest } from '../lib/caService';
import { supabase } from '../lib/supabase';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import Card from './ui/Card';
import Button from './ui/Button';
import ProfilePage from './ProfilePage';
import ComplianceSubmissionButton from './ComplianceSubmissionButton';
import { FileText, CheckCircle, XCircle, AlertTriangle, DollarSign, UserCheck, Plus, Search, Filter, Menu, Film, Video, Heart, Share2 } from 'lucide-react';

interface CAViewProps {
  startups: Startup[];
  onUpdateCompliance: (startupId: number, status: ComplianceStatus) => void;
  onViewStartup: (startup: Startup) => void;
  currentUser?: { name?: string; email?: string; role?: string; profile_photo_url?: string } | null;
  onProfileUpdate?: (updatedUser: any) => void;
  onLogout?: () => void;
}

const CAView: React.FC<CAViewProps> = ({ startups, onUpdateCompliance, onViewStartup, currentUser, onProfileUpdate, onLogout }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'compliant' | 'non-compliant'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [caCode, setCaCode] = useState<string | null>(null);
  const [assignedStartups, setAssignedStartups] = useState<CAStartup[]>([]);
  const [assignmentRequests, setAssignmentRequests] = useState<CAAssignmentRequest[]>([]);
  const [localStartups, setLocalStartups] = useState<Startup[]>(startups);
  const [caStats, setCaStats] = useState<CAStats>({
    totalStartups: 0,
    pendingReview: 0,
    compliant: 0,
    nonCompliant: 0,
    activeAssignments: 0,
    pendingRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAllStartups, setShowAllStartups] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'requests' | 'reels'>('assignments');
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [pitches, setPitches] = useState<ActiveFundraisingStartup[]>([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());

  const handleShare = async (startup: ActiveFundraisingStartup) => {
    console.log('Share button clicked for startup:', startup.name);
    console.log('Startup object:', startup);
    const videoUrl = startup.pitchVideoUrl || 'Video not available';
    const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: $${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\nValuation: $${(startup.currentValuation || 0).toLocaleString()}\n\nPitch Video: ${videoUrl}`;
    console.log('Share details:', details);
        try {
            if (navigator.share) {
                console.log('Using native share API');
                const shareData = {
                    title: startup.name || 'Startup Pitch',
                    text: details,
                    url: videoUrl !== 'Video not available' ? videoUrl : undefined
                };
                await navigator.share(shareData);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
        console.log('Using clipboard API');
        await navigator.clipboard.writeText(details);
        alert('Startup details copied to clipboard');
      } else {
        console.log('Using fallback copy method');
        // Fallback: hidden textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = details;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Startup details copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled the share dialog; no need to show an error
        return;
      }
      alert('Unable to share. Try copying manually.');
    }
  };

  // Load CA data on component mount
  useEffect(() => {
    const loadCAData = async () => {
      setIsLoading(true);
      try {
        const [code, stats, assigned, requests] = await Promise.all([
          caService.getCACode(),
          caService.getCAStats(),
          caService.getAssignedStartups(),
          caService.getAssignmentRequests(),
        ]);
        
        setCaCode(code);
        setCaStats(stats);
        setAssignedStartups(assigned);
        setAssignmentRequests(requests);
      } catch (error) {
        console.error('Error loading CA data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCAData();
  }, []);

  // Load active fundraising pitches for Discover Pitches (Browse tab)
  useEffect(() => {
    const loadPitches = async () => {
      setIsLoadingPitches(true);
      try {
        const data = await investorService.getActiveFundraisingStartups();
        setPitches(data);
      } catch (e) {
        console.error('Error loading pitches:', e);
      } finally {
        setIsLoadingPitches(false);
      }
    };
    loadPitches();
  }, []);

  // Sync localStartups when props change
  useEffect(() => {
    setLocalStartups(startups);
  }, [startups]);

  const getFilteredStartups = () => {
    const startupsToFilter = activeTab === 'browse' ? localStartups : assignedStartups;
    return startupsToFilter.filter(startup => {
      const matchesFilter = selectedFilter === 'all' || 
        (selectedFilter === 'pending' && startup.complianceStatus === ComplianceStatus.Pending) ||
        (selectedFilter === 'compliant' && startup.complianceStatus === ComplianceStatus.Compliant) ||
        (selectedFilter === 'non-compliant' && startup.complianceStatus === ComplianceStatus.NonCompliant);
      
      const matchesSearch = startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           startup.sector.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  };

  const filteredStartups = getFilteredStartups();
  const pendingRequests = assignmentRequests.filter(r => r.status === 'pending');

  // Function to update CA stats when compliance status changes
  const updateCAStats = (newStatus: ComplianceStatus, oldStatus?: ComplianceStatus) => {
    setCaStats(prev => {
      const newStats = { ...prev };
      
      // Remove from old status count
      if (oldStatus) {
        switch (oldStatus) {
          case ComplianceStatus.Pending:
            newStats.pendingReview = Math.max(0, prev.pendingReview - 1);
            break;
          case ComplianceStatus.Compliant:
            newStats.compliant = Math.max(0, prev.compliant - 1);
            break;
          case ComplianceStatus.NonCompliant:
            newStats.nonCompliant = Math.max(0, prev.nonCompliant - 1);
            break;
        }
      }
      
      // Add to new status count
      switch (newStatus) {
        case ComplianceStatus.Pending:
          newStats.pendingReview += 1;
          break;
        case ComplianceStatus.Compliant:
          newStats.compliant += 1;
          break;
        case ComplianceStatus.NonCompliant:
          newStats.nonCompliant += 1;
          break;
      }
      
      return newStats;
    });
  };

  const getComplianceIcon = (status: ComplianceStatus) => {
    switch (status) {
      case ComplianceStatus.Compliant:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case ComplianceStatus.NonCompliant:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case ComplianceStatus.Pending:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getComplianceColor = (status: ComplianceStatus) => {
    switch (status) {
      case ComplianceStatus.Compliant:
        return 'text-green-700 bg-green-50 border-green-200';
      case ComplianceStatus.NonCompliant:
        return 'text-red-700 bg-red-50 border-red-200';
      case ComplianceStatus.Pending:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleAssignToStartup = async (startupId: number) => {
    try {
      const success = await caService.assignToStartup(startupId, 'CA assigned via dashboard');
      if (success) {
        // Refresh assigned startups
        const [stats, assigned] = await Promise.all([
          caService.getCAStats(),
          caService.getAssignedStartups(),
        ]);
        setCaStats(stats);
        setAssignedStartups(assigned);
        alert('Successfully assigned to startup!');
      } else {
        alert('Failed to assign to startup. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning to startup:', error);
      alert('Error assigning to startup.');
    }
  };

  const handleRemoveAssignment = async (startupId: number) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      const success = await caService.removeAssignment(startupId);
      if (success) {
        // Refresh data
        const [stats, assigned, requests] = await Promise.all([
          caService.getCAStats(),
          caService.getAssignedStartups(),
          caService.getAssignmentRequests(),
        ]);
        setCaStats(stats);
        setAssignedStartups(assigned);
        setAssignmentRequests(requests);
        alert('Assignment removed successfully!');
      } else {
        alert('Failed to remove assignment. Please try again.');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Error removing assignment.');
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      const success = await caService.approveAssignmentRequest(requestId);
      
      if (success) {
        // Refresh data
        const [stats, assigned, requests] = await Promise.all([
          caService.getCAStats(),
          caService.getAssignedStartups(),
          caService.getAssignmentRequests(),
        ]);
        
        setCaStats(stats);
        setAssignedStartups(assigned);
        setAssignmentRequests(requests);
        alert('Assignment request approved successfully!');
      } else {
        alert('Failed to approve request. Please try again.');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request.');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    const notes = prompt('Please provide a reason for rejection (optional):');
    try {
      const success = await caService.rejectAssignmentRequest(requestId, notes || undefined);
      if (success) {
        // Refresh data
        const [stats, assigned, requests] = await Promise.all([
          caService.getCAStats(),
          caService.getAssignedStartups(),
          caService.getAssignmentRequests(),
        ]);
        setCaStats(stats);
        setAssignedStartups(assigned);
        setAssignmentRequests(requests);
        alert('Assignment request rejected successfully!');
      } else {
        alert('Failed to reject request. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request.');
    }
  };

  const isAssignedToStartup = (startupId: number) => {
    return assignedStartups.some(s => s.id === startupId);
  };

  const isStartupAssigned = (startupId: number) => {
    return assignedStartups.some(s => s.id === startupId);
  };

  const handleFavoriteToggle = (pitchId: number) => {
    setFavoritedPitches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pitchId)) {
        newSet.delete(pitchId);
      } else {
        newSet.add(pitchId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading CA dashboard...</p>
        </div>
      </div>
    );
  }

  // Render ProfilePage if showProfilePage is true
  if (showProfilePage) {
    console.log('🔍 CAView: Rendering ProfilePage, showProfilePage =', showProfilePage);
    return (
      <ProfilePage
        currentUser={currentUser}
        onBack={() => {
          console.log('🔍 CAView: Back button clicked, setting showProfilePage to false');
          setShowProfilePage(false);
        }}
        onProfileUpdate={(updatedUser) => {
          console.log('Profile updated in CAView:', updatedUser);
          // Update the currentUser in parent component if needed
          // But don't close the ProfilePage - let user stay there
          // The ProfilePage will handle its own state updates
        }}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Three-dot Menu */}
          <div className="relative profile-menu">
            <button
              onClick={() => {
                console.log('🔍 CAView: Menu button clicked, setting showProfilePage to true');
                setShowProfilePage(true);
              }}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Profile menu"
            >
              <Menu className="h-6 w-6 text-slate-600" />
            </button>
          </div>
          
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">TrackMyStartup</h1>
            <p className="text-slate-600 text-sm lg:text-base">Manage financial compliance and audit requirements</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
          {caCode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">CA Code:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 lg:px-3 lg:py-1 rounded-md text-xs lg:text-sm font-medium">
                {caCode}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
            <span className="text-sm font-medium text-slate-600">Chartered Accountant</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-600">Total Startups</p>
              <p className="text-xl lg:text-2xl font-bold text-slate-900">{caStats.totalStartups}</p>
            </div>
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-600">Pending Review</p>
              <p className="text-xl lg:text-2xl font-bold text-yellow-600">{caStats.pendingReview}</p>
            </div>
            <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-600">Compliant</p>
              <p className="text-xl lg:text-2xl font-bold text-green-600">{caStats.compliant}</p>
            </div>
            <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-600">Non-Compliant</p>
              <p className="text-xl lg:text-2xl font-bold text-red-600">{caStats.nonCompliant}</p>
            </div>
            <XCircle className="h-6 w-6 lg:h-8 lg:w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-600">Active Assignments</p>
              <p className="text-xl lg:text-2xl font-bold text-brand-primary">{caStats.activeAssignments}</p>
            </div>
            <UserCheck className="h-6 w-6 lg:h-8 lg:w-8 text-brand-primary" />
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-600">Pending Requests</p>
              <p className="text-xl lg:text-2xl font-bold text-orange-600">{caStats.pendingRequests}</p>
            </div>
            <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Compliance Submission Button */}
      <ComplianceSubmissionButton 
        currentUser={currentUser} 
        userRole="CA" 
        className="mb-6"
      />

      {/* Tab Navigation */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <Button
              variant={activeTab === 'assignments' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('assignments')}
              className="w-full sm:w-auto text-sm"
            >
              My Assignments
            </Button>
            <Button
              variant={activeTab === 'requests' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('requests')}
              className="w-full sm:w-auto text-sm"
            >
              Assignment Requests ({caStats.pendingRequests})
            </Button>
            <Button
              variant={activeTab === 'reels' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('reels')}
              className="w-full sm:w-auto text-sm"
            >
              Discover Pitches
            </Button>
          </div>
          <div className="text-xs lg:text-sm text-slate-600 text-center lg:text-left">
            {activeTab === 'assignments' && 'View your assigned startups'}
            {activeTab === 'requests' && 'Review pending assignment requests'}
            {activeTab === 'reels' && 'Watch active fundraising pitches'}
          </div>
        </div>
      </Card>

      {/* Filters - Hidden for Discover Pitches */}
      {activeTab !== 'reels' && (
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search startups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant={selectedFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setSelectedFilter('all')}
              className="text-xs py-2"
            >
              All
            </Button>
            <Button
              variant={selectedFilter === 'pending' ? 'primary' : 'secondary'}
              onClick={() => setSelectedFilter('pending')}
              className="text-xs py-2"
            >
              Pending
            </Button>
            <Button
              variant={selectedFilter === 'compliant' ? 'primary' : 'secondary'}
              onClick={() => setSelectedFilter('compliant')}
              className="text-xs py-2"
            >
              Compliant
            </Button>
            <Button
              variant={selectedFilter === 'non-compliant' ? 'primary' : 'secondary'}
              onClick={() => setSelectedFilter('non-compliant')}
              className="text-xs py-2"
            >
              Non-Compliant
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Content based on active tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {filteredStartups.map((startup) => {
            const isAssigned = isAssignedToStartup(startup.id);
            return (
              <Card key={startup.id} className="p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-3 lg:gap-4">
                    {getComplianceIcon(startup.complianceStatus)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-900 truncate">{startup.name}</h3>
                      <p className="text-sm text-slate-600">{startup.sector}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                        {isAssigned && (
                          <span className="text-xs lg:text-sm text-brand-primary font-medium">
                            ✓ Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        {getComplianceIcon(startup.complianceStatus)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getComplianceColor(startup.complianceStatus)}`}>{startup.complianceStatus}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔍 View Details clicked for startup:', startup);
                          console.log('🔍 onViewStartup function exists:', !!onViewStartup);
                          
                          // Show a temporary alert to confirm the button is working
                          alert(`Navigating to ${startup.name} dashboard...`);
                          
                          // Create a simple startup object with the data we have
                          const startupData: Startup = {
                            id: startup.id,
                            name: startup.name,
                            investmentType: 'Seed' as any, // Default value
                            investmentValue: startup.totalFunding || 0,
                            equityAllocation: 0,
                            currentValuation: startup.totalFunding || 0,
                            complianceStatus: startup.complianceStatus,
                            sector: startup.sector,
                            totalFunding: startup.totalFunding,
                            totalRevenue: startup.totalRevenue,
                            registrationDate: startup.registrationDate,
                            founders: [],
                          };
                          
                          console.log('🔍 Calling onViewStartup with:', startupData);
                          
                          // Call the navigation function
                          onViewStartup(startupData);
                          
                          console.log('🔍 onViewStartup called successfully');
                        }}
                        className="w-full sm:w-auto text-xs"
                      >
                        View Details
                      </Button>
                      
                      {/* Manual approve/reject and remove actions are disabled; manage via Startup dashboard */}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {filteredStartups.length === 0 && (
            <Card className="p-6 lg:p-8 text-center">
              <FileText className="h-10 w-10 lg:h-12 lg:w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm lg:text-base text-slate-600">No startups assigned to you yet</p>
              <Button
                variant="primary"
                className="mt-4 w-full sm:w-auto"
                onClick={() => setActiveTab('browse')}
              >
                Browse All Startups
              </Button>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3 lg:gap-4">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base lg:text-lg font-semibold text-slate-900">{request.startupName}</h3>
                    <p className="text-sm text-slate-600">Assignment Request</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                      <span className="text-xs lg:text-sm text-slate-500">
                        Requested: {new Date(request.requestDate).toLocaleDateString()}
                      </span>
                      {request.notes && (
                        <span className="text-xs lg:text-sm text-slate-500">
                          Notes: {request.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="px-2 py-1 lg:px-3 lg:py-1 rounded-full text-xs lg:text-sm font-medium border text-orange-700 bg-orange-50 border-orange-200">
                    Pending
                  </span>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewStartup(startups.find(s => s.id === request.startupId) || startups[0])}
                    >
                      View Startup
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveRequest(request.id)}
                      className="text-green-600 border-green-600 hover:bg-green-50 w-full sm:w-auto text-xs"
                    >
                      Approve
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectRequest(request.id)}
                      className="text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto text-xs"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {pendingRequests.length === 0 && (
            <Card className="p-6 lg:p-8 text-center">
              <CheckCircle className="h-10 w-10 lg:h-12 lg:w-12 text-green-400 mx-auto mb-4" />
              <p className="text-sm lg:text-base text-slate-600">No pending assignment requests</p>
            </Card>
          )}
        </div>
      )}

      {/* Browse section removed per requirements */}

            {activeTab === 'reels' && (
        <div className="animate-fade-in max-w-4xl mx-auto w-full">
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
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                      />
                    </div>
                  </div>
                  
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      !showOnlyValidated && !showOnlyFavorites
                        ? 'bg-blue-600 text-white shadow-blue-200' 
                        : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                    }`}
                  >
                    <Film className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">All</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowOnlyValidated(true);
                      setShowOnlyFavorites(false);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      showOnlyValidated && !showOnlyFavorites
                        ? 'bg-green-600 text-white shadow-green-200' 
                        : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-600 border border-slate-200'
                    }`}
                  >
                    <CheckCircle className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyValidated && !showOnlyFavorites ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Verified</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(true);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      showOnlyFavorites
                        ? 'bg-red-600 text-white shadow-red-200' 
                        : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                    }`}
                  >
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Favorites</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">{pitches.length} active pitches</span>
                </div>
                    </div>
                    
              <div className="flex items-center gap-2 text-slate-500">
                <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">Pitch Reels</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {(() => {
              let filteredPitches = pitches;
              
              // Apply search filter
              if (searchTerm.trim()) {
                filteredPitches = filteredPitches.filter(p => 
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.sector.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }
              
              // Apply other filters
              if (showOnlyValidated) {
                filteredPitches = filteredPitches.filter(p => p.isStartupNationValidated);
              } else if (showOnlyFavorites) {
                filteredPitches = filteredPitches.filter(p => favoritedPitches.has(p.id));
              }
              
              return filteredPitches;
            })().map(inv => {
              const embedUrl = investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
              return (
                <Card key={inv.fundraisingId} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
                  {/* Enhanced Video Section */}
                  <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    {embedUrl ? (
                      playingVideoId === inv.id ? (
                        <div className="relative w-full h-full">
                          <iframe
                            src={embedUrl}
                            title={`Pitch video for ${inv.name}`}
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
                          onClick={() => setPlayingVideoId(inv.id)}
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
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No video available</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Content Section */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">{inv.name}</h3>
                        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {inv.sector}
                        </p>
                      </div>
                                              {inv.isStartupNationValidated && (
                          <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </div>
                        )}
                    </div>
                    
                    {/* Enhanced Investment Info */}
                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 px-4 py-3 mt-4 rounded-lg border border-blue-100 shadow-sm">
                      <div className="text-sm">
                        <span className="font-semibold text-slate-800">Investment Ask:</span>
                        <span className="text-base font-bold text-blue-600 ml-2">${inv.investmentValue.toLocaleString()}</span>
                        <span className="text-slate-600 ml-2">for</span>
                        <span className="font-semibold text-purple-600 ml-1">{inv.equityAllocation}%</span>
                        <span className="text-slate-600 ml-1">equity</span>
                      </div>
                    </div>
                    
                                        {/* Enhanced Action Buttons */}
                    <div className="flex items-center gap-3 mt-6">
                      {/* Enhanced Like Button */}
                      <button
                        onClick={() => handleFavoriteToggle(inv.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm ${
                          favoritedPitches.has(inv.id)
                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-200 hover:shadow-red-300'
                            : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${favoritedPitches.has(inv.id) ? 'fill-current' : ''}`} />
                        {favoritedPitches.has(inv.id) && <span className="text-xs">Liked</span>}
                      </button>
                      
                      {/* Share Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShare(inv)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200"
                      >
                        <Share2 className="h-5 w-5" />
                        Share
                      </Button>
                      
                      {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                        <a href={inv.pitchDeckUrl} target="_blank" rel="noreferrer">
                        <Button
                          size="sm"
                            variant="secondary"
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            <FileText className="h-4 w-4 mr-2"/>View Deck
                        </Button>
                        </a>
                      )}
                  </div>
                </div>
              </Card>
            );
          })}
            {pitches.length === 0 && (
              <Card className="text-center py-16 text-slate-500">No active fundraising startups.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CAView;
