import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Startup, InvestmentOffer } from '../../types';
import { DashboardMetricsService, DashboardMetrics } from '../../lib/dashboardMetricsService';
import { financialsService } from '../../lib/financialsService';
import { formatCurrency, formatCurrencyCompact } from '../../lib/utils';
import { useStartupCurrency } from '../../lib/hooks/useStartupCurrency';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ComplianceSubmissionButton from '../ComplianceSubmissionButton';
import { DollarSign, Zap, TrendingUp, Download, Check, X, FileText, MessageCircle, Calendar, ChevronDown, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { investmentService } from '../../lib/investmentService';
import StartupMessagingModal from './StartupMessagingModal';
import StartupContractModal from './StartupContractModal';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { capTableService } from '../../lib/capTableService';
import { IncubationType, FeeType } from '../../types';
import { messageService } from '../../lib/messageService';

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
  
  // Enhanced dashboard state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  // Offers Received states
  const [offersReceived, setOffersReceived] = useState<OfferReceived[]>([]);
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const [offerFilter, setOfferFilter] = useState<'all' | 'investment' | 'incubation'>('all');
  
  // Messaging modal states
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [selectedOfferForMessaging, setSelectedOfferForMessaging] = useState<OfferReceived | null>(null);
  
  // Contract viewing modal states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedOfferForContract, setSelectedOfferForContract] = useState<OfferReceived | null>(null);
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false);
  const [recognitionFormState, setRecognitionFormState] = useState<{[key:string]: any}>({});
  const [hiddenUploadOffers, setHiddenUploadOffers] = useState<Set<string>>(new Set());
  const [recFeeType, setRecFeeType] = useState<FeeType>(FeeType.Free);
  const [recShares, setRecShares] = useState<string>('');
  const [recPricePerShare, setRecPricePerShare] = useState<string>('');
  const [recAmount, setRecAmount] = useState<string>('');
  const [recEquity, setRecEquity] = useState<string>('');
  const [recPostMoney, setRecPostMoney] = useState<string>('');
  const [totalSharesForCalc, setTotalSharesForCalc] = useState<number>(0);


  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Load metrics
        const calculatedMetrics = await DashboardMetricsService.calculateMetrics(startup);
        setMetrics(calculatedMetrics);
        
        // Generate available years based on company registration date
        const registrationYear = new Date(startup.registrationDate).getFullYear();
        const currentYear = new Date().getFullYear();
        
        // Create array of years from registration year to current year
        const years = [];
        for (let year = currentYear; year >= registrationYear; year--) {
          years.push(year);
        }
        setAvailableYears(years);
        
        // Load data for selected year
        await loadFinancialDataForYear(selectedYear);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
    loadOffersReceived();
  }, [startup, selectedYear]);

  const loadFinancialDataForYear = async (year: number) => {
    try {
      const allRecords = await financialsService.getFinancialRecords(startup.id, { year });
      
      // Generate monthly revenue vs expenses data
      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize all months
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

  const loadDailyDataForMonth = async (year: number, month: string) => {
    try {
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
      if (finalDailyData.length === 0) {
        console.log(`No financial data found for ${month} ${year}`);
      }
      
    } catch (error) {
      console.error('Error loading daily data:', error);
      setDailyData([]);
    }
  };

  // Load offers received
  const loadOffersReceived = async () => {
    // console.log('🚀 loadOffersReceived function called!');
    if (!startup?.id) return;
    
    try {
      // console.log('🔍 Loading offers for startup ID:', startup.id);
      
      // Fetch investment offers for this startup
      const investmentOffers = await investmentService.getOffersForStartup(startup.id);
      console.log('💰 Investment offers fetched:', investmentOffers);
      console.log('💰 Investment offers count:', investmentOffers?.length || 0);
      
      // Fetch all opportunity applications for this startup with proper joins
      let allApplications = [];
      try {
        // First try the simple query to see what we get
        const { data: simpleData, error: simpleError } = await supabase
          .from('opportunity_applications')
          .select('*, diligence_status, diligence_urls, created_at')
          .eq('startup_id', startup.id);
        
        console.log('🔍 Simple query result:', simpleData);
        console.log('🔍 Simple query error:', simpleError);
        
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
            allApplications = allApplications.map(app => {
              const opportunity = opportunities.find(opp => opp.id === app.opportunity_id);
              return opportunity ? { ...app, incubation_opportunities: opportunity } : app;
            });
          }
        }
        
      } catch (err) {
        console.error('Failed to fetch opportunity applications:', err);
        allApplications = [];
      }
      
      // Note: incubation_applications table doesn't exist (404 error)
      // All applications are in opportunity_applications table
      
      // Debug: Log all applications to see what we're getting
      console.log('🔍 All applications fetched:', allApplications);
      console.log('🔍 Application count:', allApplications.length);
      
      // Log diligence_status for each application
      allApplications.forEach((app, index) => {
        console.log(`🔍 App ${index + 1} (${app.id}): diligence_status = "${app.diligence_status}"`);
      });
      
      // Log each application in detail
      allApplications.forEach((app, index) => {
        console.log(`🔍 Application ${index + 1}:`, {
          id: app.id,
          allKeys: Object.keys(app),
          type: app.type,
          opportunity_type: app.opportunity_type,
          program_type: app.program_type,
          application_type: app.application_type,
          status: app.status,
          organization_name: app.organization_name,
          facilitator_name: app.facilitator_name,
          startup_id: app.startup_id
        });
        
        // Log the actual field names to see what's available
        console.log(`🔍 Application ${index + 1} field names:`, Object.keys(app));
        console.log(`🔍 Application ${index + 1} field names (expanded):`, JSON.stringify(Object.keys(app), null, 2));
        
        // Log the full application object to see all data
        console.log(`🔍 Application ${index + 1} full data:`, app);
        console.log(`🔍 Application ${index + 1} full data (expanded):`, JSON.stringify(app, null, 2));
        
        // Log each field individually to see actual values
        console.log(`🔍 Application ${index + 1} individual fields:`);
        Object.keys(app).forEach(key => {
          console.log(`  ${key}:`, app[key]);
        });
      });
      
      // Note: We're only showing properly resolved offers with facilitator names
      
      // Since all applications appear to be incubation-related (they have agreement_url, pitch_deck_url, etc.)
      // and the database joins are failing, let's treat them all as incubation applications
      // and try to fetch facilitator names using a simpler approach
      
      console.log('🔍 Treating all applications as incubation applications since they have incubation-related fields');
      
      // Try to fetch facilitator names for each opportunity_id
      const opportunityIds = allApplications.map(app => app.opportunity_id).filter(Boolean);
      console.log('🔍 Opportunity IDs to fetch:', opportunityIds);
      
      let facilitatorData = {};
      if (opportunityIds.length > 0) {
        try {
          // Try a simple query to get facilitator data
          const { data: facilitators, error: facilitatorError } = await supabase
            .from('incubation_opportunities')
            .select('id, facilitator_id, facilitator_code, program_name')
            .in('id', opportunityIds);
          
          console.log('🔍 Facilitators query result:', facilitators);
          console.log('🔍 Facilitators query error:', facilitatorError);
          
          if (!facilitatorError && facilitators) {
            // Now try to get user names for each facilitator
            const facilitatorIds = facilitators.map(f => f.facilitator_id).filter(Boolean);
            console.log('🔍 Facilitator IDs to fetch:', facilitatorIds);
            
            if (facilitatorIds.length > 0) {
              const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, name, facilitator_code')
                .in('id', facilitatorIds);
              
              console.log('🔍 Users query result:', users);
              console.log('🔍 Users query error:', usersError);
              
              if (!usersError && users) {
                // Create a mapping of facilitator_id to user data
                const userMap = {};
                users.forEach(user => {
                  userMap[user.id] = user;
                });
                
                // Combine facilitator and user data
                facilitators.forEach(facilitator => {
                  const user = userMap[facilitator.facilitator_id];
                  facilitatorData[facilitator.id] = {
                    ...facilitator,
                    user: user
                  };
                });
                
                console.log('🔍 Combined facilitator data:', facilitatorData);
                console.log('🔍 Facilitator data keys:', Object.keys(facilitatorData));
                console.log('🔍 Facilitator data values:', Object.values(facilitatorData));
                
                // Debug each facilitator entry
                Object.entries(facilitatorData).forEach(([key, value]: [string, any]) => {
                  console.log(`🔍 Facilitator ${key}:`, {
                    id: value.id,
                    program_name: value.program_name,
                    facilitator_id: value.facilitator_id,
                    facilitator_code: value.facilitator_code,
                    user: value.user
                  });
                });
              }
            }
          }
        } catch (err) {
          console.error('Error fetching facilitator data:', err);
        }
      }
      
      // All applications are treated as incubation applications
      // Filter out withdrawn applications
      console.log('🔍 Before filtering - All applications:', allApplications.map(app => ({ id: app.id, status: app.status })));
      const incubationApplications = allApplications.filter(app => {
        const isNotWithdrawn = app.status !== 'withdrawn';
        console.log(`🔍 Filtering app ${app.id}: status=${app.status}, isNotWithdrawn=${isNotWithdrawn}`);
        return isNotWithdrawn;
      });
      // Identify applications with an active diligence workflow
      const diligenceApplications = allApplications.filter((app: any) => {
        const status = typeof app?.diligence_status === 'string' 
          ? app.diligence_status.toLowerCase() 
          : null;
        const include = status === 'requested' || status === 'approved';
        console.log(`🔍 Diligence filter app ${app.id}: diligence_status="${app.diligence_status}", status="${status}", include=${include}`);
        return include;
      });
      
      console.log('🔍 Diligence applications found:', diligenceApplications.length);
      console.log('🔍 Diligence applications:', diligenceApplications.map(app => ({ id: app.id, diligence_status: app.diligence_status })));
      
      // Additional debugging for diligence flow
      if (diligenceApplications.length > 0) {
        console.log('✅ DILIGENCE FLOW: Found diligence applications!');
        diligenceApplications.forEach((app, index) => {
          console.log(`✅ DILIGENCE FLOW: App ${index + 1}:`, {
            id: app.id,
            diligence_status: app.diligence_status,
            diligence_urls: app.diligence_urls,
            status: app.status
          });
        });
      } else {
        console.log('❌ DILIGENCE FLOW: No diligence applications found');
        console.log('❌ DILIGENCE FLOW: All applications:', allApplications.map(app => ({
          id: app.id,
          status: app.status,
          diligence_status: app.diligence_status
        })));
      }
      
      console.log('🔍 Incubation applications found:', incubationApplications.length);
      console.log('🔍 Diligence applications found:', diligenceApplications.length);
      console.log('🔍 After filtering - Incubation applications:', incubationApplications.map(app => ({ id: app.id, status: app.status })));
      
      // Transform incubation applications into OfferReceived format
      const incubationOffers: OfferReceived[] = incubationApplications.map((app: any) => {
        // Use the fetched facilitator data to get facilitator name
        const facilitatorInfo = facilitatorData[app.opportunity_id];
        console.log(`🔍 Processing app ${app.id} with opportunity_id ${app.opportunity_id}:`, facilitatorInfo);
        
        const fromName = facilitatorInfo?.user?.name || 
                        facilitatorInfo?.user?.facilitator_code ||
                        facilitatorInfo?.facilitator_code ||
                        facilitatorInfo?.program_name ||
                        `Application ${app.id.slice(0, 8)}`;
        
        console.log(`🔍 Resolved name for app ${app.id}:`, fromName);
        console.log(`🔍 Available facilitator info:`, {
          user_name: facilitatorInfo?.user?.name,
          user_facilitator_code: facilitatorInfo?.user?.facilitator_code,
          facilitator_code: facilitatorInfo?.facilitator_code,
          program_name: facilitatorInfo?.program_name
        });
        
        // Get program name from facilitator data
        const programName = facilitatorInfo?.program_name || 
                           'Incubation Program';
        
        return {
          id: `incubation_${app.id}`,
          from: fromName,
          type: 'Incubation' as const,
          offerDetails: app.status === 'accepted' ? 'Accepted into Program' : `Incubation program: ${programName}`,
          status: app.status as 'pending' | 'accepted' | 'rejected',
          code: facilitatorInfo?.facilitator_code || app.id.toString(),
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
        const fromName = facilitatorInfo?.user?.name || 
                        facilitatorInfo?.facilitator_code ||
                        facilitatorInfo?.program_name ||
                        'Unknown Organization';
        
        return {
          id: `diligence_${app.id}`,
          from: fromName,
          type: 'Due Diligence' as const,
          offerDetails: app.diligence_status === 'requested' ? 'Due diligence access requested' : 'Due diligence access granted',
          status: app.diligence_status === 'approved' ? 'accepted' : (app.diligence_status === 'requested' ? 'pending' : 'rejected'),
          code: facilitatorInfo?.facilitator_code || app.id.toString(),
          agreementUrl: app.agreement_url,
          applicationId: app.id,
          createdAt: app.created_at,
          diligenceUrls: app.diligence_urls || []
        };
      });
      
      // Transform investment offers into OfferReceived format
      const investmentOffersFormatted: OfferReceived[] = (investmentOffers || []).map((offer: any) => {
        // Get investor name from the joined investor data
        const investorName = offer.investor?.name || 
                           offer.investor?.company_name || 
                           offer.investorName || 
                           offer.investorEmail || 
                           'Unknown Investor';
        
        // Ensure we have valid numbers for amount and equity
        const amount = Number(offer.offerAmount || offer.amount) || 0;
        const equityPercentage = Number(offer.equityPercentage || offer.equity_percentage) || 0;
        
        return {
          id: `investment_${offer.id}`,
          from: investorName,
          type: 'Investment' as const,
          offerDetails: `${formatCurrency(amount, startupCurrency)} for ${equityPercentage}% equity`,
          status: offer.status as 'pending' | 'accepted' | 'rejected',
          code: offer.id.toString(),
          createdAt: offer.createdAt,
          isInvestmentOffer: true,
          investmentOfferId: offer.id,
          startupScoutingFee: Number(offer.startup_scouting_fee_paid || offer.startup_scouting_fee) || 0,
          investorScoutingFee: Number(offer.investor_scouting_fee_paid || offer.investor_scouting_fee) || 0,
          contactDetailsRevealed: offer.contact_details_revealed || false
        };
      });
      
      // Combine all offers - only include properly resolved offers
      const allOffers = [...incubationOffers, ...diligenceOffers, ...investmentOffersFormatted];
      console.log('🎯 Combined offers array:', allOffers);
      console.log('🎯 Incubation offers:', incubationOffers);
      console.log('🎯 Diligence offers:', diligenceOffers);
      console.log('🎯 Investment offers:', investmentOffersFormatted);
      console.log('🎯 Total offers count:', allOffers.length);
      
      // If no offers found, show a debug message
      if (allOffers.length === 0) {
        console.log('⚠️ No offers found for startup:', startup.id);
        console.log('⚠️ Investment offers from service:', investmentOffers);
        console.log('⚠️ All applications from database:', allApplications);
      }
      
      setOffersReceived(allOffers);
      
    } catch (err) {
      console.error('Error loading offers received:', err);
      setOffersReceived([]);
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
      // Reload offers; backend trigger will grant dashboard access
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

  const handleDownloadAgreement = async (agreementUrl: string) => {
    try {
      console.log('📥 Downloading agreement from:', agreementUrl);
      
      const link = document.createElement('a');
      link.href = agreementUrl;
      link.download = `facilitation-agreement-${Date.now()}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Agreement download initiated');
    } catch (err) {
      console.error('Error downloading agreement:', err);
      messageService.error(
        'Download Failed',
        'Failed to download agreement. Please try again.'
      );
    }
  };

  const handleAcceptInvestmentOffer = async (offer: OfferReceived) => {
    if (!offer.investmentOfferId) return;
    
    try {
      console.log('💰 Accepting investment offer:', offer.investmentOfferId);
      
        await investmentService.acceptOfferSimple(String(offer.investmentOfferId));
      console.log('✅ Investment offer accepted');
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

  const handleRejectInvestmentOffer = async (offer: OfferReceived) => {
    if (!offer.investmentOfferId) return;
    
    try {
      console.log('💰 Rejecting investment offer:', offer.investmentOfferId);
      await investmentService.rejectOffer(String(offer.investmentOfferId));
      
      await loadOffersReceived();
      
      console.log('✅ Investment offer rejected successfully');
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
      const agreementFile = (e.currentTarget.elements.namedItem('rec-agreement') as HTMLInputElement)?.files?.[0] || null;

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
      console.log('📄 Starting contract upload for application:', applicationId);
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
      const fileName = `contract-${applicationId}-${timestamp}.${fileExt}`;
      const filePath = `contracts/${applicationId}/${fileName}`;
      
      console.log('📄 Uploading to path:', filePath);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('startup-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });
      
      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      uploadedFilePath = filePath;
      console.log('✅ File uploaded to storage:', uploadData);
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('startup-documents')
        .getPublicUrl(filePath);
      
      console.log('📄 Generated public URL:', urlData.publicUrl);
      
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
          contract_url: urlData.publicUrl,
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
      
      console.log('✅ Contract uploaded and saved successfully:', urlData.publicUrl);
      
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
      
      return { success: true, url: urlData.publicUrl };
      
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
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('startup-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });
      
      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      uploadedFilePath = filePath;
      console.log('✅ File uploaded to storage:', uploadData);
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('startup-documents')
        .getPublicUrl(filePath);
      
      console.log('📄 Generated public URL:', urlData.publicUrl);
      
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
          agreement_url: urlData.publicUrl,
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
      
      console.log('✅ Agreement uploaded and saved successfully:', urlData.publicUrl);
      
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
      
      return { success: true, url: urlData.publicUrl };
      
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
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                startup.complianceStatus === 'Compliant' 
                  ? 'text-green-600' 
                  : startup.complianceStatus === 'Pending' 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                {startup.complianceStatus === 'Compliant' 
                  ? 'Compliant' 
                  : startup.complianceStatus === 'Pending' 
                    ? 'Pending' 
                    : 'Not Compliant'}
              </p>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {startup.complianceStatus === 'Compliant' 
                  ? 'All requirements met' 
                  : startup.complianceStatus === 'Pending' 
                    ? 'Under review' 
                    : 'Action required'}
              </p>
            </div>
            <div className={`flex-shrink-0 ml-2 ${
              startup.complianceStatus === 'Compliant' 
                ? 'text-green-600' 
                : startup.complianceStatus === 'Pending' 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
            }`}>
              {startup.complianceStatus === 'Compliant' ? (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : startup.complianceStatus === 'Pending' ? (
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
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {viewMode === 'daily' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (e.target.value) {
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
                variant={viewMode === 'monthly' ? 'default' : 'outline'}
                onClick={() => {
                  setViewMode('monthly');
                  setSelectedMonth('');
                }}
                className="text-xs"
              >
                Monthly View
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'daily' ? 'default' : 'outline'}
                onClick={() => setViewMode('daily')}
                className="text-xs"
              >
                Daily View
              </Button>
            </div>
          </div>
        </Card>

        {/* Charts - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Revenue vs Expenses Chart */}
          <Card padding="md">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-700">
              {viewMode === 'monthly' ? 'Revenue vs Expenses (Monthly)' : `Revenue vs Expenses (Daily) - ${selectedMonth || 'Select Month'}`}
            </h3>
            <div className="w-full h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'monthly' ? (
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

      {/* Offers Received Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-700">Offers Received</h3>
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
            <Button
              size="sm"
              variant={offerFilter === 'incubation' ? 'default' : 'outline'}
              onClick={() => setOfferFilter('incubation')}
              className="text-xs"
            >
              Incubation Offers
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
                      {offer.type === 'Investment' && (offer.status === 'pending' || offer.status === 'startup_advisor_approved') && (
                        <div className="flex gap-2">
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
                        <span className="text-green-600 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Accepted
                          </span>
                      )}
                      {offer.type === 'Investment' && offer.status === 'rejected' && (
                        <span className="text-red-600 flex items-center gap-1">
                          <X className="h-4 w-4" />
                          Rejected
                              </span>
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
                            {offerFilter === 'all' && "No offers or programs received yet."}
                            {offerFilter === 'investment' && "No investment offers received yet."}
                            {offerFilter === 'incubation' && "No incubation offers received yet."}
                          </p>
                          <p className="text-xs text-slate-400">
                            {offerFilter === 'all' && "This startup hasn't applied to any incubation programs or received investment offers."}
                            {offerFilter === 'investment' && "This startup hasn't received any investment offers yet."}
                            {offerFilter === 'incubation' && "This startup hasn't applied to any incubation programs yet."}
                          </p>
                        </div>
                      ) : (
                        offerFilter === 'all' ? "No offers received yet." :
                        offerFilter === 'investment' ? "No investment offers received yet." :
                        "No incubation offers received yet."
                      )}
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
            <Input label="Upload Signed Agreement" name="rec-agreement" id="rec-agreement" type="file" required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRecognitionModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 text-white">Save</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default StartupDashboardTab;
