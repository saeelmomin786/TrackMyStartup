import React, { useState, useEffect } from 'react';
import { Startup, FundraisingDetails, InvestmentRecord, UserRole, Founder, ComplianceStatus, InvestmentOffer } from '../types';
import { AuthUser } from '../lib/auth';
import Button from './ui/Button';
import Card from './ui/Card';
import { ArrowLeft, LayoutDashboard, User, ShieldCheck, Banknote, Users, TableProperties, Building2, Menu } from 'lucide-react';
import { investmentService } from '../lib/database';

import StartupDashboardTab from './startup-health/StartupDashboardTab';
import OpportunitiesTab from './startup-health/OpportunitiesTab';
import ProfileTab from './startup-health/ProfileTab';
import ComplianceTab from './startup-health/ComplianceTab';
import FinancialsTab from './startup-health/FinancialsTab';
import EmployeesTab from './startup-health/EmployeesTab';
import CapTableTab from './startup-health/CapTableTab';
import StartupProfilePage from './StartupProfilePage';


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
}

type TabId = 'dashboard' | 'opportunities' | 'profile' | 'compliance' | 'financials' | 'employees' | 'capTable';

const StartupHealthView: React.FC<StartupHealthViewProps> = ({ startup, userRole, user, onBack, onActivateFundraising, onInvestorAdded, onUpdateFounders, isViewOnly = false, investmentOffers = [], onProcessOffer }) => {
    // Check if this is a facilitator accessing the startup
    const isFacilitatorAccess = isViewOnly && userRole === 'Startup Facilitation Center';
    
    // Get the target tab for facilitator access
    const facilitatorTargetTab = (window as any).facilitatorTargetTab;
    
    // Initialize activeTab from localStorage or default to 'dashboard'
    // If facilitator is accessing, use the target tab or default to compliance
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        if (isFacilitatorAccess) {
            if (facilitatorTargetTab === 'full') {
                return 'dashboard'; // Full access - start with dashboard
            } else if (facilitatorTargetTab === 'compliance') {
                return 'compliance'; // Only compliance access
            }
            return 'compliance'; // Default fallback
        }
        
        const savedTab = localStorage.getItem('startupHealthActiveTab') as TabId;
        return savedTab && ['dashboard', 'opportunities', 'profile', 'compliance', 'financials', 'employees', 'capTable'].includes(savedTab) 
            ? savedTab 
            : 'dashboard';
    });
    const [currentStartup, setCurrentStartup] = useState<Startup>(startup);
    const [localOffers, setLocalOffers] = useState<InvestmentOffer[]>(investmentOffers || []);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAccountPage, setShowAccountPage] = useState(false);
    
    // Update currentStartup when startup prop changes (important for facilitator access)
    useEffect(() => {
        console.log('🔄 StartupHealthView: Startup prop changed, updating currentStartup');
        console.log('📊 New startup data:', startup);
        setCurrentStartup(startup);
    }, [startup]);
    
    const offersForStartup = (localOffers || investmentOffers || []).filter((o: any) => {
        return (
            o.startupId === currentStartup.id ||
            (o.startup && o.startup.id === currentStartup.id) ||
            o.startupName === currentStartup.name
        );
    });

    // Keep local offers in sync when props change
    useEffect(() => {
        if (investmentOffers && investmentOffers.length > 0) {
            setLocalOffers(investmentOffers);
        }
    }, [investmentOffers]);

    // Fallback fetch for startup users: if no offers came via props, fetch directly
    useEffect(() => {
        let cancelled = false;
        const shouldFetch = (investmentOffers?.length || 0) === 0 && currentStartup?.id;
        if (shouldFetch) {
            investmentService.getOffersForStartup(currentStartup.id).then(rows => {
                if (!cancelled) setLocalOffers(rows as any);
            }).catch(() => {});
        }
        return () => { cancelled = true; };
    }, [currentStartup?.id]);

    // Save activeTab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('startupHealthActiveTab', activeTab);
    }, [activeTab]);

    const handleProfileUpdate = (updatedStartup: Startup) => {
        setCurrentStartup(updatedStartup);
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
            { id: 'capTable', name: 'Cap Table', icon: <TableProperties className="w-4 h-4" /> },
          ]
        : [
            // Regular startup users see all tabs; offers are now inside dashboard
            { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'opportunities', name: 'Opportunities', icon: <TableProperties className="w-4 h-4" /> },
            { id: 'profile', name: 'Profile', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compliance', name: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'financials', name: 'Financials', icon: <Banknote className="w-4 h-4" /> },
            { id: 'employees', name: 'Employees', icon: <Users className="w-4 h-4" /> },
            { id: 'capTable', name: 'Cap Table', icon: <TableProperties className="w-4 h-4" /> },
          ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <StartupDashboardTab startup={currentStartup} isViewOnly={isViewOnly} offers={offersForStartup} onProcessOffer={onProcessOffer} currentUser={user} />;
            case 'opportunities':
                return <OpportunitiesTab startup={{ id: currentStartup.id, name: currentStartup.name }} />;
            case 'profile':
                return <ProfileTab startup={currentStartup} userRole={userRole} onProfileUpdate={handleProfileUpdate} isViewOnly={isViewOnly} />;
            case 'compliance':
                return <ComplianceTab 
                    startup={currentStartup} 
                    currentUser={user} 
                    onUpdateCompliance={handleUpdateCompliance}
                    isViewOnly={isViewOnly}
                    allowCAEdit={userRole === 'CA' || userRole === 'CS'}
                />;
            case 'financials':
                return <FinancialsTab startup={currentStartup} userRole={userRole} isViewOnly={isViewOnly} />;
            case 'employees':
                return <EmployeesTab startup={currentStartup} userRole={userRole} isViewOnly={isViewOnly} />;
            case 'capTable':
                return <CapTableTab 
                            startup={currentStartup}
                            userRole={userRole}
                            user={user}
                            onActivateFundraising={onActivateFundraising}
                            onInvestorAdded={onInvestorAdded}
                            onUpdateFounders={onUpdateFounders}
                            isViewOnly={isViewOnly}
                        />;
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
                                {isFacilitatorAccess ? `${currentStartup.name} - Facilitator Access` : isViewOnly ? `${currentStartup.name} - CA Review` : currentStartup.name}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                {isFacilitatorAccess 
                                    ? facilitatorTargetTab === 'full' 
                                        ? 'Facilitator view-only access to all tabs (except opportunities)' 
                                        : 'Facilitator view-only access to compliance tab only'
                                    : isViewOnly 
                                        ? 'CA compliance review and monitoring dashboard' 
                                        : 'Comprehensive startup monitoring dashboard'
                                }
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
            <nav className="-mb-px flex space-x-1 sm:space-x-4 px-4 overflow-x-auto" aria-label="Tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)} 
                        className={`${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm transition-colors`}
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
    </div>
  );
};

export default StartupHealthView;