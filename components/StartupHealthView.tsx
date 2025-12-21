import React, { useState, useEffect, useMemo } from 'react';
import { Startup, FundraisingDetails, InvestmentRecord, UserRole, Founder, ComplianceStatus, InvestmentOffer } from '../types';
import { AuthUser } from '../lib/auth';
import Button from './ui/Button';
import Card from './ui/Card';
import { ArrowLeft, LayoutDashboard, User, ShieldCheck, Banknote, Users, TableProperties, Building2, Menu, Bell, Wrench, DollarSign, Briefcase, FileText, Shield, Eye, Search, CheckCircle } from 'lucide-react';
import { investmentService } from '../lib/database';
import { supabase } from '../lib/supabase';

import StartupDashboardTab from './startup-health/StartupDashboardTab';
import NotificationBadge from './startup-health/NotificationBadge';
import NotificationsView from './startup-health/NotificationsView';
import ProfileTab from './startup-health/ProfileTab';
import ComplianceTab from './startup-health/ComplianceTab';
import FinancialsTab from './startup-health/FinancialsTab';
import EmployeesTab from './startup-health/EmployeesTab';
import CapTableTab from './startup-health/CapTableTab';
import FundraisingTab from './startup-health/FundraisingTab';
import StartupProfilePage from './StartupProfilePage';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import ConnectMentorRequestModal from './mentor/ConnectMentorRequestModal';
import StartupRequestsSection from './mentor/StartupRequestsSection';
import ScheduledSessionsSection from './mentor/ScheduledSessionsSection';
import SchedulingModal from './mentor/SchedulingModal';
import { formatDateDDMMYYYY } from '../lib/dateTimeUtils';
import { Video } from 'lucide-react';


interface StartupHealthViewProps {
  startup: Startup;
  userRole?: UserRole;
  user?: AuthUser;
  onBack: () => void;
  onActivateFundraising: (details: FundraisingDetails, startup: Startup) => void;
  onInvestorAdded: (investment: InvestmentRecord, startup: Startup) => void;
  onUpdateFounders: (startupId: number, founders: Founder[]) => void;
  isViewOnly?: boolean; // New prop for view-only mode (for CA viewing)
  investmentOffers?: InvestmentOffer[];
  onProcessOffer?: (offerId: number, status: 'approved' | 'rejected' | 'accepted' | 'completed') => void;
  onTrialButtonClick?: () => void; // Add trial button click handler
}

type TabId = 'dashboard' | 'profile' | 'compliance' | 'financials' | 'employees' | 'capTable' | 'fundraising' | 'services';

const StartupHealthView: React.FC<StartupHealthViewProps> = ({ startup, userRole, user, onBack, onActivateFundraising, onInvestorAdded, onUpdateFounders, isViewOnly = false, investmentOffers = [], onProcessOffer, onTrialButtonClick }) => {
    // Check if this is a facilitator accessing the startup
    const isFacilitatorAccess = isViewOnly && userRole === 'Startup Facilitation Center';
    
    // Get the target tab for facilitator access
    const facilitatorTargetTab = (window as any).facilitatorTargetTab;
    
    // Initialize activeTab - always start with dashboard for regular users
    // If facilitator is accessing, use the target tab or default to compliance
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        if (isFacilitatorAccess) {
            if (facilitatorTargetTab === 'full' || facilitatorTargetTab === 'dashboard') {
                return 'dashboard'; // Full access or dashboard access - start with dashboard
            } else if (facilitatorTargetTab === 'compliance') {
                return 'compliance'; // Only compliance access
            }
            return 'dashboard'; // Default to dashboard for investors/advisors viewing portfolio
        }
        
        // Prefer URL param if provided; otherwise default to dashboard
        const fromUrl = (getQueryParam('tab') as TabId) || 'dashboard';
        return fromUrl;
    });
    const [currentStartup, setCurrentStartup] = useState<Startup>(startup);
    const [localOffers, setLocalOffers] = useState<InvestmentOffer[]>(investmentOffers || []);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAccountPage, setShowAccountPage] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
    const [servicesSubTab, setServicesSubTab] = useState<'explore' | 'requested' | 'my-services'>('explore');
    
    // State for mentor connection
    const [connectModalOpen, setConnectModalOpen] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<any>(null);
    const [startupRequests, setStartupRequests] = useState<any[]>([]);
    const [acceptedMentorRequests, setAcceptedMentorRequests] = useState<any[]>([]);
    
    // State for scheduling
    const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
    const [selectedMentorForScheduling, setSelectedMentorForScheduling] = useState<any>(null);
    
    // Update currentStartup when startup prop changes (important for facilitator access)
    useEffect(() => {
        console.log('🔄 StartupHealthView: Startup prop changed, updating currentStartup');
        console.log('📊 New startup data:', startup);
        setCurrentStartup(startup);
    }, [startup]);
    
    // Update currentStartup when startup prop changes (important for facilitator access)
    useEffect(() => {
        console.log('🔄 StartupHealthView: Startup prop changed, updating currentStartup');
        console.log('📊 New startup data:', startup);
        setCurrentStartup(startup);
    }, [startup]);

    const viewLabels = useMemo(() => {
        const name = currentStartup?.name || startup?.name || 'Startup';

        if (isFacilitatorAccess) {
            return {
                title: `${name} - Facilitator Access`,
                subtitle: facilitatorTargetTab === 'full'
                    ? 'Facilitator view-only access to all tabs (except opportunities)'
                    : 'Facilitator view-only access to compliance tab only',
            };
        }

        if (!isViewOnly) {
            return {
                title: name,
                subtitle: 'Comprehensive startup monitoring dashboard',
            };
        }

        switch (userRole) {
            case 'Investor':
                return {
                    title: `${name} - Investor Review`,
                    subtitle: 'Investor due diligence dashboard',
                };
            case 'Investment Advisor':
                return {
                    title: `${name} - Advisor Review`,
                    subtitle: 'Advisor read-only monitoring dashboard',
                };
            case 'CA':
                return {
                    title: `${name} - CA Review`,
                    subtitle: 'CA compliance review and monitoring dashboard',
                };
            case 'CS':
                return {
                    title: `${name} - CS Review`,
                    subtitle: 'CS compliance review and monitoring dashboard',
                };
            default:
                return {
                    title: `${name} - Read Only`,
                    subtitle: 'Read-only monitoring dashboard',
                };
        }
    }, [currentStartup?.name, startup?.name, isFacilitatorAccess, facilitatorTargetTab, isViewOnly, userRole]);
    
    const offersForStartup = (localOffers || investmentOffers || []).filter((o: any) => {
        const matches = (
            o.startupId === currentStartup.id ||
            (o.startup && o.startup.id === currentStartup.id) ||
            o.startupName === currentStartup.name
        );
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 StartupHealthView - Filtering offer:', {
                offerId: o.id,
                offerStartupId: o.startupId,
                offerStartupName: o.startupName,
                currentStartupId: currentStartup.id,
                currentStartupName: currentStartup.name,
                matches: matches,
                stage: (o as any).stage
            });
        }
        
        return matches;
    });

    // Keep local offers in sync when props change
    useEffect(() => {
        if (investmentOffers && investmentOffers.length > 0) {
            console.log('🔍 StartupHealthView - Investment offers prop changed:', investmentOffers);
            console.log('🔍 StartupHealthView - Offers count:', investmentOffers.length);
            setLocalOffers(investmentOffers);
        }
    }, [investmentOffers]);

    // Load startup requests for mentor connections
    const loadStartupRequests = async () => {
        if (!currentStartup?.id || !user?.id) return;
        
        try {
            const { mentorService } = await import('../lib/mentorService');
            // Get all requests where this startup is involved
            const { data: requests, error } = await supabase
                .from('mentor_requests')
                .select('*')
                .eq('startup_id', currentStartup.id)
                .eq('requester_id', user.id)
                .order('requested_at', { ascending: false });

            if (error) {
                console.error('Error loading startup requests:', error);
                return;
            }

            // Map requests to include startup details
            // Filter out accepted requests (they should appear in "My Services" tab)
            // Since we're filtering by currentStartup.id, all requests will be for this startup
            const mappedRequests = (requests || [])
                .filter((req: any) => req.status !== 'accepted') // Exclude accepted requests
                .map((req: any) => {
                    return {
                        ...req,
                        startup_name: currentStartup?.name || 'Unknown Startup',
                        startup_website: currentStartup?.domain || '',
                        startup_sector: currentStartup?.sector || ''
                    };
                });

            setStartupRequests(mappedRequests);
        } catch (error) {
            console.error('Error loading startup requests:', error);
        }
    };

    // Load accepted mentor requests for "My Services" tab
    const loadAcceptedMentorRequests = async () => {
        if (!currentStartup?.id || !user?.id) return;
        
        try {
            const { data: requests, error } = await supabase
                .from('mentor_requests')
                .select('*')
                .eq('startup_id', currentStartup.id)
                .eq('requester_id', user.id)
                .eq('status', 'accepted')
                .order('responded_at', { ascending: false });

            if (error) {
                console.error('Error loading accepted mentor requests:', error);
                return;
            }

            // Enrich with mentor profile data and assignment ID
            const mappedRequests = await Promise.all((requests || []).map(async (req: any) => {
                let mentorName = 'Unknown Mentor';
                let assignmentId: number | null = null;
                
                try {
                    const { data: mentorProfile } = await supabase
                        .from('mentor_profiles')
                        .select('mentor_name')
                        .eq('user_id', req.mentor_id)
                        .maybeSingle();
                    
                    if (mentorProfile?.mentor_name) {
                        mentorName = mentorProfile.mentor_name;
                    } else {
                        // Try user_profiles
                        const { data: userProfile } = await supabase
                            .from('user_profiles')
                            .select('name')
                            .eq('auth_user_id', req.mentor_id)
                            .maybeSingle();
                        
                        if (userProfile?.name) {
                            mentorName = userProfile.name;
                        }
                    }
                } catch (err) {
                    console.warn('Error fetching mentor name:', err);
                }

                // Get the assignment ID for this mentor-startup pair
                try {
                    const { data: assignment } = await supabase
                        .from('mentor_startup_assignments')
                        .select('id')
                        .eq('mentor_id', req.mentor_id)
                        .eq('startup_id', currentStartup.id)
                        .eq('status', 'active')
                        .maybeSingle();
                    
                    if (assignment) {
                        assignmentId = assignment.id;
                    }
                } catch (err) {
                    console.warn('Error fetching assignment ID:', err);
                }

                return {
                    ...req,
                    mentor_name: mentorName,
                    startup_name: currentStartup?.name || 'Unknown Startup',
                    startup_website: currentStartup?.domain || '',
                    startup_sector: currentStartup?.sector || '',
                    assignment_id: assignmentId
                };
            }));

            setAcceptedMentorRequests(mappedRequests);
        } catch (error) {
            console.error('Error loading accepted mentor requests:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'services' && servicesSubTab === 'requested') {
            loadStartupRequests();
            // Also check if any requests were accepted (mentor accepted)
            checkForAcceptedRequests();
        } else if (activeTab === 'services' && servicesSubTab === 'my-services') {
            loadAcceptedMentorRequests();
        }
    }, [activeTab, servicesSubTab, currentStartup?.id, user?.id]);

    // Check if any requests were accepted by mentor and switch to My Services
    const checkForAcceptedRequests = async () => {
        if (!currentStartup?.id || !user?.id) return;
        
        try {
            const { data: acceptedRequests, error } = await supabase
                .from('mentor_requests')
                .select('id, responded_at')
                .eq('startup_id', currentStartup.id)
                .eq('requester_id', user.id)
                .eq('status', 'accepted')
                .order('responded_at', { ascending: false })
                .limit(1);

            if (!error && acceptedRequests && acceptedRequests.length > 0) {
                // Check if this is a newly accepted request (accepted in last 5 minutes)
                const newestAccepted = acceptedRequests[0];
                if (newestAccepted.responded_at) {
                    const acceptedTime = new Date(newestAccepted.responded_at).getTime();
                    const now = Date.now();
                    const fiveMinutesAgo = now - (5 * 60 * 1000);
                    
                    // If accepted within last 5 minutes, auto-switch to My Services
                    if (acceptedTime > fiveMinutesAgo) {
                        setServicesSubTab('my-services');
                        loadAcceptedMentorRequests();
                        // Show notification
                        alert('Great news! A mentor has accepted your connection request. Check "My Services" to see your active connections.');
                    }
                }
            }
        } catch (err) {
            console.error('Error checking for accepted requests:', err);
        }
    };

    // Fallback fetch for startup users: if no offers came via props, fetch directly
    useEffect(() => {
        let cancelled = false;
        const shouldFetch = (investmentOffers?.length || 0) === 0 && currentStartup?.id;
        
        console.log('🔍 StartupHealthView - Fallback fetch check:', {
            investmentOffersLength: investmentOffers?.length || 0,
            currentStartupId: currentStartup?.id,
            shouldFetch: shouldFetch
        });
        
        if (shouldFetch) {
            console.log('🔍 StartupHealthView - Fetching offers for startup:', currentStartup.id);
            investmentService.getOffersForStartup(currentStartup.id).then(rows => {
                console.log('🔍 StartupHealthView - Fetched offers:', rows);
                if (!cancelled) setLocalOffers(rows as any);
            }).catch((error) => {
                console.error('🔍 StartupHealthView - Error fetching offers:', error);
            });
        }
        return () => { cancelled = true; };
    }, [currentStartup?.id]);

    // Save activeTab to localStorage whenever it changes (only for facilitator access)
    useEffect(() => {
        // Only save tab state for facilitator access, not for regular users
        if (isFacilitatorAccess) {
            localStorage.setItem('startupHealthActiveTab', activeTab);
        }
    }, [activeTab, isFacilitatorAccess]);

    const handleProfileUpdate = (updatedStartup: Startup) => {
        console.log('🔄 StartupHealthView: Profile updated, updating currentStartup and triggering ComplianceTab refresh...', {
            startupId: updatedStartup.id,
            hasProfile: !!updatedStartup.profile,
            subsidiaries: updatedStartup.profile?.subsidiaries?.length || 0
        });
        setCurrentStartup(updatedStartup);
        // Trigger profile update for ComplianceTab
        setProfileUpdateTrigger(prev => prev + 1);
    };

    const handleEsopUpdate = () => {
        console.log('🔄 StartupHealthView: ESOP updated, refreshing startup data...');
        // Force a refresh of the startup data to get updated price per share
        setCurrentStartup(prev => ({ ...prev }));
    };

    const handleUpdateCompliance = (startupId: number, taskId: string, checker: 'ca' | 'cs', newStatus: ComplianceStatus) => {
        // Update the compliance check in the startup
        const updatedComplianceChecks = currentStartup.complianceChecks?.map(check => 
            check.taskId === taskId 
                ? { ...check, [checker === 'ca' ? 'caStatus' : 'csStatus']: newStatus }
                : check
        ) || [];

        setCurrentStartup(prev => ({
            ...prev,
            complianceChecks: updatedComplianceChecks
        }));
    };

    const handleTabChange = (tabId: TabId) => {
        setActiveTab(tabId);
        setQueryParam('tab', tabId, true);
        setIsMobileMenuOpen(false); // Close mobile menu when tab changes
    };

    const tabs = isFacilitatorAccess 
        ? [
            // Facilitator users see limited tabs based on access level
            { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'profile', name: 'Profile', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compliance', name: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'financials', name: 'Financials', icon: <Banknote className="w-4 h-4" /> },
            { id: 'employees', name: 'Employees', icon: <Users className="w-4 h-4" /> },
            { id: 'capTable', name: 'Equity Allocation', icon: <TableProperties className="w-4 h-4" /> },
            { id: 'fundraising', name: 'Fundraising', icon: <Banknote className="w-4 h-4" /> },
            { id: 'services', name: 'Services', icon: <Wrench className="w-4 h-4" /> },
          ]
        : [
            // Regular startup users see all tabs; programs moved under Fundraising → Grant / Incubation Programs
            { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'profile', name: 'Profile', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compliance', name: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'financials', name: 'Financials', icon: <Banknote className="w-4 h-4" /> },
            { id: 'employees', name: 'Employees', icon: <Users className="w-4 h-4" /> },
            { id: 'capTable', name: 'Equity Allocation', icon: <TableProperties className="w-4 h-4" /> },
            { id: 'fundraising', name: 'Fundraising', icon: <Banknote className="w-4 h-4" /> },
            { id: 'services', name: 'Services', icon: <Wrench className="w-4 h-4" /> },
          ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <StartupDashboardTab startup={currentStartup} isViewOnly={isViewOnly} offers={offersForStartup} onProcessOffer={onProcessOffer} currentUser={user} onTrialButtonClick={onTrialButtonClick} />;
            case 'profile':
                return <ProfileTab startup={currentStartup} userRole={userRole} onProfileUpdate={handleProfileUpdate} isViewOnly={isViewOnly} />;
            case 'compliance':
                return <ComplianceTab 
                    startup={currentStartup} 
                    currentUser={user} 
                    onUpdateCompliance={handleUpdateCompliance}
                    isViewOnly={isViewOnly}
                    allowCAEdit={userRole === 'CA' || userRole === 'CS'}
                    onProfileUpdated={profileUpdateTrigger}
                />;
            case 'financials':
                return <FinancialsTab startup={currentStartup} userRole={userRole} isViewOnly={isViewOnly} />;
            case 'employees':
                return <EmployeesTab startup={currentStartup} userRole={userRole} isViewOnly={isViewOnly} onEsopUpdated={handleEsopUpdate} />;
            case 'capTable':
                return (
                  <CapTableTab 
                    startup={currentStartup}
                    userRole={userRole}
                    user={user}
                    onActivateFundraising={onActivateFundraising}
                    onInvestorAdded={onInvestorAdded}
                    onUpdateFounders={onUpdateFounders}
                    isViewOnly={isViewOnly}
                  />
                );
            case 'fundraising':
                return (
                  <FundraisingTab
                    startup={currentStartup}
                    userRole={userRole}
                    user={user}
                    isViewOnly={isViewOnly}
                    onActivateFundraising={onActivateFundraising}
                  />
                );
            case 'services':
                return (
                  <div className="space-y-6 animate-fade-in">
                    <Card className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                            Services
                          </h2>
                          <p className="text-sm text-slate-600 mt-1">
                            Discover and manage services for your startup – mentors, advisors, CA/CS, and incubation support.
                          </p>
                        </div>
                      </div>

                      {/* Services sub-tabs */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'explore' ? 'primary' : 'outline'}
                          onClick={() => setServicesSubTab('explore')}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Explore
                        </Button>
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'requested' ? 'primary' : 'outline'}
                          onClick={() => setServicesSubTab('requested')}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Requested
                        </Button>
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'my-services' ? 'primary' : 'outline'}
                          onClick={() => setServicesSubTab('my-services')}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          My Services
                        </Button>
                      </div>

                      {servicesSubTab === 'explore' && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
                              Explore Service Providers
                            </h3>
                            <p className="text-sm text-slate-600">
                              Browse different types of collaborators and open their profiles in a new tab to connect.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[
                              { role: 'Investment Advisor', icon: Briefcase, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', description: 'Connect with investment advisors' },
                              { role: 'Mentor', icon: Users, color: 'bg-green-100 text-green-700 hover:bg-green-200', description: 'Connect with mentors' },
                              { role: 'CA', icon: FileText, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200', description: 'Connect with Chartered Accountants' },
                              { role: 'CS', icon: Shield, color: 'bg-pink-100 text-pink-700 hover:bg-pink-200', description: 'Connect with Company Secretaries' },
                              { role: 'Incubation', icon: Building2, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', description: 'Connect with incubation centers' },
                            ]
                            .filter((profileType) => {
                              // Hide Investment Advisor if startup already has an investment advisor
                              if (profileType.role === 'Investment Advisor' && currentStartup?.investment_advisor_code) {
                                return false;
                              }
                              return true;
                            })
                            .map((profileType) => {
                              const IconComponent = profileType.icon;
                              return (
                                <Card
                                  key={profileType.role}
                                  className="p-5 hover:shadow-lg transition-all duration-200 border border-slate-200 text-center"
                                >
                                  <div className="flex flex-col items-center">
                                    <div className={`w-14 h-14 rounded-full ${profileType.color} flex items-center justify-center mb-3 transition-colors`}>
                                      <IconComponent className="h-7 w-7" />
                                    </div>
                                    <h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
                                      {profileType.role}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-slate-600 mb-3">
                                      {profileType.description}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const baseUrl = window.location.origin + window.location.pathname;
                                        const url = new URL(baseUrl);
                                        url.search = '';

                                        if (profileType.role === 'Investor') {
                                          url.searchParams.set('view', 'explore');
                                          url.searchParams.set('role', 'Investor');
                                        } else if (profileType.role === 'Investment Advisor') {
                                          url.searchParams.set('view', 'advisor');
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
                      )}

                      {servicesSubTab === 'requested' && (
                        <StartupRequestsSection
                          requests={startupRequests}
                          onRequestAction={() => {
                            loadStartupRequests();
                            // Check if any requests were accepted by mentor
                            checkForAcceptedRequests();
                          }}
                          onRequestAccepted={() => {
                            // Switch to My Services tab when startup accepts negotiation
                            setServicesSubTab('my-services');
                            loadAcceptedMentorRequests();
                          }}
                        />
                      )}

                      {servicesSubTab === 'my-services' && (
                        <div className="space-y-4">
                          {/* Accepted Mentor Connections */}
                          {acceptedMentorRequests.length > 0 && (
                            <Card>
                              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Accepted Mentor Connections
                              </h3>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mentor</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Accepted Date</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {acceptedMentorRequests.map((request) => (
                                      <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                          <div className="font-medium text-slate-900">{request.mentor_name || 'Unknown Mentor'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                          {request.responded_at ? formatDateDDMMYYYY(request.responded_at) : 'N/A'}
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 border-green-300 hover:bg-green-50"
                                            onClick={() => {
                                              setSelectedMentorForScheduling(request);
                                              setSchedulingModalOpen(true);
                                            }}
                                          >
                                            <Video className="mr-1 h-3 w-3" /> Schedule
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>
                          )}
                          
                          <ScheduledSessionsSection
                            startupId={currentStartup.id}
                            userType="Startup"
                          />
                          
                          {acceptedMentorRequests.length === 0 && (
                            <div className="text-center py-4 text-slate-600">
                              <p className="text-sm">
                                Accepted services and ongoing relationships will appear here.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                );
            default:
                return null;
        }
    };
    
  // If account page is shown, render the account page instead of the main dashboard
  if (showAccountPage) {
    return (
      <StartupProfilePage 
        currentUser={user} 
        startup={currentStartup} 
        onBack={() => setShowAccountPage(false)} 
        onProfileUpdate={(updatedUser) => {
          // Handle profile updates if needed
          console.log('Profile updated:', updatedUser);
        }}
      />
    );
  }

  // If notifications are shown, render the notifications view instead of the main dashboard
  if (showNotifications) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b">
          <div className="w-full px-3 sm:px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-start sm:justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
              <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                    {currentStartup.name} - Notifications
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Stay updated with your program applications and messages
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Card className="!p-0 sm:!p-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <NotificationsView 
              startupId={currentStartup.id} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b">
            <div className="w-full px-3 sm:px-4 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-start sm:justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
                    <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                        <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                                {viewLabels.title}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                {viewLabels.subtitle}
                            </p>
                            {isFacilitatorAccess && (
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        facilitatorTargetTab === 'full' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        🔒 Facilitator {facilitatorTargetTab === 'full' ? 'Full Access' : 'Compliance Access Only'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                        {/* Notification Button - Only show for startup users */}
                        {userRole === 'Startup' && !isViewOnly && (
                            <div className="relative inline-block">
                                <Button 
                                    onClick={() => setShowNotifications(true)} 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full sm:w-auto pr-10"
                                >
                                    <Bell className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Notifications</span>
                                    <span className="sm:hidden">Notifications</span>
                                </Button>
                                <NotificationBadge startupId={currentStartup.id} badgeOnly className="absolute -top-2 -right-2" />
                            </div>
                        )}
                        {/* Account Button - Only show for startup users */}
                        {userRole === 'Startup' && !isViewOnly && (
                            <Button 
                                onClick={() => setShowAccountPage(true)} 
                                variant="outline" 
                                size="sm" 
                                className="w-full sm:w-auto"
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Account</span>
                                <span className="sm:hidden">Account</span>
                            </Button>
                        )}
                        {userRole !== 'Startup' && onBack && (
                            <Button onClick={onBack} variant="secondary" size="sm" className="w-full sm:w-auto">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Back to Portfolio</span>
                                <span className="sm:hidden">Back</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

      <Card className="!p-0 sm:!p-0">
        {/* Mobile Menu Button */}
        <div className="sm:hidden border-b border-slate-200 p-3">
          <Button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            size="sm"
          >
            <Menu className="h-4 w-4" />
            {tabs.find(tab => tab.id === activeTab)?.name || 'Dashboard'}
          </Button>
        </div>

        {/* Mobile Tab Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white border-b border-slate-200 p-3 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>
        )}

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:block border-b border-slate-200">
            <nav className="-mb-px flex justify-center space-x-2 sm:space-x-4 px-2 sm:px-4 overflow-x-auto" aria-label="Tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)} 
                        className={`${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center whitespace-nowrap py-3 px-2 sm:px-3 border-b-2 font-medium text-base transition-colors`}
                    >
                       {tab.icon}
                       <span className="ml-2">{tab.name}</span>
                    </button>
                ))}
            </nav>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
            {renderTabContent()}
        </div>
      </Card>

      {/* Connect Mentor Request Modal */}
      {connectModalOpen && selectedMentor && (
        <ConnectMentorRequestModal
          isOpen={connectModalOpen}
          onClose={() => {
            setConnectModalOpen(false);
            setSelectedMentor(null);
          }}
          mentorId={selectedMentor.id}
          mentorName={selectedMentor.name}
          mentorFeeType={selectedMentor.fee_type}
          mentorFeeAmount={selectedMentor.fee_amount}
          mentorFeeAmountMin={selectedMentor.fee_amount_min || selectedMentor.fee_amount}
          mentorFeeAmountMax={selectedMentor.fee_amount_max || selectedMentor.fee_amount}
          mentorEquityPercentage={selectedMentor.equity_percentage}
          mentorCurrency={selectedMentor.fee_currency || 'USD'}
          startupId={currentStartup.id}
          requesterId={user?.id!}
          onRequestSent={() => {
            loadStartupRequests();
            setServicesSubTab('requested'); // Switch to "Requested" tab
            setConnectModalOpen(false);
            setSelectedMentor(null);
          }}
        />
      )}

      {/* Scheduling Modal */}
      {schedulingModalOpen && selectedMentorForScheduling && currentStartup?.id && (
        <SchedulingModal
          isOpen={schedulingModalOpen}
          onClose={() => {
            setSchedulingModalOpen(false);
            setSelectedMentorForScheduling(null);
          }}
          mentorId={selectedMentorForScheduling.mentor_id}
          startupId={currentStartup.id}
          assignmentId={selectedMentorForScheduling.assignment_id}
          onSessionBooked={async () => {
            // Reload accepted requests to refresh data
            await loadAcceptedMentorRequests();
          }}
        />
      )}
    </div>
  );
};

export default StartupHealthView;