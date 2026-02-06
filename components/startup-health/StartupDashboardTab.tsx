import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Startup, InvestmentOffer } from '../../types';
import { DashboardMetricsService, DashboardMetrics } from '../../lib/dashboardMetricsService';
import { financialsService } from '../../lib/financialsService';
import { formatCurrency, formatCurrencyCompact } from '../../lib/utils';
import { useStartupCurrency } from '../../lib/hooks/useStartupCurrency';
import Card from '../ui/Card';
import Button from '../ui/Button';
import CloudDriveInput from '../ui/CloudDriveInput';
import ComplianceSubmissionButton from '../ComplianceSubmissionButton';
import { DollarSign, Zap, TrendingUp, Download, Check, X, FileText, MessageCircle, Calendar, ChevronDown, CheckCircle, Clock, XCircle, Trash2, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { investmentService } from '../../lib/investmentService';
import { investmentService as databaseInvestmentService } from '../../lib/database';
import StartupMessagingModal from './StartupMessagingModal';
import StartupContractModal from './StartupContractModal';
import InvestorContactDetailsModal from './InvestorContactDetailsModal';
import { Form2SubmissionModal } from '../Form2SubmissionModal';
import Modal from '../ui/Modal';
import { questionBankService, OpportunityQuestion } from '../../lib/questionBankService';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { capTableService } from '../../lib/capTableService';
import { IncubationType, FeeType } from '../../types';
import { messageService } from '../../lib/messageService';
import { complianceRulesIntegrationService } from '../../lib/complianceRulesIntegrationService';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { paymentService } from '../../lib/paymentService';

// Types for offers received
interface OfferReceived {
  id: string;
  from: string;
  type: 'Incubation' | 'Due Diligence' | 'Investment';
  offerDetails: string;
  status: 'pending' | 'accepted' | 'rejected';
  code: string;
  agreementUrl?: string;
  contractUrl?: string;
  applicationId?: string;
  createdAt: string;
  isInvestmentOffer?: boolean;
  investmentOfferId?: number;
  startupScoutingFee?: number;
  investorScoutingFee?: number;
  contactDetailsRevealed?: boolean;
  programName?: string;
  facilitatorName?: string;
  diligenceUrls?: string[]; // Array of uploaded diligence document URLs
  // Co-investment fields
  isSeekingCoInvestment?: boolean;
  remainingCoInvestmentAmount?: number;
  isCoInvestmentOpportunity?: boolean;
  coInvestmentOpportunityId?: number;
  description?: string;
  totalInvestmentAmount?: number;
  equityPercentage?: number;
  // Stage information
  stage?: number;
  stageStatus?: string;
  stageColor?: string;
  // Co-investment offer fields (for actual offers made on opportunities)
  isCoInvestmentOffer?: boolean;
  coInvestmentOfferId?: number;
}

interface StartupDashboardTabProps {
  startup: Startup;
  isViewOnly?: boolean;
  offers?: InvestmentOffer[];
  onProcessOffer?: (offerId: number, status: 'approved' | 'rejected' | 'accepted' | 'completed') => void;
  currentUser?: any;
  onTrialButtonClick?: () => void; // Add trial button click handler
}

const COLORS = ['#1e40af', '#1d4ed8', '#3b82f6', '#60a5fa'];

const StartupDashboardTab: React.FC<StartupDashboardTabProps> = ({ startup, isViewOnly = false, offers = [], onProcessOffer, currentUser, onTrialButtonClick }) => {
  const startupCurrency = useStartupCurrency(startup);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [fundUsageData, setFundUsageData] = useState<any[]>([]);
  
  // Guards to prevent repeated loads
  const isLoadingDashboardRef = useRef(false);
  const isLoadingOffersRef = useRef(false);
  const lastStartupIdRef = useRef<number | null>(null);
  
  // Enhanced dashboard state
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [viewMode, setViewMode] = useState<'year' | 'monthly'>('year');
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<(number | 'all')[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [adminProgramPosts, setAdminProgramPosts] = useState<AdminProgramPost[]>([]);

  // Due Diligence Requests (investor → startup)
  const [diligenceRequests, setDiligenceRequests] = useState<any[]>([]);
  const [facilitatorDiligenceRequests, setFacilitatorDiligenceRequests] = useState<any[]>([]);
  
  // Offers Received states
  const [offersReceived, setOffersReceived] = useState<OfferReceived[]>([]);
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const [offerFilter, setOfferFilter] = useState<'all' | 'investment' | 'incubation'>('all');
  
  // Incubation Programs section states (separate from Offers Received)
  const [incubationPrograms, setIncubationPrograms] = useState<any[]>([]);
  const [form2Requests, setForm2Requests] = useState<any[]>([]);
  const [incubationFilter, setIncubationFilter] = useState<'all' | 'pending' | 'accepted' | 'form2_pending'>('all');
  
  // Form 2 Submission Modal states
  const [isForm2ModalOpen, setIsForm2ModalOpen] = useState(false);
  const [selectedForm2Data, setSelectedForm2Data] = useState<{
    applicationId: string;
    opportunityId: string;
    opportunityName: string;
  } | null>(null);
  
  // Messaging modal states
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [selectedOfferForMessaging, setSelectedOfferForMessaging] = useState<OfferReceived | null>(null);
  
  // Contract viewing modal states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedOfferForContract, setSelectedOfferForContract] = useState<OfferReceived | null>(null);
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false);
  
  // Investor contact details modal states
  const [isInvestorContactModalOpen, setIsInvestorContactModalOpen] = useState(false);
  const [selectedOfferForContact, setSelectedOfferForContact] = useState<InvestmentOffer | null>(null);
  
  // Co-investment offer details modal states
  const [isCoInvestmentDetailsModalOpen, setIsCoInvestmentDetailsModalOpen] = useState(false);
  const [coInvestmentDetails, setCoInvestmentDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [recognitionFormState, setRecognitionFormState] = useState<{[key:string]: any}>({});
  const [hiddenUploadOffers, setHiddenUploadOffers] = useState<Set<string>>(new Set());
  const [recFeeType, setRecFeeType] = useState<FeeType>(FeeType.Free);
  const [recShares, setRecShares] = useState<string>('');
  const [recPricePerShare, setRecPricePerShare] = useState<string>('');
  const [recAmount, setRecAmount] = useState<string>('');
  const [recEquity, setRecEquity] = useState<string>('');
  const [recPostMoney, setRecPostMoney] = useState<string>('');
  const [recAgreementFile, setRecAgreementFile] = useState<File | null>(null);
  const [totalSharesForCalc, setTotalSharesForCalc] = useState<number>(0);
  
  // Program Tracking Questions Modal states
  const [isTrackingQuestionsModalOpen, setIsTrackingQuestionsModalOpen] = useState(false);
  const [selectedProgramForTracking, setSelectedProgramForTracking] = useState<{
    facilitatorId: string;
    programName: string;
    facilitatorName: string;
  } | null>(null);
  const [trackingQuestions, setTrackingQuestions] = useState<OpportunityQuestion[]>([]);
  const [trackingResponses, setTrackingResponses] = useState<Map<string, string>>(new Map());
  const [isLoadingTrackingQuestions, setIsLoadingTrackingQuestions] = useState(false);
  const [isSavingTrackingResponses, setIsSavingTrackingResponses] = useState(false);
  
  // Compliance data state
  const [complianceData, setComplianceData] = useState<{
    totalTasks: number;
    completedTasks: number;
    percentage: number;
    submittedTasks: number;
    submittedPercentage: number;
    verifiedTasks: number;
    verifiedPercentage: number;
  }>({ 
    totalTasks: 0, 
    completedTasks: 0, 
    percentage: 0,
    submittedTasks: 0,
    submittedPercentage: 0,
    verifiedTasks: 0,
    verifiedPercentage: 0
  });

  // Load compliance data
  const loadComplianceData = async () => {
    try {
      const complianceTasks = await complianceRulesIntegrationService.getComplianceTasksForStartup(startup.id);
      
      // Filter to only include applicable tasks
      const applicableTasks = complianceTasks.filter(task => task.isApplicable !== false);
      
      const totalTasks = applicableTasks.length;
      
      // Calculate completed tasks (both CA and CS are Verified)
      const completedTasks = applicableTasks.filter(task => {
        const caVerified = !task.caRequired || task.caStatus === 'Verified';
        const csVerified = !task.csRequired || task.csStatus === 'Verified';
        return caVerified && csVerified;
      }).length;
      
      // Calculate submitted tasks (at least one required status is Submitted or Verified)
      // A task is considered submitted if at least one required verification (CA or CS) has status "Submitted" or "Verified"
      const submittedTasks = applicableTasks.filter(task => {
        const caSubmitted = task.caRequired && (task.caStatus === 'Submitted' || task.caStatus === 'Verified');
        const csSubmitted = task.csRequired && (task.csStatus === 'Submitted' || task.csStatus === 'Verified');
        // If task requires both, at least one must be submitted; if only one is required, that one must be submitted
        if (task.caRequired && task.csRequired) {
          return caSubmitted || csSubmitted;
        } else if (task.caRequired) {
          return caSubmitted;
        } else if (task.csRequired) {
          return csSubmitted;
        }
        // If neither is required, don't count it
        return false;
      }).length;
      
      // Calculate verified tasks (at least one required status is Verified)
      // A task is considered verified if at least one required verification (CA or CS) has status "Verified"
      const verifiedTasks = applicableTasks.filter(task => {
        const caVerified = task.caRequired && task.caStatus === 'Verified';
        const csVerified = task.csRequired && task.csStatus === 'Verified';
        // If task requires both, at least one must be verified; if only one is required, that one must be verified
        if (task.caRequired && task.csRequired) {
          return caVerified || csVerified;
        } else if (task.caRequired) {
          return caVerified;
        } else if (task.csRequired) {
          return csVerified;
        }
        // If neither is required, don't count it
        return false;
      }).length;
      
      const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const submittedPercentage = totalTasks > 0 ? Math.round((submittedTasks / totalTasks) * 100) : 0;
      const verifiedPercentage = totalTasks > 0 ? Math.round((verifiedTasks / totalTasks) * 100) : 0;
      
      setComplianceData({
        totalTasks,
        completedTasks,
        percentage,
        submittedTasks,
        submittedPercentage,
        verifiedTasks,
        verifiedPercentage
      });
    } catch (error) {
      console.error('Error loading compliance data:', error);
      setComplianceData({ 
        totalTasks: 0, 
        completedTasks: 0, 
        percentage: 0,
        submittedTasks: 0,
        submittedPercentage: 0,
        verifiedTasks: 0,
        verifiedPercentage: 0
      });
    }
  };


  useEffect(() => {
    const loadDashboardData = async () => {
      // Prevent concurrent loads
      if (isLoadingDashboardRef.current || lastStartupIdRef.current === startup.id) {
        return;
      }
      
      isLoadingDashboardRef.current = true;
      lastStartupIdRef.current = startup.id;
      
      try {
        setIsLoading(true);
        
        // Load metrics
        const calculatedMetrics = await DashboardMetricsService.calculateMetrics(startup);
        setMetrics(calculatedMetrics);
        
        // Generate available years based on company registration date
        // Try to get registration date from multiple sources
        const registrationDateValue = startup.registrationDate || startup.profile?.registrationDate || (startup as any).registration_date;
        let registrationYear: number;
        
        if (registrationDateValue) {
          registrationYear = new Date(registrationDateValue).getFullYear();
        } else {
          // Fallback: use earliest financial record date
          try {
            const allRecords = await financialsService.getFinancialRecords(startup.id, {});
            if (allRecords.length > 0) {
              const earliestRecord = allRecords.reduce((earliest, record) => {
                const recordDate = new Date(record.date);
                const earliestDate = new Date(earliest.date);
                return recordDate < earliestDate ? record : earliest;
              });
              registrationYear = new Date(earliestRecord.date).getFullYear();
              if (process.env.NODE_ENV === 'development') {
                console.log('📅 Dashboard: Using earliest financial record year:', registrationYear);
              }
            } else {
              registrationYear = new Date().getFullYear();
              if (process.env.NODE_ENV === 'development') {
                console.log('📅 Dashboard: Using current year:', registrationYear);
              }
            }
          } catch (error) {
            console.error('Error fetching financial records for year generation:', error);
            registrationYear = new Date().getFullYear();
          }
        }
        
        const currentYear = new Date().getFullYear();
        
        // Create array of years from registration year to current year, with 'all' as first option
        const years: (number | 'all')[] = ['all'];
        for (let year = currentYear; year >= registrationYear; year--) {
          years.push(year);
        }
        setAvailableYears(years);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📅 Dashboard: Generated years from', registrationYear, 'to', currentYear, ':', years);
        }
        
        // Ensure selectedYear is within available years (default to 'all')
        if (selectedYear !== 'all' && !years.includes(selectedYear)) {
          setSelectedYear('all');
        }
        
        // Load data for selected year
        await loadFinancialDataForYear(selectedYear);
        
        // Load compliance data
        await loadComplianceData();

        // Load admin program posts (Other Program)
        try {
          const posts = await adminProgramsService.listActive();
          setAdminProgramPosts(posts);
        } catch (e) {
          console.warn('Failed to load admin program posts:', e);
          setAdminProgramPosts([]);
        }

        // Load due diligence requests for this startup (RLS-safe via RPC if available)
        try {
          let rows: any[] | null = null;
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_due_diligence_requests_for_startup', {
              p_startup_id: String(startup.id)
            });
            if (!rpcError && rpcData) {
              rows = rpcData;
            }
          } catch (_) {
            // Ignore - RPC might not exist yet
          }

          if (!rows) {
            // Fallback (may be blocked by RLS):
            const { data, error } = await supabase
              .from('due_diligence_requests')
              .select('id, user_id, startup_id, status, created_at')
              .eq('startup_id', String(startup.id))
              .order('created_at', { ascending: false });
            if (!error) rows = data || [];
          }

          if (rows) {
            // Enrich with investor names unless rpc already provided them
            const hasInvestorInfo = rows.length > 0 && (rows[0].investor_name || rows[0].investor_email);
            if (hasInvestorInfo) {
              setDiligenceRequests(rows.map(r => ({
                id: r.id,
                user_id: r.user_id,
                startup_id: r.startup_id,
                status: r.status,
                created_at: r.created_at,
                investor: { name: r.investor_name, email: r.investor_email }
              })));
            } else {
              const userIds = Array.from(new Set(rows.map(r => r.user_id)));
              let usersMap: Record<string, any> = {};
              if (userIds.length > 0) {
                // CRITICAL FIX: users table removed, use user_profiles instead
                // user_id is auth_user_id, so we need to query by auth_user_id
                const { data: users } = await supabase
                  .from('user_profiles')
                  .select('auth_user_id, name, email')
                  .in('auth_user_id', userIds);
                (users || []).forEach(u => { usersMap[u.auth_user_id] = u; });
              }
              setDiligenceRequests(
                rows.map(r => ({
                  ...r,
                  investor: usersMap[r.user_id] || { name: 'Investor', email: '' }
                }))
              );
            }
          } else {
            setDiligenceRequests([]);
          }
        } catch (e) {
          console.warn('Failed to load due diligence requests:', e);
          setDiligenceRequests([]);
        }
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
        isLoadingDashboardRef.current = false;
      }
    };

    loadDashboardData();
    // Always load offers directly to ensure consistent formatting and visibility
    loadOffersReceived();
  }, [startup.id]); // Only depend on startup.id, not selectedYear to avoid double loading

  // REMOVED: Duplicate useEffect that was causing infinite loop
  // Offers are now loaded only once on mount if not provided via props

  const loadFinancialDataForYear = async (year: number | 'all') => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Loading financial data for year:', year);
      }
      // When 'all' is selected, don't pass year filter to get all records
      const filters = year === 'all' ? {} : { year };
      const allRecords = await financialsService.getFinancialRecords(startup.id, filters);
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Records loaded:', allRecords.length);
      }
      
      if (allRecords.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('No financial records found for year', year);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('💾 Sample records:', allRecords.slice(0, 3).map(r => ({
            date: r.date,
            type: r.record_type,
            amount: r.amount,
            year: new Date(r.date).getFullYear()
          })));
        }
      }
      
      // Generate monthly revenue vs expenses data
      // If year is 'all' (Till Date), use year-month combinations to avoid overlapping months
      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      if (year === 'all') {
        // For "Till Date", aggregate by year-month (e.g., "2024-Jan", "2025-Nov", "2026-Nov")
        allRecords.forEach(record => {
          const recordDate = new Date(record.date);
          const recordYear = recordDate.getFullYear();
          const monthIndex = recordDate.getMonth();
          const monthName = months[monthIndex];
          const key = `${recordYear}-${monthName}`;
          
          if (!monthlyData[key]) {
            monthlyData[key] = { revenue: 0, expenses: 0 };
          }
          
          if (record.record_type === 'revenue') {
            monthlyData[key].revenue += record.amount;
          } else {
            monthlyData[key].expenses += record.amount;
          }
        });
        
        // Sort by date (year-month)
        const sortedEntries = Object.entries(monthlyData).sort((a, b) => {
          const [yearA, monthA] = a[0].split('-');
          const [yearB, monthB] = b[0].split('-');
          const monthIndexA = months.indexOf(monthA);
          const monthIndexB = months.indexOf(monthB);
          
          if (yearA !== yearB) {
            return parseInt(yearA) - parseInt(yearB);
          }
          return monthIndexA - monthIndexB;
        });
        
        const finalRevenueData = sortedEntries.map(([key, data]) => ({
          name: key, // e.g., "2024-Jan", "2025-Nov"
          revenue: data.revenue,
          expenses: data.expenses
        }));
        
        setRevenueData(finalRevenueData);
      } else {
        // For specific year, use just month names
        months.forEach(month => {
          monthlyData[month] = { revenue: 0, expenses: 0 };
        });
        
        // Aggregate data by month
        allRecords.forEach(record => {
          const monthIndex = new Date(record.date).getMonth();
          const monthName = months[monthIndex];
          
          if (record.record_type === 'revenue') {
            monthlyData[monthName].revenue += record.amount;
          } else {
            monthlyData[monthName].expenses += record.amount;
          }
        });
        
        const finalRevenueData = months.map(month => ({
          name: month,
          revenue: monthlyData[month].revenue,
          expenses: monthlyData[month].expenses
        }));
        
        setRevenueData(finalRevenueData);
      }
      
      // Generate fund usage data based on actual expense categories
      const expenseByVertical: { [key: string]: number } = {};
      allRecords
        .filter(record => record.record_type === 'expense')
        .forEach(record => {
          expenseByVertical[record.vertical] = (expenseByVertical[record.vertical] || 0) + record.amount;
        });
      
      const finalFundUsageData = Object.entries(expenseByVertical)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4); // Top 4 categories
      
      setFundUsageData(finalFundUsageData);
      
      // Set available months for the selected year
      const monthsWithData = months.filter(month => {
        const monthIndex = months.indexOf(month);
        return allRecords.some(record => new Date(record.date).getMonth() === monthIndex);
      });
      setAvailableMonths(monthsWithData);
      
    } catch (error) {
      console.error('Error loading financial data for year:', error);
    }
  };

  const loadDailyDataForMonth = async (year: number | 'all', month: string) => {
    try {
      // Daily view requires a specific year, not 'all'
      if (year === 'all') {
        console.warn('⚠️ Dashboard: Daily view not available for "All Years", switching to monthly view');
        setViewMode('monthly');
        setSelectedMonth('');
        return;
      }
      
      const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
      const allRecords = await financialsService.getFinancialRecords(startup.id, { year });
      
      // Filter records for the specific month
      const monthRecords = allRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === monthIndex && recordDate.getFullYear() === year;
      });
      
      // Group by day
      const dailyData: { [key: string]: { revenue: number; expenses: number } } = {};
      
      monthRecords.forEach(record => {
        const day = new Date(record.date).getDate();
        const dayKey = day.toString();
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { revenue: 0, expenses: 0 };
        }
        
        if (record.record_type === 'revenue') {
          dailyData[dayKey].revenue += record.amount;
        } else {
          dailyData[dayKey].expenses += record.amount;
        }
      });
      
      // Convert to array and sort by day
      const finalDailyData = Object.entries(dailyData)
        .map(([day, data]) => ({
          day: parseInt(day),
          name: `Day ${day}`,
          revenue: data.revenue,
          expenses: data.expenses
        }))
        .sort((a, b) => a.day - b.day);
      
      setDailyData(finalDailyData);
      
      // If no data found for the month, show a message
      if (finalDailyData.length === 0 && process.env.NODE_ENV === 'development') {
        console.log(`No financial data found for ${month} ${year}`);
      }
      
    } catch (error) {
      console.error('Error loading daily data:', error);
      setDailyData([]);
    }
  };

  // Load offers received
  const loadOffersReceived = async () => {
    if (!startup?.id) return;
    // Prevent overlapping fetches that can race and clear state
    if (isLoadingOffersRef.current) return;
    isLoadingOffersRef.current = true;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Loading offers for startup ID:', startup.id);
      }
      // Fetch offers directly from database using the correct service
      const investmentOffers = await databaseInvestmentService.getOffersForStartup(Number(startup.id));
      if (process.env.NODE_ENV === 'development') {
        console.log('💰 Investment offers count:', investmentOffers?.length || 0);
      }
      
      // Fetch all opportunity applications for this startup with proper joins
      let allApplications = [];
      try {
        // First try the simple query to see what we get
        const { data: simpleData, error: simpleError } = await supabase
          .from('opportunity_applications')
          .select('*, diligence_status, diligence_urls, created_at')
          .eq('startup_id', startup.id);
        
        if (simpleError) {
          console.error('Error with simple query:', simpleError);
          allApplications = [];
        } else {
          allApplications = simpleData || [];
        }
        
        // Joined query removed to avoid 400 errors in production (schema cache mismatch)
        // Proceed with manual enrichment only
        const opportunityIds = allApplications.map(app => app.opportunity_id).filter(Boolean);
        if (opportunityIds.length > 0) {
          const { data: opportunities, error: oppError } = await supabase
            .from('incubation_opportunities')
            .select(`id, program_name, facilitator_id, facilitator_code`)
            .in('id', opportunityIds);
          
          if (!oppError && opportunities) {
            console.log('📋 Opportunities fetched:', opportunities.length);
            console.log('📋 Sample opportunity data:', opportunities.slice(0, 1).map(o => ({
              id: o.id,
              program_name: o.program_name,
              facilitator_id: o.facilitator_id,
              facilitator_code: o.facilitator_code
            })));
            
            // Extract unique facilitator IDs
            const facilitatorIds = opportunities
              .map(opp => opp.facilitator_id)
              .filter(Boolean);
            
            console.log('🔑 Extracted facilitator IDs to fetch:', facilitatorIds);
            
            let facilitatorProfiles: { [key: string]: any } = {};
            
            // If we have facilitator IDs, try to fetch their profiles
            if (facilitatorIds.length > 0) {
              console.log('🔍 Attempting to fetch profiles for facilitator IDs:', facilitatorIds);
              
              try {
                // Fetch from user_profiles which has center_name and facilitator_code
                // Note: facilitator_id in incubation_opportunities stores auth_user_id, not user_profiles.id
                const { data: profiles, error: profileError } = await supabase
                  .from('user_profiles')
                  .select('id, auth_user_id, center_name, facilitator_code, firm_name, email')
                  .in('auth_user_id', facilitatorIds);
                
                console.log('📥 User profiles query result:', {
                  error: profileError,
                  profilesCount: profiles?.length,
                  profiles: profiles?.map(p => ({
                    id: p.id,
                    center_name: p.center_name,
                    facilitator_code: p.facilitator_code
                  }))
                });
                
                if (profileError) {
                  console.warn('⚠️ Error fetching user_profiles:', profileError);
                  // Continue without profiles - will use fallback names
                } else if (profiles) {
                  profiles.forEach(profile => {
                    // Store by auth_user_id since that's what facilitator_id contains
                    facilitatorProfiles[profile.auth_user_id] = profile;
                  });
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log('👤 Facilitator Profiles Fetched:', {
                      count: profiles.length,
                      sample: profiles.slice(0, 2).map(p => ({
                        id: p.id,
                        center_name: p.center_name,
                        facilitator_code: p.facilitator_code,
                        firm_name: p.firm_name
                      }))
                    });
                  }
                }
              } catch (profileErr) {
                console.error('Exception fetching facilitator profiles:', profileErr);
              }
            }
            
            // Enrich allApplications with opportunity data and facilitator profiles
            allApplications = allApplications.map(app => {
              const opportunity = opportunities.find(opp => opp.id === app.opportunity_id);
              if (opportunity) {
                const facilitatorProfile = facilitatorProfiles[opportunity.facilitator_id];
                console.log('🔗 Matching for opportunity:', {
                  opportunity_id: opportunity.id,
                  facilitator_id: opportunity.facilitator_id,
                  profile_found: !!facilitatorProfile,
                  profile_data: facilitatorProfile ? {
                    center_name: facilitatorProfile.center_name,
                    facilitator_code: facilitatorProfile.facilitator_code
                  } : null
                });
                return {
                  ...app,
                  incubation_opportunities: {
                    ...opportunity,
                    facilitator_profile: facilitatorProfile || null
                  }
                };
              }
              return app;
            });
          }
        }
        
      } catch (err) {
        console.error('Failed to fetch opportunity applications:', err);
        allApplications = [];
      }
      
      // Initialize facilitatorData to store enriched opportunity information
      let facilitatorData: { [key: string]: any } = {};
      
      // Note: incubation_applications table doesn't exist (404 error)
      // All applications are in opportunity_applications table
      
      // Enrich applications with facilitator data from the incubation_opportunities table joins
      const opportunityIds = allApplications.map(app => app.incubation_opportunities?.id).filter(Boolean);
      if (opportunityIds.length > 0) {
        allApplications.forEach(app => {
          if (app.incubation_opportunities) {
            facilitatorData[app.opportunity_id] = app.incubation_opportunities;
          }
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 Facilitator Data Enrichment:', {
            totalApplications: allApplications.length,
            applicationsWithFacilitatorData: Object.keys(facilitatorData).length,
            sampleFacilitatorInfo: Object.entries(facilitatorData).slice(0, 1).reduce((acc, [id, info]) => ({
              ...acc,
              [id]: {
                program_name: info.program_name,
                opportunity_facilitator_id: info.facilitator_id,
                opportunity_facilitator_code: info.facilitator_code,
                facilitator_profile_center_name: info.facilitator_profile?.center_name,
                facilitator_profile_firm: info.facilitator_profile?.firm_name,
                facilitator_profile_code: info.facilitator_profile?.facilitator_code,
                facilitator_profile_email: info.facilitator_profile?.email,
                user_name: info.user?.name
              }
            }), {})
          });
        }
      }
      
      // Identify applications with an active diligence workflow FIRST
      const diligenceApplications = allApplications.filter((app: any) => {
        const status = typeof app?.diligence_status === 'string' 
          ? app.diligence_status.toLowerCase() 
          : null;
        return status === 'requested' || status === 'approved';
      });
      
      // Then filter incubation applications, EXCLUDING any with active diligence workflows
      const diligenceAppIds = new Set(diligenceApplications.map(app => app.id));
      const incubationApplications = allApplications.filter(app => {
        const isNotWithdrawn = app.status !== 'withdrawn';
        const isNotInDiligence = !diligenceAppIds.has(app.id);
        return isNotWithdrawn && isNotInDiligence;
      });
      
      if (process.env.NODE_ENV === 'development' && diligenceApplications.length > 0) {
        console.log('✅ DILIGENCE FLOW: Found diligence applications:', diligenceApplications.length);
      }
      
      // Transform incubation applications into OfferReceived format
      const incubationOffers: OfferReceived[] = incubationApplications.map((app: any) => {
        // Use the fetched facilitator data to get facilitator name
        const facilitatorInfo = facilitatorData[app.opportunity_id];
        
        // Priority: center_name > firm_name > facilitator_code > program_name
        const fromName = facilitatorInfo?.facilitator_profile?.center_name || 
                        facilitatorInfo?.facilitator_profile?.firm_name ||
                        facilitatorInfo?.facilitator_profile?.facilitator_code ||
                        facilitatorInfo?.user?.name || 
                        facilitatorInfo?.facilitator_code ||
                        facilitatorInfo?.program_name ||
                        `Application ${app.id.slice(0, 8)}`;
        
        // Get program name from facilitator data
        const programName = facilitatorInfo?.program_name || 
                           'Incubation Program';
        
        // Get facilitator code from profile or fallback to opportunity field
        const facilitatorCode = facilitatorInfo?.facilitator_profile?.facilitator_code ||
                               facilitatorInfo?.facilitator_code ||
                               app.id.toString();
        
        return {
          id: `incubation_${app.id}`,
          from: fromName,
          type: 'Incubation' as const,
          offerDetails: app.status === 'accepted' ? 'Accepted into Program' : `Incubation program: ${programName}`,
          status: app.status as 'pending' | 'accepted' | 'rejected',
          code: facilitatorCode,
          agreementUrl: app.agreement_url,
          contractUrl: app.contract_url,
          applicationId: app.id,
          createdAt: app.created_at,
          programName: programName,
          facilitatorName: fromName
        };
      });
      
      // Transform due diligence applications into OfferReceived format
      const diligenceOffers: OfferReceived[] = diligenceApplications.map((app: any) => {
        // Use the fetched facilitator data to get facilitator name
        const facilitatorInfo = facilitatorData[app.opportunity_id];
        
        // Priority: center_name > firm_name > facilitator_code > program_name
        const fromName = facilitatorInfo?.facilitator_profile?.center_name || 
                        facilitatorInfo?.facilitator_profile?.firm_name ||
                        facilitatorInfo?.facilitator_profile?.facilitator_code ||
                        facilitatorInfo?.user?.name || 
                        facilitatorInfo?.facilitator_code ||
                        facilitatorInfo?.program_name ||
                        'Unknown Organization';
        
        // Get facilitator code from profile or fallback to opportunity field
        const facilitatorCode = facilitatorInfo?.facilitator_profile?.facilitator_code ||
                               facilitatorInfo?.facilitator_code ||
                               app.id.toString();
        
        return {
          id: `diligence_${app.id}`,
          from: fromName,
          type: 'Due Diligence' as const,
          offerDetails: app.diligence_status === 'requested' ? 'Due diligence access requested' : 'Due diligence access granted',
          status: app.diligence_status === 'approved' ? 'accepted' : (app.diligence_status === 'requested' ? 'pending' : 'rejected'),
          code: facilitatorCode,
          agreementUrl: app.agreement_url,
          applicationId: app.id,
          createdAt: app.created_at,
          diligenceUrls: app.diligence_urls || []
        };
      });

      // Transform investment offers into OfferReceived format
      const investmentOffersFormatted: OfferReceived[] = (investmentOffers || []).map((offer: any) => {
        // Get investor name from the offer data
        const investorName = offer.investorName || 
                           offer.investor?.name || 
                           offer.investor?.company_name || 
                           offer.investorEmail || 
                           'Unknown Investor';
        
        // Ensure we have valid numbers for amount and equity
        const amount = Number(offer.offerAmount || offer.amount) || 0;
        const equityPercentage = Number(offer.equityPercentage || offer.equity_percentage) || 0;
        
        // Get currency from offer or use startup currency
        const offerCurrency = (offer as any).currency || startupCurrency || 'USD';
        
        // Map stage to status
        // IMPORTANT: Check status first before checking stage, as rejected offers can be at stage 3
        let mappedStatus: 'pending' | 'accepted' | 'rejected' = 'pending';
        const offerStage = (offer as any).stage || 1;
        const offerStatus = offer.status as string || 'pending';
        const investorAdvisorStatus = (offer as any).investor_advisor_approval_status;
        const startupAdvisorStatus = (offer as any).startup_advisor_approval_status;
        
        // Check if offer is rejected first (can happen at any stage)
        // Check advisor rejections first
        if (investorAdvisorStatus === 'rejected') {
          mappedStatus = 'rejected';
        } else if (startupAdvisorStatus === 'rejected') {
          mappedStatus = 'rejected';
        } else if (offerStatus === 'rejected') {
          mappedStatus = 'rejected';
        } else if (offerStage === 4) {
          mappedStatus = 'accepted';
        } else if (offerStage === 1 || offerStage === 2 || offerStage === 3) {
          mappedStatus = 'pending';
        } else {
          mappedStatus = offer.status as 'pending' | 'accepted' | 'rejected' || 'pending';
        }
        
        // Check if this investor is seeking co-investment
        const isSeekingCoInvestment = offer.wants_co_investment || offer.seeking_co_investment || false;
        const remainingAmount = isSeekingCoInvestment ? (offer.total_investment_amount || offer.investmentValue || 0) - amount : 0;
        
        return {
          id: `investment_${offer.id}`,
          from: investorName,
          type: 'Investment' as const,
          offerDetails: `${formatCurrency(amount, offerCurrency)} for ${equityPercentage}% equity${isSeekingCoInvestment ? ` (Seeking co-investors for remaining ${formatCurrency(remainingAmount, offerCurrency)})` : ''}`,
          status: mappedStatus,
          code: offer.id.toString(),
          createdAt: offer.createdAt,
          isInvestmentOffer: true,
          investmentOfferId: offer.id,
          startupScoutingFee: Number(offer.startup_scouting_fee_paid || offer.startup_scouting_fee) || 0,
          investorScoutingFee: Number(offer.investor_scouting_fee_paid || offer.investor_scouting_fee) || 0,
          contactDetailsRevealed: offer.contact_details_revealed || false,
          isSeekingCoInvestment,
          remainingCoInvestmentAmount: remainingAmount
        };
      });
      
      // Load and format co-investment opportunities for this startup
      // IMPORTANT: This function already filters by startup_id and applies visibility filtering
      const startupCoInvestmentOpportunities = await databaseInvestmentService.getCoInvestmentOpportunitiesForStartup(startup.id);
      
      const coInvestmentOpportunitiesFormatted: OfferReceived[] = startupCoInvestmentOpportunities.map((opp: any) => {
        // Get stage status display
        const stage = opp.stage || 1;
        let stageStatus = '';
        let stageColor = 'bg-blue-100 text-blue-800';
        
        if (stage === 1) {
          stageStatus = opp.lead_investor_advisor_approval_status === 'pending' 
            ? '🔵 Stage 1: Lead Investor Advisor Approval' 
            : '⚡ Stage 1: Auto-Processing';
        } else if (stage === 2) {
          stageStatus = opp.startup_advisor_approval_status === 'pending'
            ? '🟣 Stage 2: Startup Advisor Approval'
            : '⚡ Stage 2: Auto-Processing';
        } else if (stage === 3) {
          stageStatus = '✅ Stage 3: Ready for Startup Review';
          stageColor = 'bg-green-100 text-green-800';
        } else if (stage === 4) {
          stageStatus = '🎉 Stage 4: Approved';
          stageColor = 'bg-emerald-100 text-emerald-800';
        }
        
        return {
          id: `co_investment_opp_${opp.id}`,
          from: opp.listed_by_user?.name || 'Lead Investor',
          type: 'Investment' as const,
          offerDetails: `Co-investment opportunity: ${formatCurrency(opp.minimum_co_investment, startupCurrency)} - ${formatCurrency(opp.maximum_co_investment, startupCurrency)} available`,
          status: opp.startup_approval_status === 'approved' ? 'accepted' : 
                  opp.startup_approval_status === 'rejected' ? 'rejected' : 'pending',
          code: `co-opp-${opp.id}`,
          createdAt: opp.created_at,
          isCoInvestmentOpportunity: true,
          coInvestmentOpportunityId: opp.id,
          description: opp.description,
          totalInvestmentAmount: opp.investment_amount,
          equityPercentage: opp.equity_percentage,
          stage: stage,
          stageStatus: stageStatus,
          stageColor: stageColor
        };
      });

      // Load co-investment OFFERS (actual offers made by investors on co-investment opportunities)
      // These are offers that need startup approval after passing Investor Advisor and Lead Investor approval
      // IMPORTANT: Only show offers that have passed Investor Advisor and Lead Investor approval
      let coInvestmentOffersFormatted: OfferReceived[] = [];
      try {
        // Fetch co-investment offers that have passed investor advisor and lead investor approval
        // Only show offers that are ready for startup approval or already accepted/rejected by startup
        const { data: coInvestmentOffersData, error: coInvestmentOffersError } = await supabase
          .from('co_investment_offers')
          .select(`
            *,
            investor_id,
            startup:startups(id, name, sector, currency),
            co_investment_opportunity:co_investment_opportunities(id, investment_amount, equity_percentage)
          `)
          .eq('startup_id', startup.id)
          // Show offers where investor advisor has approved OR where investor has no advisor (not_required)
          .in('investor_advisor_approval_status', ['approved', 'not_required'])
          // Only show offers where lead investor has approved
          .eq('lead_investor_approval_status', 'approved')
          // Only show offers that are ready for startup approval or already processed by startup
          // Status should be pending_startup_approval (ready for startup), accepted, or rejected (startup already responded)
          .in('status', ['pending_startup_approval', 'accepted', 'rejected'])
          .order('created_at', { ascending: false });

        if (!coInvestmentOffersError) {
          coInvestmentOffersFormatted = (coInvestmentOffersData || []).map((offer: any) => {
            const investorName = offer.investor?.name || offer.investor_name || offer.investor_email || 'Unknown Investor';
            const amount = Number(offer.offer_amount) || 0;
            const equityPercentage = Number(offer.equity_percentage) || 0;
            const offerCurrency = offer.currency || offer.startup?.currency || startupCurrency || 'USD';

            return {
              id: `co_investment_offer_${offer.id}`,
              from: investorName,
              type: 'Investment' as const,
              offerDetails: `${formatCurrency(amount, offerCurrency)} for ${equityPercentage}% equity (Co-investment offer)`,
              status: offer.startup_approval_status === 'approved' ? 'accepted' : 
                      offer.startup_approval_status === 'rejected' ? 'rejected' : 'pending',
              code: `co-offer-${offer.id}`,
              createdAt: offer.created_at,
              isInvestmentOffer: true,
              investmentOfferId: offer.id, // Use offer.id for handling
              isCoInvestmentOffer: true, // Flag to identify co-investment offers
              coInvestmentOfferId: offer.id, // ID from co_investment_offers table
              coInvestmentOpportunityId: offer.co_investment_opportunity_id, // Parent opportunity ID
              startupScoutingFee: 0,
              investorScoutingFee: 0,
              contactDetailsRevealed: offer.contact_details_revealed || false
            };
          });
        }
      } catch (err) {
        console.error('❌ Error loading co-investment offers:', err);
      }
      
      // Store facilitator diligence applications separately (don't include in offers)
      setFacilitatorDiligenceRequests(diligenceApplications);

      // Store incubation programs separately for dedicated Incubation Programs section
      // Load Form 2 requests for each incubation application
      const incubationProgramsWithForm2 = await Promise.all(
        incubationApplications.map(async (app: any) => {
          const facilitatorInfo = facilitatorData[app.opportunity_id];
          const programName = facilitatorInfo?.program_name || 'Incubation Program';
          
          // DEBUG: Log facilitator info
          console.log(`🔍 APP ${app.id}: facilitator_id="${facilitatorInfo?.facilitator_id}" program_name="${programName}"`);
          
          // Extract facilitator name with better fallback logic
          let facilitatorName = 'Unknown Facilitator';
          
          // Try multiple sources for facilitator name
          if (facilitatorInfo?.user?.name) {
            facilitatorName = facilitatorInfo.user.name;
          } else if (facilitatorInfo?.facilitator_profile?.center_name) {
            // Use center_name from facilitator profile
            facilitatorName = facilitatorInfo.facilitator_profile.center_name;
          } else if (facilitatorInfo?.facilitator_profile?.firm_name) {
            // Fallback to firm_name
            facilitatorName = facilitatorInfo.facilitator_profile.firm_name;
          } else if (facilitatorInfo?.center_name) {
            // Direct center_name from opportunity data
            facilitatorName = facilitatorInfo.center_name;
          } else if (facilitatorInfo?.facilitator_code) {
            // If facilitator_code exists, use it
            facilitatorName = facilitatorInfo.facilitator_code;
          } else if (facilitatorInfo?.program_name) {
            // Use program name as last resort - extract organization name from it
            // e.g., "Investments by Track My Startup, real investor access, zero retainer" → "Track My Startup"
            const programName = facilitatorInfo.program_name;
            const matches = programName.match(/(?:by\s+)?([A-Za-z\s&,\.]+?)(?:\s*,|$)/);
            if (matches && matches[1]) {
              facilitatorName = matches[1].trim();
            } else {
              facilitatorName = programName.split(',')[0].trim();
            }
          }
          
          // Check if Form 2 has been requested
          const form2Data = {
            requested: app.form2_requested || false,
            status: app.form2_status || 'not_requested',
            requestedAt: app.form2_requested_at,
            submittedAt: app.form2_submitted_at
          };
          
          const facilitatorId = facilitatorInfo?.facilitator_id || facilitatorInfo?.user?.id || '';
          
          // DEBUG: Log the extracted values
          console.log(`✅ STARTUP PROGRAM: facilitatorId="${facilitatorId}" programName="${programName}"`);
          
          return {
            id: app.id,
            applicationId: app.id,
            programName: programName,
            facilitatorName: facilitatorName,
            facilitatorId: facilitatorId,
            facilitatorCode: facilitatorInfo?.facilitator_profile?.facilitator_code || facilitatorInfo?.facilitator_code || '',
            status: app.status as 'pending' | 'accepted' | 'rejected',
            createdAt: app.created_at,
            agreementUrl: app.agreement_url,
            contractUrl: app.contract_url,
            isShortlisted: app.is_shortlisted || false,
            form2: form2Data,
            opportunityId: app.opportunity_id
          };
        })
      );
      
      setIncubationPrograms(incubationProgramsWithForm2);
      
      if (process.env.NODE_ENV === 'development' && incubationProgramsWithForm2.length > 0) {
        console.log('🎯 Incubation Programs Mapped:', incubationProgramsWithForm2.map(prog => ({
          programName: prog.programName,
          facilitatorName: prog.facilitatorName,
          facilitatorCode: prog.facilitatorCode,
          status: prog.status
        })));
      }
      
      // Filter Form 2 requests that are pending submission
      const pendingForm2 = incubationProgramsWithForm2.filter(
        prog => prog.form2.requested && prog.form2.status === 'pending'
      );
      setForm2Requests(pendingForm2);

      // Combine all offers - only include properly resolved offers (EXCLUDE diligenceOffers and incubationOffers)
      // Incubation programs now have their own section
      const allOffers = [...investmentOffersFormatted, ...coInvestmentOpportunitiesFormatted, ...coInvestmentOffersFormatted];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📦 Combined offers:', {
          incubationPrograms: incubationProgramsWithForm2.length,
          form2Pending: pendingForm2.length,
          investment: investmentOffersFormatted.length,
          coInvestmentOpp: coInvestmentOpportunitiesFormatted.length,
          coInvestmentOffers: coInvestmentOffersFormatted.length,
          diligence: diligenceApplications.length,
          totalOffers: allOffers.length
        });
      }
      
      // If no offers found, show a debug message
      if (allOffers.length === 0 && incubationProgramsWithForm2.length === 0 && process.env.NODE_ENV === 'development') {
        console.log('⚠️ No offers or programs found for startup:', startup.id);
        console.log('⚠️ Investment offers from service:', investmentOffers);
        console.log('⚠️ All applications from database:', allApplications);
      }
      
      setOffersReceived(allOffers);
      
    } catch (err) {
      console.error('Error loading offers received:', err);
      setOffersReceived([]);
    } finally {
      isLoadingOffersRef.current = false;
    }
  };

  // Handler functions for offers
  const handleAcceptDueDiligence = async (offer: OfferReceived) => {
    try {
      if (!offer.applicationId) return;
      // Approve diligence: set diligence_status = 'approved'
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ diligence_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', offer.applicationId);
      if (error) {
        console.error('Error approving due diligence:', error);
        messageService.error(
          'Diligence Failed',
          'Failed to accept due diligence request.'
        );
        return;
      }

      await loadOffersReceived();
      messageService.success(
        'Diligence Accepted',
        'Due diligence request accepted. Access has been granted.',
        3000
      );
    } catch (e) {
      console.error('Failed to accept due diligence:', e);
      messageService.error(
        'Diligence Failed',
        'Failed to accept due diligence request.'
      );
    }
  };

  // Handler functions for facilitator diligence requests
  const handleAcceptFacilitatorDiligence = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ diligence_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', applicationId);
      
      if (error) {
        console.error('Error approving facilitator diligence:', error);
        messageService.error(
          'Approval Failed',
          'Failed to approve due diligence request.'
        );
        return;
      }
      
      // Reload data
      await loadOffersReceived();
      messageService.success(
        'Diligence Approved',
        'Facilitator has been granted access to your data.',
        3000
      );
    } catch (e) {
      console.error('Failed to approve facilitator diligence:', e);
      messageService.error(
        'Approval Failed',
        'Failed to approve due diligence request.'
      );
    }
  };

  const handleRejectFacilitatorDiligence = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ diligence_status: 'none', updated_at: new Date().toISOString() })
        .eq('id', applicationId);
      
      if (error) {
        console.error('Error rejecting facilitator diligence:', error);
        messageService.error(
          'Rejection Failed',
          'Failed to reject due diligence request.'
        );
        return;
      }
      
      // Reload data
      await loadOffersReceived();
      messageService.success(
        'Request Rejected',
        'Due diligence request has been rejected.',
        3000
      );
    } catch (e) {
      console.error('Failed to reject facilitator diligence:', e);
      messageService.error(
        'Rejection Failed',
        'Failed to reject due diligence request.'
      );
    }
  };

  const handleRevokeFacilitatorDiligence = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ diligence_status: 'none', updated_at: new Date().toISOString() })
        .eq('id', applicationId);
      
      if (error) {
        console.error('Error revoking facilitator diligence:', error);
        messageService.error(
          'Revocation Failed',
          'Failed to revoke access.'
        );
        return;
      }
      
      // Reload data
      await loadOffersReceived();
      messageService.success(
        'Access Revoked',
        'Facilitator access has been revoked.',
        3000
      );
    } catch (e) {
      console.error('Failed to revoke facilitator diligence:', e);
      messageService.error(
        'Revocation Failed',
        'Failed to revoke access.'
      );
    }
  };

  // Approve/Reject due diligence request coming from investors (panel actions)
  const approveDiligenceRequest = async (requestId: string) => {
    const ok = await paymentService.approveDueDiligence(requestId);
    if (ok) {
      setDiligenceRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'completed', completed_at: new Date().toISOString() } : r));
      messageService.success('Due Diligence Approved', 'Investor has been granted access.', 3000);
    } else {
      messageService.error('Approval Failed', 'Could not approve due diligence request.');
    }
  };

  const rejectDiligenceRequest = async (requestId: string) => {
    const ok = await paymentService.rejectDueDiligence(requestId);
    if (ok) {
      setDiligenceRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'failed' } : r));
      messageService.success('Request Rejected', 'Due diligence request rejected.', 3000);
    } else {
      messageService.error('Rejection Failed', 'Could not reject the request.');
    }
  };

  // Revoke due diligence access - stops access and requires new request
  const revokeDiligenceAccess = async (requestId: string) => {
    const ok = await paymentService.revokeDueDiligenceAccess(requestId);
    if (ok) {
      setDiligenceRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'revoked' } : r));
      messageService.success('Access Revoked', 'Investor will need to request access again to re-gain permissions.', 3000);
    } else {
      messageService.error('Revoke Failed', 'Could not revoke due diligence access.');
    }
  };

  const handleDownloadAgreement = async (agreementUrl: string) => {
    try {
      console.log('📥 Downloading agreement from:', agreementUrl);
      
      const link = document.createElement('a');
      link.href = agreementUrl;
      link.download = `facilitation-agreement-${Date.now()}.pdf`;
      link.target = '_blank';
      rel: 'noopener noreferrer';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Agreement download initiated');
      }
    } catch (err) {
      console.error('Error downloading agreement:', err);
      messageService.error(
        'Download Failed',
        'Failed to download agreement. Please try again.'
      );
    }
  };

  const handleOpenTrackingQuestions = async (facilitatorId: string, programName: string, facilitatorName: string) => {
    setIsLoadingTrackingQuestions(true);
    setSelectedProgramForTracking({ facilitatorId, programName, facilitatorName });
    setIsTrackingQuestionsModalOpen(true);

    try {
      // DEBUG: Log the parameters being passed to the service
      console.log(`🎯 TRACKING QUESTIONS HANDLER - facilitatorId: "${facilitatorId}" | programName: "${programName}" | facilitatorName: "${facilitatorName}"`);

      // Get configured questions for this program
      const questions = await questionBankService.getProgramTrackingQuestions(facilitatorId, programName);
      
      // DEBUG: Log what we got back
      console.log(`✅ RECEIVED ${questions?.length || 0} QUESTIONS from database for facilitatorId="${facilitatorId}" programName="${programName}"`);

      setTrackingQuestions(questions);

      // Get existing responses
      const responses = await questionBankService.getProgramTrackingResponses(
        startup.id,
        facilitatorId,
        programName
      );
      
      // DEBUG: Log responses
      console.log(`✅ RECEIVED ${responses?.length || 0} RESPONSES from database`);
      
      const responseMap = new Map<string, string>();
      responses.forEach(r => {
        responseMap.set(r.questionId, r.answerText);
      });
      setTrackingResponses(responseMap);
    } catch (error) {
      console.error('❌ Error loading tracking questions:', error);
      messageService.error('Error', 'Failed to load tracking questions.');
      setTrackingQuestions([]);
      setTrackingResponses(new Map());
    } finally {
      setIsLoadingTrackingQuestions(false);
    }
  };

  const handleSaveTrackingResponses = async () => {
    if (!selectedProgramForTracking) return;

    setIsSavingTrackingResponses(true);
    try {
      // Validate required questions are answered
      const unansweredRequired = trackingQuestions.filter(q => 
        q.isRequired && !trackingResponses.get(q.questionId)?.trim()
      );

      if (unansweredRequired.length > 0) {
        messageService.warning(
          'Required Questions',
          `Please answer all required questions (${unansweredRequired.length} remaining).`
        );
        return;
      }

      // Save all responses
      const savePromises = Array.from(trackingResponses.entries()).map(
        ([questionId, answerText]) => {
          if (!answerText.trim()) return Promise.resolve();
          
          return questionBankService.saveProgramTrackingResponse(
            startup.id,
            selectedProgramForTracking.facilitatorId,
            selectedProgramForTracking.programName,
            questionId,
            answerText
          );
        }
      );

      await Promise.all(savePromises);

      messageService.success(
        'Responses Saved',
        'Your tracking responses have been saved successfully.'
      );
      setIsTrackingQuestionsModalOpen(false);
    } catch (error) {
      console.error('Error saving tracking responses:', error);
      messageService.error('Error', 'Failed to save responses. Please try again.');
    } finally {
      setIsSavingTrackingResponses(false);
    }
  };

  const handleAcceptInvestmentOffer = async (offer: OfferReceived) => {
    // Handle co-investment offers (actual offers made by investors)
    if (offer.isCoInvestmentOffer && offer.coInvestmentOfferId) {
      return handleAcceptCoInvestmentOffer(offer);
    }
    
    // Handle co-investment opportunities
    if (offer.isCoInvestmentOpportunity && offer.coInvestmentOpportunityId) {
      return handleAcceptCoInvestment(offer);
    }
    
    if (!offer.investmentOfferId) return;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('💰 Accepting investment offer:', offer.investmentOfferId);
      }
      
      // Use the proper database function that updates both status and stage
      const result = await databaseInvestmentService.approveStartupOffer(offer.investmentOfferId, 'approve');
      
      messageService.success(
        'Offer Accepted',
        'Investment offer accepted! Contact details will be revealed based on advisor assignment.',
        3000
      );
      
      await loadOffersReceived();
      
    } catch (err) {
      console.error('Error accepting investment offer:', err);
      messageService.error(
        'Acceptance Failed',
        'Failed to accept investment offer. Please try again.'
      );
    }
  };

  const handleAcceptCoInvestment = async (offer: OfferReceived) => {
    if (!offer.coInvestmentOpportunityId) return;
    
    try {
      console.log('💰 Accepting co-investment opportunity:', offer.coInvestmentOpportunityId);
      
      // Use the proper database function that updates both status and stage
      const result = await databaseInvestmentService.approveStartupCoInvestment(offer.coInvestmentOpportunityId, 'approve');
      console.log('✅ Co-investment opportunity accepted:', result);
      
      messageService.success(
        'Co-Investment Accepted',
        'Co-investment opportunity accepted successfully!',
        3000
      );
      
      await loadOffersReceived();
      
    } catch (err) {
      console.error('Error accepting co-investment opportunity:', err);
      messageService.error(
        'Acceptance Failed',
        'Failed to accept co-investment opportunity. Please try again.'
      );
    }
  };

  const handleRejectInvestmentOffer = async (offer: OfferReceived) => {
    // Handle co-investment offers (actual offers made by investors)
    if (offer.isCoInvestmentOffer && offer.coInvestmentOfferId) {
      return handleRejectCoInvestmentOffer(offer);
    }
    
    // Handle co-investment opportunities
    if (offer.isCoInvestmentOpportunity && offer.coInvestmentOpportunityId) {
      return handleRejectCoInvestment(offer);
    }
    
    if (!offer.investmentOfferId) return;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('💰 Rejecting investment offer:', offer.investmentOfferId);
      }
      
      // Use the proper database function that updates both status and stage
      const result = await databaseInvestmentService.approveStartupOffer(offer.investmentOfferId, 'reject');
      
      await loadOffersReceived();
      
      messageService.success(
        'Offer Rejected',
        'Investment offer rejected successfully.',
        3000
      );
    } catch (err) {
      console.error('Error rejecting investment offer:', err);
      messageService.error(
        'Rejection Failed',
        'Failed to reject investment offer. Please try again.'
      );
    }
  };

  // Fetch co-investment offer details
  const handleViewCoInvestmentDetails = async (offer: OfferReceived) => {
    if (!offer.coInvestmentOfferId) return;
    
    setIsLoadingDetails(true);
    setIsCoInvestmentDetailsModalOpen(true);
    
    try {
      console.log('🔍 Fetching co-investment offer details:', offer.coInvestmentOfferId);
      
      // Fetch the co-investment offer (without joins first to avoid RLS issues)
      // We'll fetch related data separately using RPC functions
      const { data: offerData, error: offerError } = await supabase
        .from('co_investment_offers')
        .select('*')
        .eq('id', offer.coInvestmentOfferId)
        .single();
      
      if (offerError || !offerData) {
        console.error('❌ Error fetching co-investment offer details:', offerError);
        throw offerError || new Error('Co-investment offer not found');
      }
      
      console.log('✅ Co-investment offer details fetched:', offerData);
      
      // Extract data from offer (using stored fields)
      const investorData = {
        id: offerData.investor_id,
        name: offerData.investor_name,
        email: offerData.investor_email,
        company_name: null
      };
      
      const startupData = {
        id: offerData.startup_id,
        name: offerData.startup_name,
        currency: offerData.currency || startupCurrency || 'USD'
      };
      
      // Fetch opportunity data separately
      let opportunityData = null;
      let leadInvestorData = null;
      
      if (offerData.co_investment_opportunity_id) {
        console.log('🔍 Fetching co-investment opportunity:', offerData.co_investment_opportunity_id);
        const { data: opportunity, error: opportunityError } = await supabase
          .from('co_investment_opportunities')
          .select('id, investment_amount, equity_percentage, minimum_co_investment, maximum_co_investment, listed_by_user_id, listed_by_user_name, listed_by_user_email')
          .eq('id', offerData.co_investment_opportunity_id)
          .single();
        
        if (!opportunityError && opportunity) {
          opportunityData = opportunity;
          console.log('✅ Opportunity fetched:', opportunity);
          
          // Use stored lead investor info (safer - no RLS bypass needed)
          // First check if stored fields exist (from ADD_LEAD_INVESTOR_FIELDS_TO_CO_INVESTMENT_OPPORTUNITIES.sql)
          if (opportunity.listed_by_user_name || opportunity.listed_by_user_email) {
            leadInvestorData = {
              name: opportunity.listed_by_user_name,
              email: opportunity.listed_by_user_email,
              company_name: opportunity.listed_by_user_name // Use name as company name fallback
            };
            console.log('✅ Lead investor info from stored fields:', leadInvestorData);
          } else if (opportunity.listed_by_user_id) {
            // Fallback: Try RPC function if stored fields don't exist
            console.log('🔍 Stored fields not available, trying RPC function:', opportunity.listed_by_user_id);
            try {
              const { data: leadInvestorRpc, error: rpcError } = await supabase.rpc('get_user_public_info', {
                p_user_id: String(opportunity.listed_by_user_id)
              });
              
              if (!rpcError && leadInvestorRpc) {
                if (typeof leadInvestorRpc === 'string') {
                  try {
                    leadInvestorData = JSON.parse(leadInvestorRpc);
                  } catch (e) {
                    leadInvestorData = leadInvestorRpc;
                  }
                } else {
                  leadInvestorData = leadInvestorRpc;
                }
                console.log('✅ Lead investor fetched via RPC:', leadInvestorData);
              } else {
                console.warn('⚠️ RPC function failed:', rpcError);
              }
            } catch (rpcErr) {
              console.warn('⚠️ RPC function not available:', rpcErr);
            }
          }
        } else {
          console.warn('⚠️ Error fetching opportunity:', opportunityError);
        }
      }
      
      // Calculate amounts
      const totalInvestment = Number(opportunityData?.investment_amount) || 0;
      const maximumCoInvestment = Number(opportunityData?.maximum_co_investment) || 0;
      const leadInvestorInvested = Math.max(totalInvestment - maximumCoInvestment, 0);
      const newOfferAmount = Number(offerData.offer_amount) || 0;
      const newEquityPercentage = Number(offerData.equity_percentage) || 0;
      const totalEquityPercentage = Number(opportunityData?.equity_percentage) || 0;
      
      // Calculate equity allocation
      const leadInvestorEquity = totalInvestment > 0 && totalEquityPercentage > 0 
        ? (totalEquityPercentage * (leadInvestorInvested / totalInvestment))
        : 0;
      
      // Combine all data
      // Set lead investor data at both nested and top level for easier access
      const finalCoInvestmentDetails: any = {
        ...offerData,
        investor: investorData,
        startup: startupData,
        co_investment_opportunity: opportunityData ? {
          ...opportunityData,
          listed_by_user: leadInvestorData
        } : null,
        // Also add lead investor data at top level for easier access
        leadInvestor: leadInvestorData,
        leadInvestorInvested,
        remainingForCoInvestment: maximumCoInvestment,
        newOfferAmount,
        newEquityPercentage,
        totalInvestment,
        totalEquityPercentage,
        leadInvestorEquity,
        currency: offerData.currency || startupData?.currency || startupCurrency || 'USD'
      };
      
      console.log('📦 Final co-investment details:', finalCoInvestmentDetails);
      console.log('👤 Lead investor data:', leadInvestorData);
      console.log('📊 Opportunity data:', opportunityData);
      
      setCoInvestmentDetails(finalCoInvestmentDetails);
      
    } catch (err) {
      console.error('Error loading co-investment details:', err);
      messageService.error(
        'Error Loading Details',
        'Failed to load co-investment offer details. Please try again.'
      );
      setIsCoInvestmentDetailsModalOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAcceptCoInvestmentOffer = async (offer: OfferReceived) => {
    if (!offer.coInvestmentOfferId) return;
    
    try {
      console.log('💰 Accepting co-investment offer:', offer.coInvestmentOfferId);
      
      // Use the proper database function to approve co-investment offer
      const { data, error } = await supabase.rpc('approve_co_investment_offer_startup', {
        p_offer_id: offer.coInvestmentOfferId,
        p_approval_action: 'approve'
      });

      if (error) {
        console.error('❌ Error approving co-investment offer:', error);
        throw error;
      }
      
      messageService.success(
        'Co-Investment Offer Accepted',
        'Co-investment offer accepted successfully!',
        3000
      );
      
      await loadOffersReceived();
      
    } catch (err) {
      console.error('Error accepting co-investment offer:', err);
      messageService.error(
        'Acceptance Failed',
        'Failed to accept co-investment offer. Please try again.'
      );
    }
  };

  const handleRejectCoInvestmentOffer = async (offer: OfferReceived) => {
    if (!offer.coInvestmentOfferId) return;
    
    try {
      console.log('💰 Rejecting co-investment offer:', offer.coInvestmentOfferId);
      
      // Use the proper database function to reject co-investment offer
      const { data, error } = await supabase.rpc('approve_co_investment_offer_startup', {
        p_offer_id: offer.coInvestmentOfferId,
        p_approval_action: 'reject'
      });

      if (error) {
        console.error('❌ Error rejecting co-investment offer:', error);
        throw error;
      }
      
      messageService.success(
        'Co-Investment Offer Rejected',
        'Co-investment offer rejected successfully.',
        3000
      );
      
      await loadOffersReceived();
      
    } catch (err) {
      console.error('Error rejecting co-investment offer:', err);
      messageService.error(
        'Rejection Failed',
        'Failed to reject co-investment offer. Please try again.'
      );
    }
  };

  const handleRejectCoInvestment = async (offer: OfferReceived) => {
    if (!offer.coInvestmentOpportunityId) return;
    
    try {
      console.log('💰 Rejecting co-investment opportunity:', offer.coInvestmentOpportunityId);
      
      // Use the proper database function that updates both status and stage
      const result = await databaseInvestmentService.approveStartupCoInvestment(offer.coInvestmentOpportunityId, 'reject');
      console.log('✅ Co-investment opportunity rejected:', result);
      
      await loadOffersReceived();
      
      messageService.success(
        'Co-Investment Rejected',
        'Co-investment opportunity rejected successfully.',
        3000
      );
    } catch (err) {
      console.error('Error rejecting co-investment opportunity:', err);
      messageService.error(
        'Rejection Failed',
        'Failed to reject co-investment opportunity. Please try again.'
      );
    }
  };

  const handleDeleteInvestmentOffer = async (offer: OfferReceived) => {
    if (!offer.investmentOfferId) return;
    
    // Add confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this investment offer? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      console.log('🗑️ Deleting investment offer:', offer.investmentOfferId);
      await databaseInvestmentService.deleteInvestmentOffer(offer.investmentOfferId);
      
      await loadOffersReceived();
      
      console.log('✅ Investment offer deleted successfully');
      messageService.success(
        'Offer Deleted',
        'Investment offer deleted successfully.',
        3000
      );
    } catch (err) {
      console.error('Error deleting investment offer:', err);
      console.error('Full error details:', err);
      
      // Use alert for better visibility of error messages
      alert(`Failed to delete investment offer: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Also show the message service notification
      messageService.error(
        'Deletion Failed',
        `Failed to delete investment offer: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // Filter offers based on selected filter
  const getFilteredOffers = () => {
    const base = offerFilter === 'all'
      ? offersReceived
      : offerFilter === 'investment'
        ? offersReceived.filter(offer => offer.type === 'Investment')
        : offersReceived.filter(offer => offer.type === 'Incubation' || offer.type === 'Due Diligence');

    // Sort by createdAt desc (most recent first)
    return [...base].sort((a: any, b: any) => {
      const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  };

  // Incubation offer action handlers
  const handleViewContracts = async (offer: OfferReceived) => {
    console.log('📄 Viewing contracts for offer:', offer.id);
    
    if (offer.applicationId) {
      // Refresh the offer data to ensure we have the latest contract/agreement URLs
      try {
        const { data: freshOfferData, error } = await supabase
          .from('opportunity_applications')
          .select('contract_url, agreement_url, status, updated_at')
          .eq('id', offer.applicationId)
          .single();
        
        if (!error && freshOfferData) {
          // Update the offer with fresh data
          const updatedOffer = {
            ...offer,
            contractUrl: freshOfferData.contract_url,
            agreementUrl: freshOfferData.agreement_url,
            status: freshOfferData.status as 'pending' | 'accepted' | 'rejected',
            createdAt: freshOfferData.updated_at || offer.createdAt
          };
          setSelectedOfferForContract(updatedOffer);
        } else {
          setSelectedOfferForContract(offer);
        }
      } catch (error) {
        console.warn('⚠️ Could not refresh offer data, using cached data:', error);
        setSelectedOfferForContract(offer);
      }
      
      setIsContractModalOpen(true);
    } else {
      messageService.warning(
        'Application Missing',
        'No application ID found for this offer.'
      );
    }
  };

  const openRecognitionModal = (offer: OfferReceived) => {
    setSelectedOfferForContract(offer);
    setRecognitionFormState({
      programName: offer.programName || '',
      facilitatorName: offer.facilitatorName || offer.from || '',
      facilitatorCode: offer.code || ''
    });
    // Reset calc fields
    setRecFeeType(FeeType.Free);
    setRecShares('');
    setRecPricePerShare('');
    setRecAmount('');
    setRecEquity('');
    setRecPostMoney('');
    // Load total shares for equity/post-money calculation
    capTableService.getTotalShares(startup.id).then((shares) => {
      setTotalSharesForCalc(shares || 0);
    }).catch(() => setTotalSharesForCalc(0));
    setIsRecognitionModalOpen(true);
  };

  // Handle viewing contact details for Stage 4 offers
  const handleViewContactDetails = (offer: OfferReceived) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Viewing Contact Details for offer:', {
        offer: offer,
        offerId: offer?.investmentOfferId,
        from: offer?.from,
        status: offer?.status,
        contactDetailsRevealed: offer?.contactDetailsRevealed
      });
    }
    
    // Get the original investment offer data
    const originalOffer = offers.find(o => o.id === offer.investmentOfferId);
    
    if (!originalOffer) {
      alert('Offer details not found. Please refresh the page and try again.');
      return;
    }
    
    // Set the selected offer and open the modal
    setSelectedOfferForContact(originalOffer);
    setIsInvestorContactModalOpen(true);
  };

  const handleSubmitRecognition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Reuse CapTable submit handler endpoint shape by calling recognitionService
      const form = new FormData(e.currentTarget);
      const programName = String(form.get('rec-program-name') || 'Incubation Program');
      const facilitatorName = String(form.get('rec-facilitator-name') || '');
      const facilitatorCode = String(form.get('rec-facilitator-code') || '');
      const incubationType = String(form.get('rec-incubation-type') || 'Incubation Center');
      const feeType = (form.get('rec-fee-type') as FeeType) || recFeeType;
      const feeAmount = Number(form.get('rec-fee-amount') || 0);
      const shares = Number(form.get('rec-shares') || recShares || 0);
      const pricePerShare = Number(form.get('rec-price-per-share') || recPricePerShare || 0);
      const investmentAmount = Number(form.get('rec-amount') || recAmount || 0);
      const equityAllocated = Number(form.get('rec-equity') || recEquity || 0);
      const postMoneyValuation = Number(form.get('rec-postmoney') || recPostMoney || 0);
      const agreementFile = recAgreementFile; // Use file from state instead of form

      console.log('📄 Agreement file from state:', agreementFile ? { name: agreementFile.name, size: agreementFile.size } : 'No file');

      // Minimal inline upsert via recognitionService
      const { recognitionService } = await import('../../lib/recognitionService');
      const { storageService } = await import('../../lib/storage');

      let agreementUrl: string | undefined = undefined;
      if (agreementFile) {
        const uploaded = await storageService.uploadStartupDocument(agreementFile, String(startup.id), 'recognition-agreement');
        if (uploaded?.success && uploaded.url) agreementUrl = uploaded.url;
      }

      await recognitionService.createRecognitionRecord({
        startupId: startup.id,
        programName,
        facilitatorName,
        facilitatorCode,
        incubationType: incubationType as IncubationType,
        feeType: (feeType as FeeType),
        feeAmount: feeType === 'Fees' || feeType === 'Hybrid' ? feeAmount : 0,
        shares: (feeType === 'Equity' || feeType === 'Hybrid') ? shares : 0,
        pricePerShare: (feeType === 'Equity' || feeType === 'Hybrid') ? pricePerShare : 0,
        investmentAmount: (feeType === 'Equity' || feeType === 'Hybrid') ? investmentAmount : 0,
        equityAllocated: (feeType === 'Equity' || feeType === 'Hybrid') ? equityAllocated : 0,
        postMoneyValuation: (feeType === 'Equity' || feeType === 'Hybrid') ? postMoneyValuation : 0,
        signedAgreementUrl: agreementUrl,
      } as any);

      // Persist the startup-uploaded agreement as contract_url on the related opportunity application
      if (agreementUrl && selectedOfferForContract?.applicationId) {
        try {
          const { error: updateError } = await supabase
            .from('opportunity_applications')
            .update({ contract_url: agreementUrl })
            .eq('id', selectedOfferForContract.applicationId);
          if (updateError) {
            console.warn('⚠️ Failed to update agreement_url on application:', updateError);
          } else {
            // Reflect immediately in UI
            setOffersReceived(prev => prev.map(o => o.id === selectedOfferForContract.id ? { ...o, contractUrl: agreementUrl } : o));
          }
        } catch (e) {
          console.warn('⚠️ Error while persisting agreement_url:', e);
        }
      }

      setIsRecognitionModalOpen(false);
      // Optionally refresh offers (not required for hiding button now)
      // await loadOffersReceived();
      messageService.success(
        'Agreement Uploaded',
        'Agreement uploaded and equity allocation recorded.',
        3000
      );
    } catch (err) {
      console.error('Failed to submit recognition entry:', err);
      messageService.error(
        'Submission Failed',
        'Failed to submit. Please try again.'
      );
    }
  };

  // Auto-calc like Cap Table: amount, equity, post-money
  useEffect(() => {
    const sharesNum = Number(recShares) || 0;
    const ppsNum = Number(recPricePerShare) || 0;
    const amount = sharesNum * ppsNum;
    setRecAmount(amount ? String(amount) : '');
    if (totalSharesForCalc > 0 && sharesNum > 0) {
      const equityPct = (sharesNum / totalSharesForCalc) * 100;
      setRecEquity(equityPct.toFixed(4));
      const postMoney = equityPct > 0 ? amount / (equityPct / 100) : 0;
      setRecPostMoney(postMoney ? String(postMoney) : '');
    } else {
      setRecEquity('');
      setRecPostMoney('');
    }
  }, [recShares, recPricePerShare, totalSharesForCalc]);

  const handleMessageFacilitationCenter = (offer: OfferReceived) => {
    console.log('💬 Messaging facilitation center for offer:', offer.id);
    setSelectedOfferForMessaging(offer);
    setIsMessagingModalOpen(true);
  };

  const handleCloseMessaging = () => {
    setIsMessagingModalOpen(false);
    setSelectedOfferForMessaging(null);
  };

  const handleCloseContract = () => {
    setIsContractModalOpen(false);
    setSelectedOfferForContract(null);
  };


  // Diligence document upload removed per requirements

  const handleRefreshContractData = async (applicationId: string) => {
    try {
      console.log('🔄 Refreshing contract data for application:', applicationId);
      
      // Fetch fresh data from database
      const { data: freshData, error } = await supabase
        .from('opportunity_applications')
        .select('contract_url, agreement_url, status, updated_at')
        .eq('id', applicationId)
        .single();
      
      if (!error && freshData && selectedOfferForContract) {
        // Update the selected offer with fresh data
        const updatedOffer = {
          ...selectedOfferForContract,
          contractUrl: freshData.contract_url,
          agreementUrl: freshData.agreement_url,
          status: freshData.status as 'pending' | 'accepted' | 'rejected',
          createdAt: freshData.updated_at || selectedOfferForContract.createdAt
        };
        setSelectedOfferForContract(updatedOffer);
        console.log('✅ Contract data refreshed:', updatedOffer);
      }
    } catch (error) {
      console.warn('⚠️ Could not refresh contract data:', error);
    }
  };

  const handleContractUpload = async (applicationId: string, file: File) => {
    let uploadedFilePath: string | null = null;
    
    try {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // CRITICAL: Get auth_user_id (UUID from auth.users) for storage tracking
      // Storage tracking uses auth_user_id, not profile ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id) {
        throw new Error('Unable to get authenticated user ID');
      }
      const authUserId = authUser.id;

      console.log('📄 Starting contract upload for application:', applicationId);
      console.log('📄 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      console.log('📄 Using auth_user_id for storage tracking:', authUserId);
      
      // Validate file
      if (!file) {
        throw new Error('No file selected');
      }
      
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
      }
      
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed');
      }
      
      // Create a unique filename with proper extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const fileName = `contract-${applicationId}-${timestamp}.${fileExt}`;
      const filePath = `contracts/${applicationId}/${fileName}`;
      
      console.log('📄 Uploading to path:', filePath);
      
      // Upload with storage tracking - use auth_user_id (UUID from auth.users)
      const { uploadFileWithTracking } = await import('../../lib/uploadWithStorageTracking');
      const uploadResult = await uploadFileWithTracking({
        bucket: 'startup-documents',
        path: filePath,
        file,
        cacheControl: '3600',
        upsert: false,
        userId: authUserId, // Use auth_user_id, not profile ID
        fileType: 'document',
        relatedEntityType: 'opportunity_application',
        relatedEntityId: applicationId
      });
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      uploadedFilePath = filePath;
      console.log('✅ File uploaded to storage with tracking:', uploadResult);
      
      // Use the URL from upload result
      const publicUrl = uploadResult.url;
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log('📄 Generated public URL:', publicUrl);
      
      // Verify the application exists before updating
      const { data: existingApp, error: fetchError } = await supabase
        .from('opportunity_applications')
        .select('id, contract_url')
        .eq('id', applicationId)
        .single();
      
      if (fetchError || !existingApp) {
        throw new Error(`Application not found: ${fetchError?.message || 'Unknown error'}`);
      }
      
      console.log('📄 Existing application found:', existingApp);
      
      // Update the application record with the new contract URL
      const { data: updateData, error: updateError } = await supabase
        .from('opportunity_applications')
        .update({ 
          contract_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select();
      
      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      console.log('✅ Database updated successfully:', updateData);
      
      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('opportunity_applications')
        .select('contract_url')
        .eq('id', applicationId)
        .single();
      
      if (verifyError || !verifyData) {
        console.warn('⚠️ Could not verify database update:', verifyError);
      } else {
        console.log('✅ Database update verified:', verifyData);
      }
      
      console.log('✅ Contract uploaded and saved successfully:', publicUrl);
      
      // Reload offers to reflect the change
      await loadOffersReceived();
      
      // Update the selected offer with the fresh data from the reloaded offers
      if (selectedOfferForContract) {
        // Find the updated offer in the reloaded offers
        const updatedOffers = getFilteredOffers();
        const updatedOffer = updatedOffers.find(offer => offer.applicationId === applicationId);
        if (updatedOffer) {
          setSelectedOfferForContract(updatedOffer);
          console.log('✅ Updated selected offer with fresh contract data:', updatedOffer);
        }
      }
      
      return { success: true, url: publicUrl };
      
    } catch (error) {
      console.error('❌ Contract upload failed:', error);
      
      // Rollback: Delete uploaded file if database update failed
      if (uploadedFilePath) {
        try {
          console.log('🔄 Rolling back: Deleting uploaded file:', uploadedFilePath);
          const { error: deleteError } = await supabase.storage
            .from('startup-documents')
            .remove([uploadedFilePath]);
          
          if (deleteError) {
            console.error('❌ Failed to delete uploaded file during rollback:', deleteError);
          } else {
            console.log('✅ Rollback successful: File deleted');
          }
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError);
        }
      }
      
      throw error;
    }
  };

  const handleAgreementUpload = async (applicationId: string, file: File) => {
    let uploadedFilePath: string | null = null;
    
    try {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      console.log('📄 Starting agreement upload for application:', applicationId);
      console.log('📄 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Validate file
      if (!file) {
        throw new Error('No file selected');
      }
      
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
      }
      
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed');
      }
      
      // Create a unique filename with proper extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const fileName = `agreement-${applicationId}-${timestamp}.${fileExt}`;
      const filePath = `agreements/${applicationId}/${fileName}`;
      
      console.log('📄 Uploading to path:', filePath);
      
      // CRITICAL: Get auth_user_id (UUID from auth.users) for storage tracking
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id) {
        throw new Error('Unable to get authenticated user ID');
      }
      const authUserId = authUser.id;
      console.log('📄 Using auth_user_id for storage tracking:', authUserId);

      // Upload with storage tracking - use auth_user_id (UUID from auth.users)
      const { uploadFileWithTracking } = await import('../../lib/uploadWithStorageTracking');
      const uploadResult = await uploadFileWithTracking({
        bucket: 'startup-documents',
        path: filePath,
        file,
        cacheControl: '3600',
        upsert: false,
        userId: authUserId, // Use auth_user_id, not profile ID
        fileType: 'document',
        relatedEntityType: 'opportunity_application',
        relatedEntityId: applicationId
      });
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      uploadedFilePath = filePath;
      console.log('✅ File uploaded to storage with tracking:', uploadResult);
      
      // Use the URL from upload result
      const publicUrl = uploadResult.url;
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log('📄 Generated public URL:', publicUrl);
      
      // Verify the application exists before updating
      const { data: existingApp, error: fetchError } = await supabase
        .from('opportunity_applications')
        .select('id, agreement_url')
        .eq('id', applicationId)
        .single();
      
      if (fetchError || !existingApp) {
        throw new Error(`Application not found: ${fetchError?.message || 'Unknown error'}`);
      }
      
      console.log('📄 Existing application found:', existingApp);
      
      // Update the application record with the new agreement URL
      const { data: updateData, error: updateError } = await supabase
        .from('opportunity_applications')
        .update({ 
          agreement_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select();
      
      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      console.log('✅ Database updated successfully:', updateData);
      
      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('opportunity_applications')
        .select('agreement_url')
        .eq('id', applicationId)
        .single();
      
      if (verifyError || !verifyData) {
        console.warn('⚠️ Could not verify database update:', verifyError);
      } else {
        console.log('✅ Database update verified:', verifyData);
      }
      
      console.log('✅ Agreement uploaded and saved successfully:', publicUrl);
      
      // Reload offers to reflect the change
      await loadOffersReceived();
      
      // Update the selected offer with the fresh data from the reloaded offers
      if (selectedOfferForContract) {
        // Find the updated offer in the reloaded offers
        const updatedOffers = getFilteredOffers();
        const updatedOffer = updatedOffers.find(offer => offer.applicationId === applicationId);
        if (updatedOffer) {
          setSelectedOfferForContract(updatedOffer);
          console.log('✅ Updated selected offer with fresh agreement data:', updatedOffer);
        }
      }
      
      return { success: true, url: publicUrl };
      
    } catch (error) {
      console.error('❌ Agreement upload failed:', error);
      
      // Rollback: Delete uploaded file if database update failed
      if (uploadedFilePath) {
        try {
          console.log('🔄 Rolling back: Deleting uploaded file:', uploadedFilePath);
          const { error: deleteError } = await supabase.storage
            .from('startup-documents')
            .remove([uploadedFilePath]);
          
          if (deleteError) {
            console.error('❌ Failed to delete uploaded file during rollback:', deleteError);
          } else {
            console.log('✅ Rollback successful: File deleted');
          }
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError);
        }
      }
      
      throw error;
    }
  };


  const MetricCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle?: string;
  }> = ({ title, value, icon, subtitle }) => (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className="text-blue-600 flex-shrink-0 ml-2">
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
        <MetricCard
          title="MRR"
          value={isLoading ? "Loading..." : formatCurrencyCompact(metrics?.mrr || 0, startupCurrency)}
          icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />}
          subtitle="Monthly Recurring Revenue"
        />
        <MetricCard
          title="Burn Rate"
          value={isLoading ? "Loading..." : formatCurrencyCompact(metrics?.burnRate || 0, startupCurrency)}
          icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
          subtitle="Monthly Expenses"
        />
        
        <MetricCard
          title="Gross Margin"
          value={isLoading ? "Loading..." : `${(metrics?.grossMargin || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
          subtitle="Revenue - COGS"
        />
        
        {/* Compliance Status Card */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Compliance Status</p>
              {(() => {
                const { totalTasks, completedTasks, percentage, submittedPercentage, verifiedPercentage } = complianceData;
                
                return (
                  <div className="space-y-2">
                    {/* Submitted Percentage */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Submitted</span>
                        <span className={`text-sm sm:text-base font-semibold ${
                          submittedPercentage >= 100 
                            ? 'text-green-600' 
                            : submittedPercentage >= 50 
                              ? 'text-blue-600' 
                              : 'text-yellow-600'
                        }`}>
                          {submittedPercentage}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Verified Percentage */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Verified</span>
                        <span className={`text-sm sm:text-base font-semibold ${
                          verifiedPercentage >= 100 
                            ? 'text-green-600' 
                            : verifiedPercentage >= 50 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                        }`}>
                          {verifiedPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className={`flex-shrink-0 ml-2 ${
              complianceData.verifiedPercentage >= 100 
                ? 'text-green-600' 
                : complianceData.verifiedPercentage >= 50 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
            }`}>
              {complianceData.verifiedPercentage >= 100 ? (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : complianceData.verifiedPercentage >= 50 ? (
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </div>
          </div>
        </Card>
      </div>


      {/* Enhanced Charts with Filters */}
      <div className="space-y-4 sm:space-y-6">
        {/* Filters and Controls */}
        <Card padding="md">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">Year:</label>
                <select
                  value={selectedYear === 'all' ? 'all' : selectedYear}
                  onChange={async (e) => {
                    const value = e.target.value;
                    const newYear = value === 'all' ? 'all' : parseInt(value);
                    console.log('📅 Dashboard: Year changed to:', newYear);
                    setSelectedYear(newYear);
                    // Immediately load data for the selected year
                    await loadFinancialDataForYear(newYear);
                  }}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year === 'all' ? 'all' : year}>
                      {year === 'all' ? 'All Years (Till Date)' : year}
                    </option>
                  ))}
                </select>
              </div>
              
              {viewMode === 'monthly' && selectedYear !== 'all' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (e.target.value && selectedYear !== 'all') {
                        loadDailyDataForMonth(selectedYear, e.target.value);
                      }
                    }}
                    className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Month</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'year' ? 'default' : 'outline'}
                onClick={() => {
                  setViewMode('year');
                  setSelectedMonth('');
                }}
                className="text-xs"
              >
                Year
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'monthly' ? 'default' : 'outline'}
                onClick={() => {
                  if (selectedYear === 'all') {
                    console.warn('⚠️ Dashboard: Monthly view not available for "All Years"');
                    return;
                  }
                  setViewMode('monthly');
                }}
                disabled={selectedYear === 'all'}
                className="text-xs"
              >
                Monthly
              </Button>
            </div>
          </div>
        </Card>

        {/* Charts - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Revenue vs Expenses Chart */}
          <Card padding="md">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-700">
              {viewMode === 'year' ? `Revenue vs Expenses (${selectedYear === 'all' ? 'All Years' : selectedYear})` : `Revenue vs Expenses (Monthly) - ${selectedMonth || 'Select Month'}`}
            </h3>
            <div className="w-full h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'year' ? (
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, startupCurrency)} />
                    <Legend wrapperStyle={{fontSize: "14px"}} />
                    <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
                    <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
                  </BarChart>
                ) : (
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, startupCurrency)} />
                    <Legend wrapperStyle={{fontSize: "14px"}} />
                    <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
                    <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Expense Categories */}
          <Card padding="md">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-700">Expense Categories</h3>
            <div className="w-full h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fundUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {fundUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, startupCurrency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Due Diligence Requests Panel */}
      <Card padding="md">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-700">Due Diligence Requests</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {/* Investor Due Diligence Requests */}
              {diligenceRequests.map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {r.investor?.name || 'Investor'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Investor
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : r.status === 'revoked'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveDiligenceRequest(r.id)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => rejectDiligenceRequest(r.id)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : r.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={() => revokeDiligenceAccess(r.id)}
                      >
                        <Lock className="h-4 w-4 mr-1" /> Stop Access
                      </Button>
                    ) : (
                      <span className="text-slate-400">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* Facilitator Due Diligence Requests */}
              {facilitatorDiligenceRequests.map((app: any) => {
                const facilitatorInfo = app.incubation_opportunities;
                const fromName = facilitatorInfo?.program_name || 'Facilitator';
                
                return (
                  <tr key={`facilitator_${app.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {fromName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Facilitator
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          app.diligence_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : app.diligence_status === 'requested'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {app.diligence_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {app.diligence_status === 'requested' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAcceptFacilitatorDiligence(app.id)}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectFacilitatorDiligence(app.id)}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : app.diligence_status === 'approved' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                          onClick={() => handleRevokeFacilitatorDiligence(app.id)}
                        >
                          <Lock className="h-4 w-4 mr-1" /> Revoke Access
                        </Button>
                      ) : (
                        <span className="text-slate-400">No actions</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {diligenceRequests.length === 0 && facilitatorDiligenceRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No due diligence requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      

      {/* Offers Received Section - Investment offers only */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-700">Investment Offers</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={offerFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setOfferFilter('all')}
              className="text-xs"
            >
              All Offers
            </Button>
            <Button
              size="sm"
              variant={offerFilter === 'investment' ? 'default' : 'outline'}
              onClick={() => setOfferFilter('investment')}
              className="text-xs"
            >
              Investment Offers
            </Button>
                      </div>
                    </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Offer Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {getFilteredOffers().map(offer => (
                  <tr key={offer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {offer.from}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {offer.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {offer.offerDetails}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        offer.status === 'accepted' 
                          ? 'bg-green-100 text-green-800' 
                          : offer.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : offer.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : offer.status === 'startup_advisor_approved'
                          ? 'bg-blue-100 text-blue-800'
                          : offer.status === 'withdrawn'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {offer.status === 'accepted' && '✓ Accepted'}
                        {offer.status === 'pending' && '⏳ Pending'}
                        {offer.status === 'rejected' && '✗ Rejected'}
                        {offer.status === 'startup_advisor_approved' && '👤 Advisor Approved'}
                        {offer.status === 'withdrawn' && '↩️ Withdrawn'}
                        {!offer.status && '❓ Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {offer.type === 'Incubation' && (
                        <div className="flex flex-col gap-2">
                          {/* Download Agreement - prefer startup-uploaded contract; fallback to facilitator agreement */}
                          {offer.status === 'accepted' && (offer.contractUrl || offer.agreementUrl) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadAgreement((offer.contractUrl || offer.agreementUrl)!)}
                              className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Download className="h-4 w-4" />
                              {offer.contractUrl ? 'Download Uploaded Agreement' : 'Download Agreement'}
                            </Button>
                          )}
                          
                          {/* Upload Agreement & Recognition (opens recognition/incubation form) */}
                          {offer.status === 'accepted' && !offer.contractUrl && (
                            <Button 
                              size="sm"
                              onClick={() => openRecognitionModal(offer)}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <FileText className="h-4 w-4" />
                              Upload Agreement
                            </Button>
                          )}
                          
                          {/* Message Facilitation Center */}
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleMessageFacilitationCenter(offer)}
                            className="flex items-center gap-1 text-slate-600 border-slate-300 hover:bg-slate-50"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message Facilitation Center
                          </Button>
                          
                          
                          {/* Status indicator for accepted applications (no startup upload yet) */}
                          {offer.status === 'accepted' && !offer.contractUrl && (
                            <span className="text-green-600 flex items-center gap-1 text-sm">
                              <Check className="h-4 w-4" />
                              Accepted
                            </span>
                          )}
                        </div>
                      )}
                      {offer.type === 'Due Diligence' && offer.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleAcceptDueDiligence(offer)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" /> Accept Due Diligence Request
                          </Button>
                        </div>
                      )}
                      {offer.type === 'Due Diligence' && offer.status === 'accepted' && (
                        <span className="text-green-600 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Access Granted
                        </span>
                      )}
                      {/* Remove diligence document actions */}
                      {/* Show accept/reject buttons for regular investment offers or co-investment opportunities at Stage 3 */}
                      {/* Also show buttons for co-investment offers that are pending startup approval */}
                      {offer.type === 'Investment' && 
                       (offer.status === 'pending' || offer.status === 'startup_advisor_approved') && 
                       ((!offer.isCoInvestmentOpportunity || (offer.isCoInvestmentOpportunity && offer.stage === 3)) || 
                        (offer.isCoInvestmentOffer && offer.status === 'pending')) && (
                        <div className="flex gap-2">
                          {/* View Details button for co-investment offers */}
                          {offer.isCoInvestmentOffer && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewCoInvestmentDetails(offer)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvestmentOffer(offer)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectInvestmentOffer(offer)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {offer.type === 'Investment' && offer.status === 'accepted' && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            Accepted
                          </span>
                          {/* View Details button for accepted co-investment offers */}
                          {offer.isCoInvestmentOffer && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewCoInvestmentDetails(offer)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          )}
                          {/* Only show View Contact Details for regular investment offers, not co-investment offers */}
                          {!offer.isCoInvestmentOffer && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewContactDetails(offer)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              View Contact Details
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvestmentOffer(offer)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                      {offer.type === 'Investment' && offer.status === 'rejected' && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 flex items-center gap-1">
                            <X className="h-4 w-4" />
                            Rejected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvestmentOffer(offer)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                        </td>
                      </tr>
                    ))}
                {getFilteredOffers().length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      {isViewOnly ? (
                        <div className="space-y-2">
                          <p className="text-sm">
                            {offerFilter === 'all' && "No investment offers received yet."}
                            {offerFilter === 'investment' && "No investment offers received yet."}
                          </p>
                          <p className="text-xs text-slate-400">
                            This startup hasn't received any investment offers yet.
                          </p>
                        </div>
                      ) : (
                        "No investment offers received yet."
                      )}
                    </td>
                  </tr>
                )}
                  </tbody>
                </table>
          </div>
        </Card>
      </div>

      {/* Incubation Programs Section - Dedicated section for all incubation-related items */}
      <div className="space-y-3 sm:space-y-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-slate-700">Incubation Programs</h3>
            {form2Requests.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {form2Requests.length} Form 2 Pending
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={incubationFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setIncubationFilter('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={incubationFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setIncubationFilter('pending')}
              className="text-xs"
            >
              Pending
            </Button>
            <Button
              size="sm"
              variant={incubationFilter === 'accepted' ? 'default' : 'outline'}
              onClick={() => setIncubationFilter('accepted')}
              className="text-xs"
            >
              Accepted
            </Button>
            {form2Requests.length > 0 && (
              <Button
                size="sm"
                variant={incubationFilter === 'form2_pending' ? 'default' : 'outline'}
                onClick={() => setIncubationFilter('form2_pending')}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
              >
                Form 2 Pending
              </Button>
            )}
          </div>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Facilitator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Form 2</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {incubationPrograms
                  .filter(prog => {
                    if (incubationFilter === 'all') return true;
                    if (incubationFilter === 'pending') return prog.status === 'pending';
                    if (incubationFilter === 'accepted') return prog.status === 'accepted';
                    if (incubationFilter === 'form2_pending') return prog.form2.requested && prog.form2.status === 'pending';
                    return true;
                  })
                  .map(prog => (
                  <tr key={prog.id} className={prog.form2.requested && prog.form2.status === 'pending' ? 'bg-amber-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {prog.programName}
                        {prog.isShortlisted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⭐ Shortlisted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {prog.facilitatorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        prog.status === 'accepted' 
                          ? 'bg-green-100 text-green-800' 
                          : prog.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {prog.status === 'accepted' && '✓ Accepted'}
                        {prog.status === 'pending' && '⏳ Pending'}
                        {prog.status === 'rejected' && '✗ Rejected'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!prog.form2.requested ? (
                        <span className="text-slate-400">Not Requested</span>
                      ) : prog.form2.status === 'pending' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          📝 Submission Required
                        </span>
                      ) : prog.form2.status === 'submitted' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          📤 Submitted
                        </span>
                      ) : prog.form2.status === 'under_review' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          🔍 Under Review
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-2">
                        {/* Form 2 - Fill Form button */}
                        {prog.form2.requested && prog.form2.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedForm2Data({
                                applicationId: prog.applicationId,
                                opportunityId: prog.opportunityId, // Fixed: use prog.opportunityId not prog.id
                                opportunityName: prog.programName,
                              });
                              setIsForm2ModalOpen(true);
                            }}
                            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <FileText className="h-4 w-4" />
                            Fill Form 2
                          </Button>
                        )}
                        
                        {/* Upload Agreement (for accepted programs) */}
                        {prog.status === 'accepted' && !prog.contractUrl && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              // Use existing recognition modal
                              setRecognitionFormState({
                                programName: prog.programName,
                                facilitatorName: prog.facilitatorName,
                                facilitatorCode: prog.facilitatorCode,
                                applicationId: prog.applicationId
                              });
                              setIsRecognitionModalOpen(true);
                            }}
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <FileText className="h-4 w-4" />
                            Upload Agreement
                          </Button>
                        )}
                        
                        {/* Download Agreement */}
                        {prog.status === 'accepted' && (prog.contractUrl || prog.agreementUrl) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadAgreement((prog.contractUrl || prog.agreementUrl)!)}
                            className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Download className="h-4 w-4" />
                            {prog.contractUrl ? 'Download Uploaded Agreement' : 'Download Agreement'}
                          </Button>
                        )}
                        
                        {/* Message Facilitation Center */}
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOfferForMessaging({
                              id: `incubation_${prog.id}`,
                              from: prog.facilitatorName,
                              type: 'Incubation',
                              offerDetails: prog.programName,
                              status: prog.status,
                              code: prog.facilitatorCode,
                              applicationId: prog.applicationId,
                              createdAt: prog.createdAt,
                              programName: prog.programName,
                              facilitatorName: prog.facilitatorName
                            });
                            setIsMessagingModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-slate-600 border-slate-300 hover:bg-slate-50"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message Facilitator
                        </Button>
                        
                        {/* Tracking Questions - Only for accepted programs */}
                        {prog.status === 'accepted' && prog.facilitatorId && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('📍 Button clicked - Tracking Questions with:', {
                                facilitatorId: prog.facilitatorId,
                                programName: prog.programName,
                                facilitatorName: prog.facilitatorName
                              });
                              handleOpenTrackingQuestions(
                                prog.facilitatorId,
                                prog.programName,
                                prog.facilitatorName
                              );
                            }}
                            className="flex items-center gap-1 text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            <FileText className="h-4 w-4" />
                            Tracking Questions
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {incubationPrograms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      {isViewOnly ? (
                        <div className="space-y-2">
                          <p className="text-sm">No incubation programs found.</p>
                          <p className="text-xs text-slate-400">
                            This startup hasn't applied to any incubation programs yet.
                          </p>
                        </div>
                      ) : (
                        "You haven't applied to any incubation programs yet."
                      )}
                    </td>
                  </tr>
                )}
                {incubationPrograms.length > 0 && 
                 incubationPrograms.filter(prog => {
                    if (incubationFilter === 'all') return true;
                    if (incubationFilter === 'pending') return prog.status === 'pending';
                    if (incubationFilter === 'accepted') return prog.status === 'accepted';
                    if (incubationFilter === 'form2_pending') return prog.form2.requested && prog.form2.status === 'pending';
                    return true;
                  }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No programs match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Messaging Modal */}
      {selectedOfferForMessaging && (
        <StartupMessagingModal
          isOpen={isMessagingModalOpen}
          onClose={handleCloseMessaging}
          applicationId={selectedOfferForMessaging.applicationId || ''}
          startupName={startup.name}
          facilitatorName={selectedOfferForMessaging.from}
        />
      )}

      {/* Contract Management Modal (same UI as notifications) */}
      {selectedOfferForContract && (
        <StartupContractModal
          isOpen={isContractModalOpen}
          onClose={handleCloseContract}
          applicationId={selectedOfferForContract.applicationId || ''}
          facilitatorName={selectedOfferForContract.facilitatorName || 'Program Facilitator'}
          startupName={startup.name}
        />
      )}

      {/* Investor Contact Details Modal */}
      {selectedOfferForContact && (
        <InvestorContactDetailsModal
          isOpen={isInvestorContactModalOpen}
          onClose={() => {
            setIsInvestorContactModalOpen(false);
            setSelectedOfferForContact(null);
          }}
          offer={{
            id: selectedOfferForContact.id,
            offerAmount: selectedOfferForContact.offerAmount,
            equityPercentage: selectedOfferForContact.equityPercentage,
            currency: (selectedOfferForContact as any).currency || 'USD',
            createdAt: selectedOfferForContact.createdAt,
            stage: (selectedOfferForContact as any).stage || 4,
            status: selectedOfferForContact.status,
            investorName: selectedOfferForContact.investorName,
            investorEmail: selectedOfferForContact.investorEmail,
            investorAdvisor: (selectedOfferForContact as any).investor_advisor || null
          }}
        />
      )}

      {/* Form 2 Submission Modal */}
      {selectedForm2Data && (
        <Form2SubmissionModal
          isOpen={isForm2ModalOpen}
          onClose={() => {
            setIsForm2ModalOpen(false);
            setSelectedForm2Data(null);
          }}
          applicationId={selectedForm2Data.applicationId}
          opportunityId={selectedForm2Data.opportunityId}
          opportunityName={selectedForm2Data.opportunityName}
          onSuccess={() => {
            // Reload incubation programs to refresh Form 2 status
            loadOffersReceived();
          }}
        />
      )}

      {/* Recognition / Incubation Entry Modal */}
      <Modal 
        isOpen={isRecognitionModalOpen}
        onClose={() => setIsRecognitionModalOpen(false)}
        title="Recognition/Incubation"
      >
        <form onSubmit={handleSubmitRecognition} className="space-y-4">
          {/* Entry Type selection removed: Only Recognition / Incubation flow is used here */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Program Name" name="rec-program-name" id="rec-program-name" required value={recognitionFormState.programName || ''} readOnly />
            <Input label="Facilitator Name" name="rec-facilitator-name" id="rec-facilitator-name" required value={recognitionFormState.facilitatorName || ''} readOnly />
            <Input label="Facilitator Code" name="rec-facilitator-code" id="rec-facilitator-code" placeholder="e.g., FAC-D4E5F6" required value={recognitionFormState.facilitatorCode || ''} readOnly />
            <Select label="Incubation Type" name="rec-incubation-type" id="rec-incubation-type" required defaultValue={'Incubation Center'}>
              {Object.values(IncubationType).map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Fee Type" name="rec-fee-type" id="rec-fee-type" value={recFeeType} onChange={e => setRecFeeType(e.target.value as FeeType)} required>
              {Object.values(FeeType).map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            {(recFeeType === FeeType.Fees || recFeeType === FeeType.Hybrid) && (
              <Input label="Fee Amount" name="rec-fee-amount" id="rec-fee-amount" type="number" required />
            )}
            {(recFeeType === FeeType.Equity || recFeeType === FeeType.Hybrid) && (
              <>
                <Input label="Number of Shares" name="rec-shares" id="rec-shares" type="number" required value={recShares} onChange={(e) => setRecShares(e.target.value)} />
                <Input label={'Price per Share (' + startupCurrency + ')'} name="rec-price-per-share" id="rec-price-per-share" type="number" step="0.01" required value={recPricePerShare} onChange={(e) => setRecPricePerShare(e.target.value)} />
                <Input label="Investment Amount (auto)" name="rec-amount" id="rec-amount" type="number" readOnly value={recAmount} />
                <Input label="Equity Allocated (%) (auto)" name="rec-equity" id="rec-equity" type="number" readOnly value={recEquity} />
                <Input label="Post-Money Valuation (auto)" name="rec-postmoney" id="rec-postmoney" type="number" readOnly value={recPostMoney} />
              </>
            )}
            <CloudDriveInput
              value=""
              onChange={(url) => {
                console.log('📎 Cloud drive URL received:', url);
              }}
              onFileSelect={(file) => {
                console.log('📎 File selected for recognition agreement:', file.name);
                setRecAgreementFile(file);
              }}
              placeholder="Paste your cloud drive link here..."
              label="Upload Signed Agreement"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              maxSize={10}
              documentType="signed agreement"
              showPrivacyMessage={false}
            />
            <input type="hidden" id="rec-agreement-url" name="rec-agreement-url" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRecognitionModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 text-white">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Co-Investment Offer Details Modal */}
      <Modal
        isOpen={isCoInvestmentDetailsModalOpen}
        onClose={() => setIsCoInvestmentDetailsModalOpen(false)}
        title="Co-Investment Offer Details"
        size="large"
      >
        {isLoadingDetails ? (
          <div className="py-8 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading details...</p>
          </div>
        ) : coInvestmentDetails ? (
          <div className="space-y-6">
            {/* Lead Investor Section */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Lead Investor Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">
                    {coInvestmentDetails.leadInvestor?.name || 
                     coInvestmentDetails.co_investment_opportunity?.listed_by_user?.name ||
                     coInvestmentDetails.leadInvestor?.company_name || 
                     coInvestmentDetails.co_investment_opportunity?.listed_by_user?.company_name || 
                     coInvestmentDetails.leadInvestorName ||
                     'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium">
                    {coInvestmentDetails.leadInvestor?.email || 
                     coInvestmentDetails.co_investment_opportunity?.listed_by_user?.email || 
                     coInvestmentDetails.leadInvestorEmail ||
                     'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Lead Investment Amount:</span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(coInvestmentDetails.leadInvestorInvested, coInvestmentDetails.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Lead Equity Percentage:</span>
                  <span className="font-semibold text-blue-700">
                    {coInvestmentDetails.leadInvestorEquity.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Co-Investment Summary */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Co-Investment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Investment Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency(coInvestmentDetails.totalInvestment, coInvestmentDetails.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Equity Percentage:</span>
                  <span className="font-semibold">
                    {coInvestmentDetails.totalEquityPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-slate-600">Remaining for Co-Investment:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(coInvestmentDetails.remainingForCoInvestment, coInvestmentDetails.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* New Investor Offer Section */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3">New Investment Offer</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Investor Name:</span>
                  <span className="font-medium">
                    {coInvestmentDetails.investor?.name || 
                     coInvestmentDetails.investor?.company_name || 
                     coInvestmentDetails.investor_name || 
                     'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Investor Email:</span>
                  <span className="font-medium">
                    {coInvestmentDetails.investor?.email || 
                     coInvestmentDetails.investor_email || 
                     'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-slate-600">Offer Amount:</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(coInvestmentDetails.newOfferAmount, coInvestmentDetails.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Equity Percentage:</span>
                  <span className="font-semibold text-green-700">
                    {coInvestmentDetails.newEquityPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Currency:</span>
                  <span className="font-medium">{coInvestmentDetails.currency}</span>
                </div>
              </div>
            </div>


            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCoInvestmentDetailsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            <p>No details available</p>
          </div>
        )}
      </Modal>

      {/* Tracking Questions Modal */}
      <Modal
        isOpen={isTrackingQuestionsModalOpen}
        onClose={() => {
          setIsTrackingQuestionsModalOpen(false);
          setSelectedProgramForTracking(null);
          setTrackingQuestions([]);
          setTrackingResponses(new Map());
        }}
        title={`Program Tracking Questions - ${selectedProgramForTracking?.programName || ''}`}
        size="large"
      >
        <div className="space-y-6">
          {/* Program Info Banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
            <p className="text-sm text-purple-800">
              <strong>{selectedProgramForTracking?.facilitatorName}</strong> has configured tracking questions for this program. 
              Please provide your responses below. These help the facilitator track your progress and provide better support.
            </p>
          </div>

          {isLoadingTrackingQuestions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-slate-500">Loading questions...</p>
            </div>
          ) : trackingQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-2">No tracking questions configured yet.</p>
              <p className="text-xs text-slate-400">
                The facilitator hasn't set up any tracking questions for this program.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {trackingQuestions.map((q, index) => {
                const question = q.question;
                if (!question) return null;

                const currentAnswer = trackingResponses.get(q.questionId) || '';

                return (
                  <div key={q.questionId} className="border-b pb-6 last:border-b-0">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {index + 1}. {question.questionText}
                      {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {/* Render input based on question type */}
                    {question.questionType === 'textarea' && (
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => {
                          const newMap = new Map(trackingResponses);
                          newMap.set(q.questionId, e.target.value);
                          setTrackingResponses(newMap);
                        }}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your answer..."
                        required={q.isRequired}
                      />
                    )}

                    {question.questionType === 'text' && (
                      <input
                        type="text"
                        value={currentAnswer}
                        onChange={(e) => {
                          const newMap = new Map(trackingResponses);
                          newMap.set(q.questionId, e.target.value);
                          setTrackingResponses(newMap);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your answer..."
                        required={q.isRequired}
                      />
                    )}

                    {question.questionType === 'number' && (
                      <input
                        type="number"
                        value={currentAnswer}
                        onChange={(e) => {
                          const newMap = new Map(trackingResponses);
                          newMap.set(q.questionId, e.target.value);
                          setTrackingResponses(newMap);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter number..."
                        required={q.isRequired}
                      />
                    )}

                    {question.questionType === 'date' && (
                      <input
                        type="date"
                        value={currentAnswer}
                        onChange={(e) => {
                          const newMap = new Map(trackingResponses);
                          newMap.set(q.questionId, e.target.value);
                          setTrackingResponses(newMap);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required={q.isRequired}
                      />
                    )}

                    {question.questionType === 'select' && question.options && (
                      <select
                        value={currentAnswer}
                        onChange={(e) => {
                          const newMap = new Map(trackingResponses);
                          newMap.set(q.questionId, e.target.value);
                          setTrackingResponses(newMap);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required={q.isRequired}
                      >
                        <option value="">Select an option...</option>
                        {question.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {question.questionType === 'multiselect' && question.options && (
                      <div className="space-y-2 border border-slate-300 rounded-md p-3">
                        {question.options.map((opt, i) => {
                          const selectedOptions = currentAnswer ? currentAnswer.split(',') : [];
                          const isChecked = selectedOptions.includes(opt);
                          
                          return (
                            <label key={i} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newSelected = [...selectedOptions];
                                  if (e.target.checked) {
                                    newSelected.push(opt);
                                  } else {
                                    newSelected = newSelected.filter(o => o !== opt);
                                  }
                                  const newMap = new Map(trackingResponses);
                                  newMap.set(q.questionId, newSelected.filter(o => o).join(','));
                                  setTrackingResponses(newMap);
                                }}
                                className="rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {question.category && (
                      <p className="text-xs text-slate-500 mt-2">
                        Category: {question.category}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          {trackingQuestions.length > 0 && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsTrackingQuestionsModalOpen(false);
                  setSelectedProgramForTracking(null);
                  setTrackingQuestions([]);
                  setTrackingResponses(new Map());
                }}
                disabled={isSavingTrackingResponses}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTrackingResponses}
                disabled={isSavingTrackingResponses}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSavingTrackingResponses ? 'Saving...' : 'Save Responses'}
              </Button>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}

export default StartupDashboardTab;
