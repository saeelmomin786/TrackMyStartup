import React, { useState, useMemo, useEffect } from 'react';
import { User, Startup, VerificationRequest, InvestmentOffer, ComplianceStatus, UserRole } from '../types';
import { ValidationRequest } from '../lib/validationService';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Users, Building2, HelpCircle, FileCheck2, LayoutGrid, Eye, Check, X, UserCheck, NotebookPen, BookUser, FileStack, Database, Shield, Settings, TrendingUp, AlertTriangle, BarChart3, UserPlus, Building, CreditCard, MessageSquare, Calendar, Globe, Target, Zap, Megaphone, FileText, DollarSign, Coins } from 'lucide-react';
import AdminProgramsTab from './admin/AdminProgramsTab';
import AdminBlogsTab from './admin/AdminBlogsTab';
import InvestorListManager from './admin/InvestorListManager';
import AdminQuestionBankTab from './admin/AdminQuestionBankTab';
import UserGrowthChart from './admin/UserGrowthChart';
import UserRoleDistributionChart from './admin/UserRoleDistributionChart';
import DataManager from './DataManager';
import { complianceRulesComprehensiveService } from '../lib/complianceRulesComprehensiveService';
import { complianceManagementService, AuditorType, GovernanceType, CompanyType, ComplianceRule } from '../lib/complianceManagementService';
import ComplianceRulesComprehensiveManager from './ComplianceRulesComprehensiveManager';
import InvestorView from './InvestorView';
import InvestmentAdvisorView from './InvestmentAdvisorView';
import GeneralDataManager from './admin/GeneralDataManager';
import FinancialTab from './admin/FinancialTab';
import MentorPaymentsTab from './admin/MentorPaymentsTab';
import CreditPricingTab from './admin/CreditPricingTab';
import { supabase } from '../lib/supabase';
import { investmentService } from '../lib/database';
import { AuthUser } from '../lib/auth';


interface AdminViewProps {
  users: User[];
  startups: Startup[];
  verificationRequests: VerificationRequest[];
  investmentOffers: InvestmentOffer[];
  validationRequests: ValidationRequest[];
  onProcessVerification: (requestId: number, status: 'approved' | 'rejected') => void;
  onProcessOffer: (offerId: number, status: 'approved' | 'rejected') => void;
  onProcessValidationRequest: (requestId: number, status: 'approved' | 'rejected', notes?: string) => void;
  onViewStartup: (id: number) => void;
}

type AdminTab = 'dashboard' | 'userManagement' | 'startupManagement' | 'investmentFlow' | 'compliance' | 'analytics' | 'system' | 'programs' | 'blogs' | 'investorList' | 'questionBank' | 'financial' | 'mentorPayments' | 'creditPricing';
type TimeFilter = '30d' | '90d' | 'all';

const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex-1">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
            <div className="p-3 bg-brand-light rounded-full">
                {icon}
            </div>
        </div>
    </Card>
);

const formatCurrency = (value: number, currency: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, notation: 'compact' }).format(value);

const AdminView: React.FC<AdminViewProps> = ({ users, startups, verificationRequests, investmentOffers, validationRequests, onProcessVerification, onProcessOffer, onProcessValidationRequest, onViewStartup }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    
    // State for viewing investor and investment advisor dashboards
    const [viewingInvestorDashboard, setViewingInvestorDashboard] = useState(false);
    const [viewingInvestmentAdvisorDashboard, setViewingInvestmentAdvisorDashboard] = useState(false);
    const [selectedInvestor, setSelectedInvestor] = useState<User | null>(null);
    const [selectedInvestmentAdvisor, setSelectedInvestmentAdvisor] = useState<AuthUser | null>(null);
    const [investorDashboardData, setInvestorDashboardData] = useState<{
        investorStartups: Startup[];
        investorInvestments: any[];
        investorStartupAdditionRequests: any[];
        investorFavorites: number[];
        dueDiligenceRequests: any[];
    }>({
        investorStartups: [],
        investorInvestments: [],
        investorStartupAdditionRequests: [],
        investorFavorites: [],
        dueDiligenceRequests: []
    });
    const [investorOffers, setInvestorOffers] = useState<InvestmentOffer[]>([]);
    const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

    const investorCount = useMemo(() => users.filter(u => u.role === 'Investor').length, [users]);
    const startupCount = useMemo(() => users.filter(u => u.role === 'Startup').length, [users]);
    const caCount = useMemo(() => users.filter(u => u.role === 'CA').length, [users]);
    const csCount = useMemo(() => users.filter(u => u.role === 'CS').length, [users]);
    const facilitationCenterCount = useMemo(() => users.filter(u => u.role === 'Startup Facilitation Center').length, [users]);
    const investmentAdvisorCount = useMemo(() => users.filter(u => u.role === 'Investment Advisor').length, [users]);
    const totalOffers = investmentOffers.length;
    const pendingValidations = validationRequests.filter(v => v.status === 'pending').length;
    const pendingVerifications = verificationRequests.length;
    const pendingOffers = investmentOffers.filter(o => o.status === 'pending').length;
    
    const filteredUsers = useMemo(() => {
        if (timeFilter === 'all') {
            return users;
        }
        const now = new Date();
        const daysToSubtract = timeFilter === '30d' ? 30 : 90;
        const cutoffDate = new Date(new Date().setDate(now.getDate() - daysToSubtract));
        return users.filter(u => new Date(u.registrationDate) >= cutoffDate);
    }, [users, timeFilter]);

    // Handler for viewing investor dashboard
    const handleViewInvestorDashboard = async (investor: User) => {
        setIsLoadingDashboard(true);
        try {
            // Load investor's offers
            const investorOffersData = await investmentService.getUserInvestmentOffers(investor.email);
            setInvestorOffers(investorOffersData);

            // Fetch all startup addition requests
            let allStartupAdditionRequests: any[] = [];
            try {
                const { data: requestsData, error: requestsError } = await supabase
                    .from('startup_addition_requests')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (!requestsError && requestsData) {
                    allStartupAdditionRequests = requestsData;
                }
            } catch (error) {
                console.error('Error fetching startup addition requests:', error);
            }

            // Get investor code
            const investorCode = (investor as any).investor_code || (investor as any).investorCode;

            // Filter investor's startups
            const investorStartupIds = new Set<number>();
            
            if (investorCode) {
                // Get startups from investment records
                const { data: investorInvestments } = await supabase
                    .from('investment_records')
                    .select('startup_id')
                    .eq('investor_code', investorCode);
                
                if (investorInvestments) {
                    investorInvestments.forEach((inv: any) => {
                        if (inv.startup_id) investorStartupIds.add(inv.startup_id);
                    });
                }
            }

            // Get startups from offers
            if (investorOffersData.length > 0) {
                investorOffersData.forEach(offer => {
                    if (offer.startup_id) investorStartupIds.add(offer.startup_id);
                });
            }

            // Augment with approved startup addition requests
            let investorStartupsList = startups.filter(s => investorStartupIds.has(s.id));
            
            if (investorCode && Array.isArray(allStartupAdditionRequests)) {
                const approvedNames = allStartupAdditionRequests
                    .filter((r: any) => (r.status || 'pending') === 'approved' && (
                        !investorCode || !r?.investor_code || (r.investor_code === investorCode || r.investorCode === investorCode)
                    ))
                    .map((r: any) => r.name)
                    .filter((n: any) => !!n);
                
                if (approvedNames.length > 0) {
                    const { data: approvedStartupsData } = await supabase
                        .from('startups')
                        .select('*')
                        .in('name', approvedNames);
                    
                    if (approvedStartupsData) {
                        const mappedApprovedStartups = approvedStartupsData.map((startup: any) => ({
                            id: startup.id,
                            name: startup.name,
                            investmentType: startup.investment_type || 'Unknown',
                            investmentValue: Number(startup.investment_value) || 0,
                            equityAllocation: Number(startup.equity_allocation) || 0,
                            currentValuation: Number(startup.current_valuation) || 0,
                            complianceStatus: startup.compliance_status || 'Pending',
                            sector: startup.sector || 'Unknown',
                            totalFunding: Number(startup.total_funding) || 0,
                            totalRevenue: Number(startup.total_revenue) || 0,
                            registrationDate: startup.registration_date || '',
                            founders: startup.founders || [],
                            user_id: startup.user_id
                        }));
                        
                        const byName: Record<string, any> = {};
                        investorStartupsList.forEach((s: any) => {
                            if (s && s.name) byName[s.name] = s;
                        });
                        mappedApprovedStartups.forEach((s: any) => {
                            if (s && s.name) byName[s.name] = s;
                        });
                        investorStartupsList = Object.values(byName) as Startup[];
                    }
                }
            }

            // Fetch investor's favorites
            let investorFavoritesList: number[] = [];
            try {
                const { data: favoritesData, error: favoritesError } = await supabase
                    .from('investor_favorites')
                    .select('startup_id')
                    .eq('investor_id', investor.id);
                
                if (!favoritesError && favoritesData) {
                    investorFavoritesList = favoritesData.map((fav: any) => fav.startup_id);
                }
            } catch (error) {
                console.error('Error fetching investor favorites:', error);
            }

            // Fetch investor's due diligence requests
            let dueDiligenceRequestsList: any[] = [];
            try {
                const { data: ddData, error: ddError } = await supabase
                    .from('due_diligence_requests')
                    .select('*')
                    .eq('user_id', investor.id)
                    .order('created_at', { ascending: false });
                
                if (!ddError && ddData) {
                    dueDiligenceRequestsList = ddData;
                }
            } catch (error) {
                console.error('Error fetching due diligence requests:', error);
            }

            // Format investor for InvestorView
            const formattedInvestor = {
                id: investor.id,
                email: investor.email,
                name: investor.name,
                investorCode: investorCode || null,
                investor_code: investorCode || null,
                investment_advisor_code_entered: (investor as any).investment_advisor_code_entered || null,
                role: 'Investor' as const
            };

            setSelectedInvestor(formattedInvestor as any);
            setInvestorDashboardData({
                investorStartups: investorStartupsList,
                investorInvestments: [],
                investorStartupAdditionRequests: allStartupAdditionRequests,
                investorFavorites: investorFavoritesList,
                dueDiligenceRequests: dueDiligenceRequestsList
            });
            setViewingInvestorDashboard(true);
        } catch (error) {
            console.error('Error loading investor dashboard:', error);
            const formattedInvestor = {
                id: investor.id,
                email: investor.email,
                name: investor.name,
                investorCode: (investor as any).investor_code || (investor as any).investorCode || null,
                investor_code: (investor as any).investor_code || (investor as any).investorCode || null,
                investment_advisor_code_entered: (investor as any).investment_advisor_code_entered || null,
                role: 'Investor' as const
            };
            setSelectedInvestor(formattedInvestor as any);
            setInvestorDashboardData({
                investorStartups: [],
                investorInvestments: [],
                investorStartupAdditionRequests: [],
                investorFavorites: [],
                dueDiligenceRequests: []
            });
            setViewingInvestorDashboard(true);
        } finally {
            setIsLoadingDashboard(false);
        }
    };

    // Handler for viewing investment advisor dashboard
    const handleViewInvestmentAdvisorDashboard = async (advisor: User) => {
        setIsLoadingDashboard(true);
        try {
            // Fetch investment advisor's favorites
            let advisorFavoritesList: number[] = [];
            try {
                const { data: favoritesData, error: favoritesError } = await supabase
                    .from('investor_favorites')
                    .select('startup_id')
                    .eq('investor_id', advisor.id);
                
                if (!favoritesError && favoritesData) {
                    advisorFavoritesList = favoritesData.map((fav: any) => fav.startup_id);
                    console.log('📊 Admin: Loaded investment advisor favorites:', advisorFavoritesList.length);
                }
            } catch (error) {
                console.error('Error fetching investment advisor favorites:', error);
            }

            // Fetch investment advisor's due diligence requests
            let dueDiligenceRequestsList: any[] = [];
            try {
                const { data: ddData, error: ddError } = await supabase
                    .from('due_diligence_requests')
                    .select('*')
                    .eq('user_id', advisor.id)
                    .order('created_at', { ascending: false });
                
                if (!ddError && ddData) {
                    dueDiligenceRequestsList = ddData;
                    console.log('📊 Admin: Loaded investment advisor due diligence requests:', dueDiligenceRequestsList.length);
                }
            } catch (error) {
                console.error('Error fetching investment advisor due diligence requests:', error);
            }

            // Format advisor as AuthUser for InvestmentAdvisorView
            const formattedAdvisor: AuthUser = {
                id: advisor.id,
                email: advisor.email,
                name: advisor.name,
                role: advisor.role as any,
                investment_advisor_code: (advisor as any).investment_advisor_code || (advisor as any).investmentAdvisorCode || null
            };
            setSelectedInvestmentAdvisor(formattedAdvisor as any);
            setViewingInvestmentAdvisorDashboard(true);
        } catch (error) {
            console.error('Error loading investment advisor dashboard:', error);
            // Still show the dashboard even if data loading fails
            const formattedAdvisor: AuthUser = {
                id: advisor.id,
                email: advisor.email,
                name: advisor.name,
                role: advisor.role as any,
                investment_advisor_code: (advisor as any).investment_advisor_code || (advisor as any).investmentAdvisorCode || null
            };
            setSelectedInvestmentAdvisor(formattedAdvisor as any);
            setViewingInvestmentAdvisorDashboard(true);
        } finally {
            setIsLoadingDashboard(false);
        }
    };

    // Close handlers
    const handleCloseInvestorDashboard = () => {
        setViewingInvestorDashboard(false);
        setSelectedInvestor(null);
        setInvestorDashboardData({
            investorStartups: [],
            investorInvestments: [],
            investorStartupAdditionRequests: [],
            investorFavorites: [],
            dueDiligenceRequests: []
        });
        setInvestorOffers([]);
    };

    const handleCloseInvestmentAdvisorDashboard = () => {
        setViewingInvestmentAdvisorDashboard(false);
        setSelectedInvestmentAdvisor(null);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab startups={startups} users={filteredUsers} onViewStartup={onViewStartup} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
            case 'userManagement': return <UserManagementTab users={users} onViewInvestor={handleViewInvestorDashboard} onViewInvestmentAdvisor={handleViewInvestmentAdvisorDashboard} />;
            case 'startupManagement': return <StartupManagementTab startups={startups} verificationRequests={verificationRequests} validationRequests={validationRequests} onProcessVerification={onProcessVerification} onProcessValidationRequest={onProcessValidationRequest} onViewStartup={onViewStartup} />;
            case 'investmentFlow': return <InvestmentFlowTab offers={investmentOffers} onProcessOffer={onProcessOffer} />;
            case 'compliance': return <ComplianceTab />;
            case 'analytics': return <AnalyticsTab users={filteredUsers} startups={startups} offers={investmentOffers} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
            case 'system': return <SystemTab />;
            case 'programs': return <AdminProgramsTab />;
            case 'blogs': return <AdminBlogsTab />;
            case 'investorList': return <InvestorListManager />;
            case 'questionBank': return <AdminQuestionBankTab />;
            case 'financial': return <FinancialTab />;
            case 'mentorPayments': return <MentorPaymentsTab />;
            case 'creditPricing': return <CreditPricingTab />;
            default: return null;
        }
    }
    
    return (
        <div className="space-y-6">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SummaryCard title="Total Users" value={users.length} icon={<Users className="h-6 w-6 text-brand-primary" />} />
                <SummaryCard title="Total Startups" value={startupCount} icon={<Building2 className="h-6 w-6 text-brand-primary" />} />
                <SummaryCard title="Total Investors" value={investorCount} icon={<UserCheck className="h-6 w-6 text-brand-primary" />} />
                <SummaryCard title="Investment Advisors" value={investmentAdvisorCount} icon={<TrendingUp className="h-6 w-6 text-brand-primary" />} />
            </div>

            {/* Service Providers & Centers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SummaryCard title="CAs (Auditors)" value={caCount} icon={<NotebookPen className="h-6 w-6 text-brand-primary" />} />
                <SummaryCard title="CSs (Governance)" value={csCount} icon={<BookUser className="h-6 w-6 text-brand-primary" />} />
                <SummaryCard title="Facilitation Centers" value={facilitationCenterCount} icon={<Building className="h-6 w-6 text-brand-primary" />} />
                <SummaryCard title="Total Startups (Entities)" value={startups.length} icon={<FileStack className="h-6 w-6 text-brand-primary" />} />
            </div>

            {/* Pending Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SummaryCard title="Pending Verifications" value={pendingVerifications} icon={<HelpCircle className="h-6 w-6 text-yellow-600" />} />
                <SummaryCard title="Pending Offers" value={pendingOffers} icon={<FileCheck2 className="h-6 w-6 text-yellow-600" />} />
                <SummaryCard title="Pending Validations" value={pendingValidations} icon={<Shield className="h-6 w-6 text-yellow-600" />} />
                <SummaryCard title="Total Offers" value={totalOffers} icon={<Target className="h-6 w-6 text-brand-primary" />} />
            </div>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex flex-wrap space-x-6" aria-label="Tabs">
                    <TabButton id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} icon={<LayoutGrid />}>Dashboard</TabButton>
                    <TabButton id="userManagement" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Users />}>User Management</TabButton>
                    <TabButton id="startupManagement" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Building2 />}>Startup Management</TabButton>
                    <TabButton id="investmentFlow" activeTab={activeTab} setActiveTab={setActiveTab} icon={<TrendingUp />}>Investment Flow</TabButton>
                    <TabButton id="compliance" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Shield />}>Compliance</TabButton>
                    <TabButton id="analytics" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BarChart3 />}>Analytics</TabButton>
                    <TabButton id="financial" activeTab={activeTab} setActiveTab={setActiveTab} icon={<DollarSign />}>Financial</TabButton>
                    <TabButton id="mentorPayments" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CreditCard />}>Mentor Payments</TabButton>
                    <TabButton id="creditPricing" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Coins />}>Credit Pricing</TabButton>
                    <TabButton id="system" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Settings />}>System</TabButton>
                    <TabButton id="programs" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Megaphone />}>Programs</TabButton>
                    <TabButton id="blogs" activeTab={activeTab} setActiveTab={setActiveTab} icon={<FileText />}>Blogs</TabButton>
                    <TabButton id="investorList" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Building2 />}>Investor List</TabButton>
                    <TabButton id="questionBank" activeTab={activeTab} setActiveTab={setActiveTab} icon={<FileText />}>Question Bank</TabButton>
                </nav>
            </div>

            <div className="animate-fade-in">
                {renderTabContent()}
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-in-out forwards;
                }
            `}</style>

            {/* Investor Dashboard Modal */}
            {viewingInvestorDashboard && selectedInvestor && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Investor Dashboard - {selectedInvestor.name || 'Investor'}
                            </h3>
                            <button
                                onClick={handleCloseInvestorDashboard}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="max-h-[80vh] overflow-y-auto">
                            {isLoadingDashboard ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                                </div>
                            ) : (
                                <InvestorView
                                    startups={investorDashboardData.investorStartups}
                                    newInvestments={investorDashboardData.investorInvestments}
                                    startupAdditionRequests={investorDashboardData.investorStartupAdditionRequests}
                                    investmentOffers={investorOffers}
                                    currentUser={selectedInvestor as any}
                                    onViewStartup={() => {}}
                                    onAcceptRequest={() => {}}
                                    onMakeOffer={() => {}}
                                    onUpdateOffer={() => {}}
                                    onCancelOffer={() => {}}
                                    isViewOnly={true}
                                    initialTab="dashboard"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Investment Advisor Dashboard Modal */}
            {viewingInvestmentAdvisorDashboard && selectedInvestmentAdvisor && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Investment Advisor Dashboard - {selectedInvestmentAdvisor.name || 'Investment Advisor'}
                            </h3>
                            <button
                                onClick={handleCloseInvestmentAdvisorDashboard}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="max-h-[80vh] overflow-y-auto">
                            <InvestmentAdvisorView
                                currentUser={selectedInvestmentAdvisor as AuthUser}
                                users={users}
                                startups={startups}
                                investments={[]}
                                offers={investmentOffers}
                                interests={[]}
                                onViewStartup={() => {}}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

const TabButton: React.FC<{id: AdminTab, activeTab: AdminTab, setActiveTab: (id: AdminTab) => void, icon: React.ReactElement, children: React.ReactNode}> = ({ id, activeTab, setActiveTab, icon, children }) => {
    const iconProps = { className: 'h-5 w-5' };
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`${
                activeTab === id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
        >
            {React.cloneElement(icon, iconProps)}
            {children}
        </button>
    );
};


const TimeFilterButton: React.FC<{
    filter: TimeFilter,
    currentFilter: TimeFilter,
    setTimeFilter: (filter: TimeFilter) => void,
    children: React.ReactNode
}> = ({ filter, currentFilter, setTimeFilter, children }) => (
    <button
        type="button"
        onClick={() => setTimeFilter(filter)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            currentFilter === filter
                ? 'bg-brand-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
        {children}
    </button>
);

const DashboardTab: React.FC<{ 
    startups: Startup[], 
    users: User[],
    onViewStartup: (id: number) => void,
    timeFilter: TimeFilter,
    setTimeFilter: (filter: TimeFilter) => void 
}> = ({ startups, users, onViewStartup, timeFilter, setTimeFilter }) => (
    <div className="space-y-8">
        <Card>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                 <h3 className="text-lg font-semibold text-slate-700">Platform Analytics</h3>
                 <div className="flex items-center gap-2">
                    <TimeFilterButton filter="30d" currentFilter={timeFilter} setTimeFilter={setTimeFilter}>30 Days</TimeFilterButton>
                    <TimeFilterButton filter="90d" currentFilter={timeFilter} setTimeFilter={setTimeFilter}>90 Days</TimeFilterButton>
                    <TimeFilterButton filter="all" currentFilter={timeFilter} setTimeFilter={setTimeFilter}>All Time</TimeFilterButton>
                 </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <UserGrowthChart users={users} />
                <UserRoleDistributionChart users={users} />
            </div>
        </Card>
        
        <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">All Startups</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valuation</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {startups.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{s.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.sector}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatCurrency(s.currentValuation, s.currency || 'USD')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><Badge status={s.complianceStatus} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button size="sm" variant="outline" onClick={() => onViewStartup(s.id)}><Eye className="mr-2 h-4 w-4" /> View Details</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    </div>
);


const UserManagementTab: React.FC<{ 
    users: User[];
    onViewInvestor?: (investor: User) => void;
    onViewInvestmentAdvisor?: (advisor: User) => void;
}> = ({ users, onViewInvestor, onViewInvestmentAdvisor }) => {
    const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user => {
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const roleCounts = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {} as Record<UserRole, number>);

    const handleViewUser = (user: User) => {
        if (user.role === 'Investor' && onViewInvestor) {
            onViewInvestor(user);
        } else if (user.role === 'Investment Advisor' && onViewInvestmentAdvisor) {
            onViewInvestmentAdvisor(user);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters and Search */}
            <Card>
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'All')}
                                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All Roles ({users.length})</option>
                                {Object.entries(roleCounts).map(([role, count]) => (
                                    <option key={role} value={role}>{role} ({count})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Search Users</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or email..."
                                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            />
                        </div>
                    </div>
                    <div className="text-sm text-slate-600">
                        Showing {filteredUsers.length} of {users.length} users
                    </div>
                </div>
            </Card>

            {/* Users Table */}
    <Card>
        <h3 className="text-lg font-semibold mb-4 text-slate-700">User Management</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registration Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                            {filteredUsers.map(u => (
                        <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{u.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            u.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                                            u.role === 'Investor' ? 'bg-green-100 text-green-800' :
                                            u.role === 'Startup' ? 'bg-blue-100 text-blue-800' :
                                            u.role === 'Investment Advisor' ? 'bg-orange-100 text-orange-800' :
                                            u.role === 'Startup Facilitation Center' ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {u.serviceCode || u.investorCode || u.caCode || '-'}
                                    </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.registrationDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {(u.role === 'Investor' || u.role === 'Investment Advisor') ? (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleViewUser(u)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View Dashboard
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" disabled>
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        )}
                                    </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
        </div>
);
};

const VerificationsTab: React.FC<{ requests: VerificationRequest[], onProcessVerification: AdminViewProps['onProcessVerification'] }> = ({ requests, onProcessVerification }) => (
     <Card>
        <h3 className="text-lg font-semibold mb-4 text-slate-700">"Startup Nation" Verification Requests</h3>
        <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Request Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {requests.length > 0 ? requests.map(req => (
                        <tr key={req.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.startupName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{req.requestDate}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => onProcessVerification(req.id, 'rejected')}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onProcessVerification(req.id, 'approved')}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={3} className="text-center py-10 text-slate-500">No pending verification requests.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

const OffersTab: React.FC<{ offers: InvestmentOffer[], onProcessOffer: AdminViewProps['onProcessOffer'] }> = ({ offers, onProcessOffer }) => (
    <Card>
        <h3 className="text-lg font-semibold mb-4 text-slate-700">Investment Offer Approvals</h3>
        <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Offer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {offers.length > 0 ? offers.map(o => (
                        <tr key={o.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{o.investorEmail}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{o.startupName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatCurrency(o.offerAmount, o.currency || 'USD')} for {o.equityPercentage}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    o.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {o.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                {o.status === 'pending' && (
                                    <>
                                        <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => onProcessOffer(o.id, 'rejected')}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onProcessOffer(o.id, 'approved')}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                                    </>
                                )}
                            </td>
                        </tr>
                    )) : (
                         <tr><td colSpan={5} className="text-center py-10 text-slate-500">No investment offers have been made.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

const ValidationsTab: React.FC<{ requests: ValidationRequest[], onProcessValidationRequest: AdminViewProps['onProcessValidationRequest'] }> = ({ requests, onProcessValidationRequest }) => {
    const [processingRequest, setProcessingRequest] = useState<number | null>(null);
    const [notes, setNotes] = useState<string>('');

    const handleProcess = async (requestId: number, status: 'approved' | 'rejected') => {
        setProcessingRequest(requestId);
        try {
            await onProcessValidationRequest(requestId, status, notes);
            setNotes('');
        } finally {
            setProcessingRequest(null);
        }
    };

    return (
        <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Startup Nation Validation Requests</h3>
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Admin Notes (optional)</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Add notes for the startup..."
                    rows={3}
                />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Request Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {requests.length > 0 ? requests.map(req => (
                            <tr key={req.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.startupName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {new Date(req.requestDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {req.status === 'pending' && (
                                        <>
                                            <Button 
                                                size="sm" 
                                                className="bg-red-600 hover:bg-red-700" 
                                                onClick={() => handleProcess(req.id, 'rejected')}
                                                disabled={processingRequest === req.id}
                                            >
                                                <X className="mr-1 h-4 w-4" /> 
                                                {processingRequest === req.id ? 'Processing...' : 'Reject'}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700" 
                                                onClick={() => handleProcess(req.id, 'approved')}
                                                disabled={processingRequest === req.id}
                                            >
                                                <Check className="mr-1 h-4 w-4" /> 
                                                {processingRequest === req.id ? 'Processing...' : 'Approve'}
                                            </Button>
                                        </>
                                    )}
                                    {req.status !== 'pending' && req.adminNotes && (
                                        <span className="text-xs text-slate-500" title={req.adminNotes}>
                                            Has notes
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="text-center py-10 text-slate-500">No validation requests found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

// New Optimized Tab Components

const StartupManagementTab: React.FC<{
    startups: Startup[];
    verificationRequests: VerificationRequest[];
    validationRequests: ValidationRequest[];
    onProcessVerification: AdminViewProps['onProcessVerification'];
    onProcessValidationRequest: AdminViewProps['onProcessValidationRequest'];
    onViewStartup: (id: number) => void;
}> = ({ startups, verificationRequests, validationRequests, onProcessVerification, onProcessValidationRequest, onViewStartup }) => {
    const [activeSubTab, setActiveSubTab] = useState<'startups' | 'verifications' | 'validations'>('startups');

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6">
                    <button
                        onClick={() => setActiveSubTab('startups')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeSubTab === 'startups'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Building2 className="h-4 w-4 inline mr-2" />
                        All Startups ({startups.length})
                    </button>
                    <button
                        onClick={() => setActiveSubTab('verifications')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeSubTab === 'verifications'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <HelpCircle className="h-4 w-4 inline mr-2" />
                        Verifications ({verificationRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveSubTab('validations')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeSubTab === 'validations'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Shield className="h-4 w-4 inline mr-2" />
                        Validations ({validationRequests.filter(v => v.status === 'pending').length})
                    </button>
                </nav>
            </div>

            {/* Content based on active sub-tab */}
            {activeSubTab === 'startups' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">All Startups</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valuation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {startups.map(s => (
                                    <tr key={s.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{s.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.sector}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatCurrency(s.currentValuation)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><Badge status={s.complianceStatus} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button size="sm" variant="outline" onClick={() => onViewStartup(s.id)}>
                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeSubTab === 'verifications' && (
                <VerificationsTab requests={verificationRequests} onProcessVerification={onProcessVerification} />
            )}

            {activeSubTab === 'validations' && (
                <ValidationsTab requests={validationRequests} onProcessValidationRequest={onProcessValidationRequest} />
            )}
        </div>
    );
};

const InvestmentFlowTab: React.FC<{
    offers: InvestmentOffer[];
    onProcessOffer: AdminViewProps['onProcessOffer'];
}> = ({ offers, onProcessOffer }) => {
    const [activeTab, setActiveTab] = useState<'activeOffers' | 'ledger'>('activeOffers');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    
    // Filter for active offers (pending and accepted)
    const activeOffers = offers.filter(offer => 
        offer.status === 'pending' || offer.status === 'accepted'
    );
    
    const filteredOffers = activeOffers.filter(offer => 
        statusFilter === 'all' || offer.status === statusFilter
    );

    const statusCounts = activeOffers.reduce((acc, offer) => {
        acc[offer.status] = (acc[offer.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('activeOffers')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'activeOffers'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Active Investment Offers
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'ledger'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Investment Ledger
                    </button>
                </nav>
            </div>

            {/* Active Offers Tab */}
            {activeTab === 'activeOffers' && (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Active Offers ({activeOffers.length})</option>
                                <option value="pending">Pending ({statusCounts.pending || 0})</option>
                                <option value="accepted">Accepted ({statusCounts.accepted || 0})</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-sm text-slate-600">
                        Showing {filteredOffers.length} of {activeOffers.length} active offers
                    </div>
                </div>
            </Card>

                    {/* Active Offers Table */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-slate-700">Active Investment Offers</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Offer Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity %</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scouting Fees</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredOffers.map((offer) => (
                                        <tr key={offer.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {offer.startupName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {offer.investorEmail}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {formatCurrency(offer.offerAmount, offer.currency || 'USD')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {offer.equityPercentage}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                <div className="text-xs">
                                                    <div>Startup: {formatCurrency((offer as any).startup_scouting_fee_paid || 0, offer.currency || 'USD')}</div>
                                                    <div>Investor: {formatCurrency((offer as any).investor_scouting_fee_paid || 0, offer.currency || 'USD')}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {offer.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(offer.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Investment Ledger Tab */}
            {activeTab === 'ledger' && (
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-slate-700">Investment Ledger</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Complete transaction history of all investment activities including offers, scouting fees, and status changes.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Activity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {offers.map((offer) => (
                                        <React.Fragment key={offer.id}>
                                            {/* Offer Made */}
                                            <tr>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {new Date(offer.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                    Offer Made
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {offer.startupName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {offer.investorEmail}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                    {formatCurrency(offer.offerAmount, offer.currency || 'USD')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    Investment offer for {offer.equityPercentage}% equity
                                                </td>
                                            </tr>
                                            
                                            {/* Startup Scouting Fee */}
                                            {(offer as any).startup_scouting_fee_paid > 0 && (
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {new Date((offer as any).startup_scouting_fee_payment_date || offer.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                                        Startup Scouting Fee
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.startupName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.investorEmail}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                        {formatCurrency((offer as any).startup_scouting_fee_paid, offer.currency || 'USD')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        Paid by investor when making offer
                                                    </td>
                                                </tr>
                                            )}
                                            
                                            {/* Offer Status Change */}
                                            {offer.status !== 'pending' && (
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {new Date(offer.updatedAt || offer.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                        Offer {offer.status === 'accepted' ? 'Accepted' : 'Rejected'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.startupName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.investorEmail}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                        —
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.status === 'accepted' ? 'Startup accepted the investment offer' : 'Startup rejected the investment offer'}
                                                    </td>
                                                </tr>
                                            )}
                                            
                                            {/* Investor Scouting Fee */}
                                            {offer.status === 'accepted' && (offer as any).investor_scouting_fee_paid > 0 && (
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {new Date((offer as any).investor_scouting_fee_payment_date || offer.updatedAt || offer.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                        Investor Scouting Fee
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.startupName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.investorEmail}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                        {formatCurrency((offer as any).investor_scouting_fee_paid, offer.currency || 'USD')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        Paid by startup when accepting offer
                                                    </td>
                                                </tr>
                                            )}
                                            
                                            {/* Contact Details Revealed */}
                                            {(offer as any).contact_details_revealed && (
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {new Date((offer as any).contact_details_revealed_date || offer.updatedAt || offer.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                                                        Contact Details Revealed
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.startupName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {offer.investorEmail}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                        —
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        Contact information shared between parties
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

const ComplianceTab: React.FC = () => {
    return <ComplianceRulesComprehensiveManager />;
};


const AnalyticsTab: React.FC<{
    users: User[];
    startups: Startup[];
    offers: InvestmentOffer[];
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
}> = ({ users, startups, offers, timeFilter, setTimeFilter }) => {
    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-slate-700">Platform Analytics</h3>
                    <div className="flex items-center gap-2">
                        <TimeFilterButton filter="30d" currentFilter={timeFilter} setTimeFilter={setTimeFilter}>30 Days</TimeFilterButton>
                        <TimeFilterButton filter="90d" currentFilter={timeFilter} setTimeFilter={setTimeFilter}>90 Days</TimeFilterButton>
                        <TimeFilterButton filter="all" currentFilter={timeFilter} setTimeFilter={setTimeFilter}>All Time</TimeFilterButton>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <UserGrowthChart users={users} />
                    <UserRoleDistributionChart users={users} />
                </div>
            </Card>

            {/* Additional Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Investment Activity</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Investment Offers</span>
                            <span className="font-semibold">{offers.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Pending Offers</span>
                            <span className="font-semibold text-yellow-600">{offers.filter(o => o.status === 'pending').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Approved Offers</span>
                            <span className="font-semibold text-green-600">{offers.filter(o => o.status === 'approved').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Investment Value</span>
                            <span className="font-semibold">{formatCurrency(offers.reduce((sum, offer) => sum + offer.offerAmount, 0))}</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Startup Metrics</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Startups</span>
                            <span className="font-semibold">{startups.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Average Valuation</span>
                            <span className="font-semibold">{formatCurrency(startups.reduce((sum, s) => sum + s.currentValuation, 0) / startups.length || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Funding Raised</span>
                            <span className="font-semibold">{formatCurrency(startups.reduce((sum, s) => sum + s.totalFunding, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Revenue</span>
                            <span className="font-semibold">{formatCurrency(startups.reduce((sum, s) => sum + s.totalRevenue, 0))}</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const SystemTab: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'general' | 'data'>('general');
    
    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveSubTab('general')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeSubTab === 'general'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        General Data
                    </button>
                    <button
                        onClick={() => setActiveSubTab('data')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeSubTab === 'data'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Data Management
                    </button>
                </nav>
            </div>

            {activeSubTab === 'general' ? (
                <GeneralDataManager />
            ) : (
                <>
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-slate-700">System Management</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 border border-slate-200 rounded-lg">
                                <Database className="h-8 w-8 text-blue-600 mb-2" />
                                <h4 className="font-semibold text-slate-700">Data Management</h4>
                                <p className="text-sm text-slate-600 mt-1">Manage platform data and exports</p>
                                <Button size="sm" className="mt-2" variant="outline">
                                    <Database className="h-4 w-4 mr-1" />
                                    Access
                                </Button>
                            </div>
                            
                            <div className="p-4 border border-slate-200 rounded-lg">
                                <Settings className="h-8 w-8 text-green-600 mb-2" />
                                <h4 className="font-semibold text-slate-700">System Settings</h4>
                                <p className="text-sm text-slate-600 mt-1">Configure platform settings</p>
                                <Button size="sm" className="mt-2" variant="outline">
                                    <Settings className="h-4 w-4 mr-1" />
                                    Configure
                                </Button>
                            </div>
                            
                            <div className="p-4 border border-slate-200 rounded-lg">
                                <AlertTriangle className="h-8 w-8 text-yellow-600 mb-2" />
                                <h4 className="font-semibold text-slate-700">System Health</h4>
                                <p className="text-sm text-slate-600 mt-1">Monitor system performance</p>
                                <Button size="sm" className="mt-2" variant="outline">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Monitor
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <DataManager />
                </>
            )}
        </div>
    );
};

export default AdminView;

// New structured compliance rules manager with hierarchical organization
const ComplianceRulesManager: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'countries' | 'auditors' | 'governance' | 'company-types' | 'compliance-rules'>('countries');
    const [loading, setLoading] = useState(true);
    
    // Countries state
    const [countries, setCountries] = useState<any[]>([]);
    const [newCountry, setNewCountry] = useState({ code: '', name: '' });
    
    // Auditor types state
    const [auditorTypes, setAuditorTypes] = useState<AuditorType[]>([]);
    const [newAuditorType, setNewAuditorType] = useState({ name: '', description: '' });
    
    // Governance types state
    const [governanceTypes, setGovernanceTypes] = useState<GovernanceType[]>([]);
    const [newGovernanceType, setNewGovernanceType] = useState({ name: '', description: '' });
    
    // Company types state
    const [selectedCountryForTypes, setSelectedCountryForTypes] = useState<string>('');
    const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
    const [newCompanyType, setNewCompanyType] = useState({ name: '', description: '' });
    
    // Compliance rules state
    const [selectedCountryForRules, setSelectedCountryForRules] = useState<string>('');
    const [selectedCompanyTypeForRules, setSelectedCompanyTypeForRules] = useState<number | null>(null);
    const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
    const [editingComplianceRule, setEditingComplianceRule] = useState<ComplianceRule | null>(null);
    const [newComplianceRule, setNewComplianceRule] = useState({
        name: '',
        description: '',
        frequency: 'annual' as 'first-year' | 'monthly' | 'quarterly' | 'annual',
        validationRequired: 'both' as 'auditor' | 'governance' | 'both'
    });

    const loadData = async () => {
        setLoading(true);
        try {
            // Load countries from comprehensive compliance rules
            const comprehensiveRules = await complianceRulesComprehensiveService.getAllRules();
            const uniqueCountries = Array.from(new Set(comprehensiveRules.map(rule => ({
                country_code: rule.country_code,
                country_name: rule.country_name
            }))));
            setCountries(uniqueCountries);
            
            // Load auditor types
            const auditorTypesData = await complianceManagementService.getAuditorTypes();
            setAuditorTypes(auditorTypesData);
            
            // Load governance types
            const governanceTypesData = await complianceManagementService.getGovernanceTypes();
            setGovernanceTypes(governanceTypesData);
            
            // Load company types
            const companyTypesData = await complianceManagementService.getCompanyTypes();
            setCompanyTypes(companyTypesData);
            
            // Load compliance rules
            const complianceRulesData = await complianceManagementService.getComplianceRules();
            setComplianceRules(complianceRulesData);
            
            if (countries.length > 0) {
                setSelectedCountryForTypes(countries[0].country_code);
                setSelectedCountryForRules(countries[0].country_code);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const addCountry = async () => {
        if (!newCountry.code || !newCountry.name) return;
        try {
            // Note: Countries are now managed through the comprehensive compliance rules system
            // This function is kept for backward compatibility but may not be needed
            console.log('Country management is now handled through the comprehensive compliance rules system');
            setNewCountry({ code: '', name: '' });
            await loadData();
        } catch (error) {
            console.error('Error adding country:', error);
        }
    };

    const addAuditorType = async () => {
        if (!newAuditorType.name) return;
        try {
            const newType = await complianceManagementService.addAuditorType(
                newAuditorType.name,
                newAuditorType.description
            );
            setAuditorTypes(prev => [...prev, newType]);
            setNewAuditorType({ name: '', description: '' });
        } catch (error) {
            console.error('Error adding auditor type:', error);
            alert('Error adding auditor type. Please try again.');
        }
    };

    const addGovernanceType = async () => {
        if (!newGovernanceType.name) return;
        try {
            const newType = await complianceManagementService.addGovernanceType(
                newGovernanceType.name,
                newGovernanceType.description
            );
            setGovernanceTypes(prev => [...prev, newType]);
            setNewGovernanceType({ name: '', description: '' });
        } catch (error) {
            console.error('Error adding governance type:', error);
            alert('Error adding governance type. Please try again.');
        }
    };

    const addCompanyType = async () => {
        if (!newCompanyType.name || !selectedCountryForTypes) return;
        try {
            const newType = await complianceManagementService.addCompanyType(
                newCompanyType.name,
                newCompanyType.description,
                selectedCountryForTypes
            );
            setCompanyTypes(prev => [...prev, newType]);
            setNewCompanyType({ name: '', description: '' });
        } catch (error) {
            console.error('Error adding company type:', error);
            alert('Error adding company type. Please try again.');
        }
    };

    const addComplianceRule = async () => {
        if (!newComplianceRule.name || !selectedCountryForRules || !selectedCompanyTypeForRules) return;
        try {
            const newRule = await complianceManagementService.addComplianceRule(
                newComplianceRule.name,
                newComplianceRule.description,
                newComplianceRule.frequency,
                newComplianceRule.validationRequired,
                selectedCountryForRules,
                selectedCompanyTypeForRules
            );
            setComplianceRules(prev => [...prev, newRule]);
            setNewComplianceRule({
                name: '',
                description: '',
                frequency: 'annual',
                validationRequired: 'both'
            });
        } catch (error) {
            console.error('Error adding compliance rule:', error);
            alert('Error adding compliance rule. Please try again.');
        }
    };

    const editComplianceRule = (rule: ComplianceRule) => {
        setEditingComplianceRule(rule);
        setNewComplianceRule({
            name: rule.name,
            description: rule.description,
            frequency: rule.frequency,
            validationRequired: rule.validation_required
        });
    };

    const updateComplianceRule = async () => {
        if (!editingComplianceRule || !newComplianceRule.name) return;
        try {
            const updatedRule = await complianceManagementService.updateComplianceRule(
                editingComplianceRule.id,
                newComplianceRule.name,
                newComplianceRule.description,
                newComplianceRule.frequency,
                newComplianceRule.validationRequired
            );
            setComplianceRules(prev => prev.map(rule => 
                rule.id === editingComplianceRule.id ? updatedRule : rule
            ));
            setEditingComplianceRule(null);
            setNewComplianceRule({
                name: '',
                description: '',
                frequency: 'annual',
                validationRequired: 'both'
            });
        } catch (error) {
            console.error('Error updating compliance rule:', error);
            alert('Error updating compliance rule. Please try again.');
        }
    };

    const cancelEdit = () => {
        setEditingComplianceRule(null);
        setNewComplianceRule({
            name: '',
            description: '',
            frequency: 'annual',
            validationRequired: 'both'
        });
    };

    const renderCountriesTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-700">Countries Management</h4>
                <Button onClick={addCountry}>Add Country</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Country Code</label>
                    <input
                        value={newCountry.code}
                        onChange={(e) => setNewCountry(prev => ({ ...prev, code: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., US, IN, UK"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Country Name</label>
                    <input
                        value={newCountry.name}
                        onChange={(e) => setNewCountry(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., United States, India, United Kingdom"
                    />
                    </div>
                </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Country Code</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Country Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {countries.map((country) => (
                            <tr key={country.country_code}>
                                <td className="px-4 py-2 text-sm text-slate-900">{country.country_code}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{country.country_code}</td>
                                <td className="px-4 py-2 text-sm">
                                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => {
                                        if (confirm('Delete this country?')) {
                                            // Note: Country deletion is now handled through the comprehensive compliance rules system
                                            console.log('Country deletion is now handled through the comprehensive compliance rules system');
                                            loadData();
                                        }
                                    }}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAuditorTypesTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-700">Auditor Types Management</h4>
                <Button onClick={addAuditorType}>Add Auditor Type</Button>
                        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Auditor Type Name</label>
                    <input
                        value={newAuditorType.name}
                        onChange={(e) => setNewAuditorType(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., CA, CFA, Auditor"
                    />
                </div>
                        <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <input
                        value={newAuditorType.description}
                        onChange={(e) => setNewAuditorType(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., Chartered Accountant"
                    />
                    </div>
                </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                        {auditorTypes.map((type) => (
                            <tr key={type.id}>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.name}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.description}</td>
                                <td className="px-4 py-2 text-sm">
                                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={async () => {
                                        if (confirm('Delete this auditor type?')) {
                                            try {
                                                await complianceManagementService.deleteAuditorType(type.id);
                                                setAuditorTypes(prev => prev.filter(t => t.id !== type.id));
                                            } catch (error) {
                                                console.error('Error deleting auditor type:', error);
                                                alert('Error deleting auditor type. Please try again.');
                                            }
                                        }
                                    }}>Delete</Button>
                                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                        </div>
        </div>
    );

    const renderGovernanceTypesTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-700">Governance Types Management</h4>
                <Button onClick={addGovernanceType}>Add Governance Type</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Governance Type Name</label>
                    <input
                        value={newGovernanceType.name}
                        onChange={(e) => setNewGovernanceType(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., CS, Director, Legal"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <input
                        value={newGovernanceType.description}
                        onChange={(e) => setNewGovernanceType(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., Company Secretary"
                    />
                </div>
            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                        {governanceTypes.map((type) => (
                            <tr key={type.id}>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.name}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.description}</td>
                                <td className="px-4 py-2 text-sm">
                                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={async () => {
                                        if (confirm('Delete this governance type?')) {
                                            try {
                                                await complianceManagementService.deleteGovernanceType(type.id);
                                                setGovernanceTypes(prev => prev.filter(t => t.id !== type.id));
                                            } catch (error) {
                                                console.error('Error deleting governance type:', error);
                                                alert('Error deleting governance type. Please try again.');
                                            }
                                        }
                                    }}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
    );

    const renderCompanyTypesTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-700">Company Types Management</h4>
                <Button onClick={addCompanyType}>Add Company Type</Button>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
                        <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Country</label>
                    <select
                        value={selectedCountryForTypes}
                        onChange={(e) => setSelectedCountryForTypes(e.target.value)}
                        className="border border-slate-300 rounded-md px-3 py-2"
                    >
                        {countries.map(country => (
                            <option key={country.country_code} value={country.country_code}>{country.country_code}</option>
                        ))}
                    </select>
                            </div>
                        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company Type Name</label>
                    <input
                        value={newCompanyType.name}
                        onChange={(e) => setNewCompanyType(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., Private Limited Company"
                    />
                </div>
                        <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <input
                        value={newCompanyType.description}
                        onChange={(e) => setNewCompanyType(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., Private Limited Company under Companies Act"
                    />
                </div>
            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Country</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                        {companyTypes.filter(ct => ct.country_code === selectedCountryForTypes).map((type) => (
                            <tr key={type.id}>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.name}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.description}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{type.country_code}</td>
                                <td className="px-4 py-2 text-sm">
                                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={async () => {
                                        if (confirm('Delete this company type?')) {
                                            try {
                                                await complianceManagementService.deleteCompanyType(type.id);
                                                setCompanyTypes(prev => prev.filter(t => t.id !== type.id));
                                            } catch (error) {
                                                console.error('Error deleting company type:', error);
                                                alert('Error deleting company type. Please try again.');
                                            }
                                        }
                                    }}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
    );

    const renderComplianceRulesTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-700">Compliance Rules Management</h4>
                <div className="flex gap-2">
                    {editingComplianceRule ? (
                        <>
                            <Button onClick={updateComplianceRule} className="bg-green-600 hover:bg-green-700">
                                Update Rule
                            </Button>
                            <Button onClick={cancelEdit} className="bg-gray-600 hover:bg-gray-700">
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <Button onClick={addComplianceRule}>Add Compliance Rule</Button>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
                            <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Country</label>
                    <select
                        value={selectedCountryForRules}
                        onChange={(e) => setSelectedCountryForRules(e.target.value)}
                        className="border border-slate-300 rounded-md px-3 py-2"
                    >
                        {countries.map(country => (
                            <option key={country.country_code} value={country.country_code}>{country.country_code}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Company Type</label>
                    <select
                        value={selectedCompanyTypeForRules}
                        onChange={(e) => setSelectedCompanyTypeForRules(e.target.value ? parseInt(e.target.value) : null)}
                        className="border border-slate-300 rounded-md px-3 py-2"
                    >
                        <option value="">Select Company Type</option>
                        {companyTypes.filter(ct => ct.country_code === selectedCountryForRules).map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                            </div>
                        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rule Name</label>
                    <input
                        value={newComplianceRule.name}
                        onChange={(e) => setNewComplianceRule(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., File Annual Return (MGT-7)"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <input
                        value={newComplianceRule.description}
                        onChange={(e) => setNewComplianceRule(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        placeholder="e.g., Annual return filing requirement"
                    />
                </div>
                            <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                    <select
                        value={newComplianceRule.frequency}
                        onChange={(e) => setNewComplianceRule(prev => ({ ...prev, frequency: e.target.value as any }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                    >
                        <option value="first-year">First Year</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                                    <option value="annual">Annual</option>
                                </select>
                            </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Validation Required</label>
                    <select
                        value={newComplianceRule.validationRequired}
                        onChange={(e) => setNewComplianceRule(prev => ({ ...prev, validationRequired: e.target.value as any }))}
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                    >
                        <option value="auditor">Auditor or Equivalent</option>
                        <option value="governance">Governance or Equivalent</option>
                        <option value="both">Both</option>
                                </select>
                            </div>
                        </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Rule Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Frequency</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Validation</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Country</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Company Type</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {complianceRules.filter(cr => cr.country_code === selectedCountryForRules && cr.company_type_id === selectedCompanyTypeForRules).map((rule) => (
                            <tr key={rule.id}>
                                <td className="px-4 py-2 text-sm text-slate-900">{rule.name}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{rule.description}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{rule.frequency}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{rule.validation_required}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{rule.country_code}</td>
                                <td className="px-4 py-2 text-sm text-slate-900">{companyTypes.find(ct => ct.id === rule.company_type_id)?.name || 'Unknown'}</td>
                                <td className="px-4 py-2 text-sm">
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            className="bg-blue-600 hover:bg-blue-700" 
                                            onClick={() => editComplianceRule(rule)}
                                        >
                                            Edit
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="bg-red-600 hover:bg-red-700" 
                                            onClick={async () => {
                                                if (confirm('Delete this compliance rule?')) {
                                                    try {
                                                        await complianceManagementService.deleteComplianceRule(rule.id);
                                                        setComplianceRules(prev => prev.filter(r => r.id !== rule.id));
                                                    } catch (error) {
                                                        console.error('Error deleting compliance rule:', error);
                                                        alert('Error deleting compliance rule. Please try again.');
                                                    }
                                                }
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <Card>
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-700">Compliance Rules Management</h3>
                            </div>

                {/* Sub-tabs */}
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6">
                        <button
                            onClick={() => setActiveSubTab('countries')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeSubTab === 'countries'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Countries
                        </button>
                        <button
                            onClick={() => setActiveSubTab('auditors')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeSubTab === 'auditors'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Auditor Types
                        </button>
                        <button
                            onClick={() => setActiveSubTab('governance')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeSubTab === 'governance'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Governance Types
                        </button>
                        <button
                            onClick={() => setActiveSubTab('company-types')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeSubTab === 'company-types'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Company Types
                        </button>
                        <button
                            onClick={() => setActiveSubTab('compliance-rules')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeSubTab === 'compliance-rules'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Compliance Rules
                        </button>
                    </nav>
                        </div>

                {loading ? (
                    <div className="text-slate-500">Loading...</div>
                ) : (
                    <div>
                        {activeSubTab === 'countries' && renderCountriesTab()}
                        {activeSubTab === 'auditors' && renderAuditorTypesTab()}
                        {activeSubTab === 'governance' && renderGovernanceTypesTab()}
                        {activeSubTab === 'company-types' && renderCompanyTypesTab()}
                        {activeSubTab === 'compliance-rules' && renderComplianceRulesTab()}
                    </div>
                )}
            </div>
        </Card>
    );
};